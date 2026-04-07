import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Roles ───────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Full access to admin panel',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Access to user panel only',
    },
  });

  console.log('Roles created:', { adminRole, userRole });

  // ─── Admin user ───────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@kpi.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'change_me_admin_password';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Admin',
      lastName: 'KPI',
      isActive: true,
      userRoles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
  });

  console.log('Admin user created:', admin.email);
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
