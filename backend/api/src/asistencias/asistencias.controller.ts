import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
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
import { AsistenciasService } from './asistencias.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard, CurrentUser } from '../common/roles.guard';
import type { AuthUser } from '../common/roles.guard';
import { RecordAsistenciaSchema } from './dto/record-asistencia.dto';
import { BulkAsistenciaSchema } from './dto/bulk-asistencia.dto';
import { FilterAsistenciaSchema } from './dto/filter-asistencia.dto';

@ApiTags('asistencias')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('asistencias')
export class AsistenciasController {
  constructor(private readonly service: AsistenciasService) {}

  @Post()
  @Roles('instructor', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar o editar asistencia de un alumno en un taller',
  })
  @ApiResponse({ status: 200, description: 'Asistencia registrada con éxito' })
  @ApiResponse({
    status: 400,
    description: 'Alumno no inscrito o datos inválidos',
  })
  @ApiResponse({
    status: 403,
    description:
      'Instructor no asignado o intento de registrar fecha distinta a hoy',
  })
  @ApiResponse({ status: 404, description: 'Taller no encontrado' })
  async recordAsistencia(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.parse(
      () => RecordAsistenciaSchema.parse(body),
      (dto) => this.service.recordAsistencia(user, dto),
    );
  }

  @Post('bulk')
  @Roles('instructor', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Registrar asistencia masiva para alumnos inscritos (ej. todos presente)',
  })
  @ApiResponse({
    status: 200,
    description: 'Asistencia masiva registrada exitosamente',
  })
  @ApiResponse({
    status: 403,
    description:
      'Instructor no asignado o intento de registrar fecha distinta a hoy',
  })
  @ApiResponse({ status: 404, description: 'Taller no encontrado' })
  async recordBulk(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.parse(
      () => BulkAsistenciaSchema.parse(body),
      (dto) => this.service.recordBulkAsistencia(user, dto),
    );
  }

  @Get('mis-asistencias')
  @Roles('student')
  @ApiOperation({
    summary: 'Consultar historial de asistencias del alumno autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de asistencias del estudiante',
  })
  async getMisAsistencias(@CurrentUser() user: AuthUser) {
    return this.service.getMisAsistencias(user.id);
  }

  @Get('taller/:tallerId')
  @Roles('admin', 'instructor')
  @ApiOperation({
    summary:
      'Obtener lista de alumnos inscritos con su estado de asistencia para una fecha',
  })
  @ApiResponse({
    status: 200,
    description: 'Roster del taller con estatus de asistencia',
  })
  @ApiResponse({
    status: 403,
    description: 'Instructor no asignado a este taller',
  })
  @ApiResponse({ status: 404, description: 'Taller no encontrado' })
  async getRosterByTaller(
    @CurrentUser() user: AuthUser,
    @Param('tallerId', new ParseUUIDPipe()) tallerId: string,
    @Query('fecha') fecha?: string,
  ) {
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException(
        'El parámetro fecha debe tener formato YYYY-MM-DD',
      );
    }
    return this.service.getRosterByTaller(user, tallerId, fecha);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Monitoreo y bitácora de asistencias con filtros (solo admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Bitácora paginada de asistencias',
  })
  async findAllAdmin(@Query() query: Record<string, string>) {
    return this.parse(
      () => FilterAsistenciaSchema.parse(query),
      (dto) => this.service.findAllAdmin(dto),
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
