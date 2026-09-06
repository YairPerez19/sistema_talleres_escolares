import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ZodError } from 'zod';
import { AdeudosService } from './adeudos.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard, CurrentUser } from '../common/roles.guard';
import type { AuthUser } from '../common/roles.guard';
import { FilterAdeudosSchema } from './dto/filter-adeudos.dto';
import { LiquidarAdeudoSchema } from './dto/liquidar-adeudo.dto';
import { UUID_LIKE } from '../common/validators';

@ApiTags('adeudos')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('adeudos')
export class AdeudosController {
  constructor(private readonly service: AdeudosService) {}

  @Get('me')
  @Roles('student')
  @ApiOperation({
    summary:
      'Consultar adeudo y desglose de asistencias del alumno autenticado',
  })
  @ApiResponse({ status: 200, description: 'Desglose del adeudo del alumno' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Rol no autorizado' })
  async getMyDebt(@CurrentUser() user: AuthUser) {
    return this.service.getDebtForStudent(user.id, false);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary:
      'Listar alumnos con resumen de adeudos, búsqueda y filtros (solo admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de adeudos de alumnos',
  })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  async findAll(@Query() query: Record<string, unknown>) {
    return this.parse(
      () => FilterAdeudosSchema.parse(query),
      (dto) => this.service.findAll(dto),
    );
  }

  @Get('alumno/:alumnoId')
  @Roles('admin', 'instructor')
  @ApiOperation({
    summary: 'Consultar desglose de adeudo de un alumno específico',
  })
  @ApiResponse({ status: 200, description: 'Desglose del adeudo del alumno' })
  @ApiResponse({ status: 400, description: 'ID de alumno inválido' })
  @ApiResponse({ status: 403, description: 'Rol no autorizado' })
  @ApiResponse({ status: 404, description: 'Alumno no encontrado' })
  async getDebtByAlumnoId(@Param('alumnoId') alumnoId: string) {
    this.validateUuid(alumnoId);
    return this.service.getDebtForStudent(alumnoId, true);
  }

  @Post(':alumnoId/liquidar')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liquidar o abonar al adeudo de un alumno (solo admin)',
  })
  @ApiResponse({ status: 200, description: 'Adeudo liquidado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o ID inválido' })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  @ApiResponse({ status: 404, description: 'Alumno no encontrado' })
  async liquidarAdeudo(
    @Param('alumnoId') alumnoId: string,
    @Body() body: unknown,
  ) {
    this.validateUuid(alumnoId);
    return this.parse(
      () => LiquidarAdeudoSchema.parse(body),
      (dto) => this.service.liquidar(alumnoId, dto),
    );
  }

  private validateUuid(id: string): void {
    if (!UUID_LIKE.test(id)) {
      throw new BadRequestException(
        'El ID del alumno debe ser un UUID válido.',
      );
    }
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
