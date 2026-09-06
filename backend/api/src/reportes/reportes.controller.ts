import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { ReportesService } from './reportes.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  ReportesDashboardQuerySchema,
  ReportesAsistenciaQuerySchema,
  ReportesTalleresQuerySchema,
} from './dto/reportes-query.dto';

@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('dashboard')
  @Roles('admin')
  @ApiOperation({
    summary: 'Obtener métricas consolidadas del dashboard de administración',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas consolidadas del sistema (AdminStats)',
  })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  async getDashboardStats(@Query() query: Record<string, unknown>) {
    return this.parse(
      () => ReportesDashboardQuerySchema.parse(query),
      (dto) => this.service.getDashboardStats(dto),
    );
  }

  @Get('asistencia')
  @Roles('admin', 'instructor')
  @ApiOperation({
    summary: 'Generar reporte de asistencias en formato JSON o CSV',
  })
  @ApiResponse({
    status: 200,
    description: 'Dataset de asistencias o contenido CSV',
  })
  @ApiResponse({ status: 403, description: 'Rol no autorizado' })
  async getAsistenciasReport(
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.parse(
      () => ReportesAsistenciaQuerySchema.parse(query),
      async (dto) => {
        const result = await this.service.getAsistenciasReport(dto);
        if (dto.formato === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader(
            'Content-Disposition',
            'attachment; filename="reporte_asistencia.csv"',
          );
          return result.csv;
        }
        return result.data;
      },
    );
  }

  @Get('talleres')
  @Roles('admin')
  @ApiOperation({
    summary: 'Obtener resumen estadístico por taller (estadisticas_talleres)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de estadísticas consolidadas por taller',
  })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  async getTalleresStats(@Query() query: Record<string, unknown>) {
    return this.parse(
      () => ReportesTalleresQuerySchema.parse(query),
      (dto) => this.service.getTalleresStats(dto),
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
          .map((i) => `${i.path.join('.') || 'query'}: ${i.message}`)
          .join('; ');
        throw new BadRequestException(issues);
      }
      throw err;
    }
  }
}
