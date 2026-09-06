import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
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
import { AlumnosService } from './alumnos.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard, CurrentUser } from '../common/roles.guard';
import type { AuthUser } from '../common/roles.guard';
import { FilterAlumnoSchema } from './dto/filter-alumno.dto';
import { UpdateAlumnoSchema } from './dto/update-alumno.dto';

@ApiTags('alumnos')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('alumnos')
export class AlumnosController {
  constructor(private readonly service: AlumnosService) {}

  @Get('me')
  @Roles('student')
  @ApiOperation({
    summary: 'Obtener perfil del alumno autenticado, adeudos y talleres',
  })
  @ApiResponse({ status: 200, description: 'Perfil y estado del alumno' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Rol no autorizado' })
  @ApiResponse({ status: 404, description: 'Alumno no encontrado' })
  async getProfileMe(@CurrentUser() user: AuthUser) {
    return this.service.getProfileMe(user.id);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Listar alumnos con búsqueda, filtro de turno y paginación',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de alumnos' })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  async findAll(@Query() query: Record<string, string>) {
    return this.parse(
      () => FilterAlumnoSchema.parse(query),
      (dto) => this.service.findAll(dto),
    );
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener detalle completo de un alumno por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del alumno' })
  @ApiResponse({ status: 404, description: 'Alumno no encontrado' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar perfil de un alumno (solo admin)' })
  @ApiResponse({ status: 200, description: 'Alumno actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Alumno no encontrado' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return this.parse(
      () => UpdateAlumnoSchema.parse(body),
      (dto) => this.service.update(id, dto),
    );
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
