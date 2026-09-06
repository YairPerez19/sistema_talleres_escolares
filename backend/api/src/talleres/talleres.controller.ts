import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ZodError } from 'zod';
import { TalleresService } from './talleres.service';
import { CreateTallerSchema } from './dto/create-taller.dto';
import { UpdateTallerSchema } from './dto/update-taller.dto';
import { FilterTallerSchema } from './dto/filter-taller.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard, CurrentUser } from '../common/roles.guard';
import type { AuthUser } from '../common/roles.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('talleres')
@ApiBearerAuth()
@Controller('talleres')
export class TalleresController {
  constructor(private readonly service: TalleresService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Listar talleres con filtros opcionales' })
  @ApiResponse({
    status: 200,
    description: 'Lista de talleres con cupo calculado',
  })
  async findAll(@Query() query: Record<string, string>) {
    return this.parse(
      () => FilterTallerSchema.parse(query),
      (dto) => this.service.findAll(dto),
    );
  }

  @Get('public')
  @ApiOperation({
    summary: 'Catálogo público de talleres (sin autenticación requerida)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de talleres con cupo calculado para catálogo público',
  })
  async findPublic(@Query() query: Record<string, string>) {
    return this.parse(
      () => FilterTallerSchema.parse(query),
      (dto) => this.service.findAll(dto),
    );
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Obtener un taller por id' })
  @ApiResponse({ status: 200, description: 'Taller encontrado' })
  @ApiResponse({ status: 404, description: 'Taller no encontrado' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/alumnos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  @ApiOperation({
    summary:
      'Listar alumnos inscritos en un taller (admin o instructor asignado)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de alumnos inscritos en el taller',
  })
  @ApiResponse({ status: 403, description: 'Sin permisos sobre este taller' })
  @ApiResponse({ status: 404, description: 'Taller no encontrado' })
  async getAlumnosInscritos(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getAlumnosInscritos(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un taller (solo admin)' })
  @ApiResponse({ status: 201, description: 'Taller creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  async create(@Body() body: unknown) {
    return this.parse(
      () => CreateTallerSchema.parse(body),
      (dto) => this.service.create(dto),
    );
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar un taller (solo admin)' })
  @ApiResponse({ status: 200, description: 'Taller actualizado' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o cupo < inscritos',
  })
  @ApiResponse({ status: 404, description: 'Taller no encontrado' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return this.parse(
      () => UpdateTallerSchema.parse(body),
      (dto) => this.service.update(id, dto),
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un taller (solo admin)' })
  @ApiResponse({ status: 200, description: 'Taller eliminado' })
  @ApiResponse({ status: 404, description: 'Taller no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'El taller tiene inscritos activos',
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }

  private async parse<TIn, TOut>(
    validate: () => TIn,
    run: (dto: TIn) => Promise<TOut>,
  ): Promise<TOut> {
    try {
      const dto = validate();
      return await run(dto);
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues
          .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
          .join('; ');
        throw new BadRequestException(issues);
      }
      throw err;
    }
  }
}
