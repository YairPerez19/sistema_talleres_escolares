import { z } from 'zod';
import { uuidLike } from '../../common/validators';

export const ReportesDashboardQuerySchema = z.object({
  dias: z.coerce.number().int().min(1).max(90).default(7),
});

export type ReportesDashboardQueryDto = z.infer<
  typeof ReportesDashboardQuerySchema
>;

export const ReportesAsistenciaQuerySchema = z.object({
  fecha_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha_inicio debe tener formato YYYY-MM-DD')
    .optional(),
  fecha_fin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha_fin debe tener formato YYYY-MM-DD')
    .optional(),
  taller_id: uuidLike('taller_id debe ser un UUID válido').optional(),
  formato: z.enum(['json', 'csv']).default('json'),
});

export type ReportesAsistenciaQueryDto = z.infer<
  typeof ReportesAsistenciaQuerySchema
>;

export const ReportesTalleresQuerySchema = z.object({
  categoria: z.string().trim().optional(),
});

export type ReportesTalleresQueryDto = z.infer<
  typeof ReportesTalleresQuerySchema
>;
