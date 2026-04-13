import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Delete,
} from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { CreateScriptDto } from './dto/create-script.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RunScriptDto } from './dto/run-scripts.dto';
import { AddToDirectoryDto } from './dto/add-to-directory.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
}

@Controller('admin/scripts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Get()
  findAll(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.scriptsService.findAll(limit, offset);
  }
  @Post('directory')
  addToDirectory(
    @Body() dto: AddToDirectoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scriptsService.addToDirectory({
      ...dto,
      userEmail: user?.email,
    });
  }

  @Get('directory')
  getDirectory() {
    return this.scriptsService.getDirectory();
  }

  @Delete('directory')
  removeFromDirectory(
    @Query('table') nameOfTable: string,
    @Query('func') nameOfDefQ: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scriptsService.removeFromDirectory(
      nameOfTable,
      nameOfDefQ,
      user?.email,
    );
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.scriptsService.search(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scriptsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateScriptDto) {
    return this.scriptsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateScriptDto>,
  ) {
    return this.scriptsService.update(id, dto);
  }

  @Post('run')
  runScript(@Body() dto: RunScriptDto, @CurrentUser() user: AuthUser) {
    return this.scriptsService.runScript({
      ...dto,
      userId: user?.id,
      userEmail: user?.email,
    });
  }
}
