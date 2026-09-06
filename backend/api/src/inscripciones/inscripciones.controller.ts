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
import { InscripcionesService } from './inscripciones.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard, CurrentUser } from '../common/roles.guard';
import type { AuthUser } from '../common/roles.guard';
import { CreateInscripcionSchema } from './dto/create-inscripcion.dto';
import { BajaInscripcionSchema } from './dto/baja-inscripcion.dto';
import { FilterInscripcionSchema } from './dto/filter-inscripcion.dto';

@ApiTags('inscripciones')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('inscripciones')
export class InscripcionesController {
  constructor(private readonly service: InscripcionesService) {}

  @Post()
  @Roles('student', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inscribir a un alumno en un taller con validaciones de negocio',
  })
  @ApiResponse({ status: 201, description: 'Inscripción exitosa' })
  @ApiResponse({
    status: 400,
    description: 'Adeudo pendiente, periodo vencido o cambios agotados',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya inscrito, cupo agotado o empalme de horario',
  })
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.parse(
      () => CreateInscripcionSchema.parse(body),
      (dto) => this.service.create(user, dto),
    );
  }

  @Post('baja')
  @Roles('student', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Dar de baja a un alumno de un taller y decrementar cambios restantes',
  })
  @ApiResponse({ status: 200, description: 'Baja exitosa' })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async baja(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.parse(
      () => BajaInscripcionSchema.parse(body),
      (dto) => this.service.baja(user, dto),
    );
  }

  @Get('mis-talleres')
  @Roles('student')
  @ApiOperation({
    summary: 'Obtener talleres inscritos del alumno autenticado',
  })
  @ApiResponse({ status: 200, description: 'Lista de talleres inscritos' })
  async getMisTalleres(@CurrentUser() user: AuthUser) {
    return this.service.getMisTalleres(user.id);
  }

  @Get('taller/:tallerId')
  @Roles('admin', 'instructor')
  @ApiOperation({
    summary: 'Obtener lista de alumnos inscritos en un taller específico',
  })
  @ApiResponse({ status: 200, description: 'Roster de alumnos inscritos' })
  @ApiResponse({
    status: 403,
    description: 'Instructor no asignado a este taller',
  })
  @ApiResponse({ status: 404, description: 'Taller no encontrado' })
  async getRosterByTaller(
    @CurrentUser() user: AuthUser,
    @Param('tallerId', new ParseUUIDPipe()) tallerId: string,
  ) {
    return this.service.getRosterByTaller(user, tallerId);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Listar inscripciones con filtros y paginación (solo admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de inscripciones',
  })
  async findAllAdmin(@Query() query: Record<string, string>) {
    return this.parse(
      () => FilterInscripcionSchema.parse(query),
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
