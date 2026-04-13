import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuditService } from 'src/audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.auditService.log({
        userEmail: dto.email,
        actionType: 'login_failed',
        entity: 'session',
        status: 'error',
        description: `Неудачная попытка входа для ${dto.email}`,
        completedAt: new Date(),
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = this.generateTokens(user.id, user.email, roles);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
        userAgent: typeof userAgent === 'string' ? userAgent : undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditService.log({
      userEmail: user.email,
      actionType: 'login',
      entity: 'session',
      status: 'success',
      description: `Пользователь ${user.email} вошёл в систему`,
      completedAt: new Date(),
    });

    return tokens;
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: {
        user: { include: { userRoles: { include: { role: true } } } },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!session.user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const roles = session.user.userRoles.map((ur) => ur.role.name);
    const tokens = this.generateTokens(
      session.user.id,
      session.user.email,
      roles,
    );

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await this.prisma.session.create({
      data: {
        userId: session.user.id,
        refreshToken: tokens.refreshToken,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.session.updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private generateTokens(userId: string, email: string, roles: string[]) {
    const payload: JwtPayload = { sub: userId, email, roles };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    } as Parameters<typeof this.jwtService.sign>[1]);

    const refreshToken = crypto.randomBytes(64).toString('hex');

    return { accessToken, refreshToken };
  }
}
