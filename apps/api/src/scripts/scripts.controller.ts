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
} from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { CreateScriptDto } from './dto/create-script.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

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
}
