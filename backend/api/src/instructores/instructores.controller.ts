import {
  Controller,
  Get,
  Put,
  Delete,
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
import { InstructoresService } from './instructores.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard, CurrentUser } from '../common/roles.guard';
import type { AuthUser } from '../common/roles.guard';
import { FilterInstructorSchema } from './dto/filter-instructor.dto';
import { UpdateInstructorSchema } from './dto/update-instructor.dto';

@ApiTags('instructores')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('instructores')
export class InstructoresController {
  constructor(private readonly service: InstructoresService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Listar instructores con datos de perfil y talleres asignados',
  })
  @ApiResponse({ status: 200, description: 'Lista de instructores' })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  async findAll(@Query() query: Record<string, string>) {
    return this.parse(
      () => FilterInstructorSchema.parse(query),
      (dto) => this.service.findAll(dto),
    );
  }

  @Get('me/talleres')
  @Roles('instructor')
  @ApiOperation({
    summary:
      'Listar talleres asignados al instructor autenticado con alumnos inscritos y horarios',
  })
  @ApiResponse({ status: 200, description: 'Talleres del instructor' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin rol de instructor' })
  async getMyTalleres(@CurrentUser() user: AuthUser) {
    return this.service.getMyTalleres(user.id);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener detalle de un instructor por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del instructor' })
  @ApiResponse({ status: 404, description: 'Instructor no encontrado' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({
    summary:
      'Actualizar especialidad, teléfono, estado activo y asignación de taller',
  })
  @ApiResponse({
    status: 200,
    description: 'Instructor actualizado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Instructor no encontrado' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return this.parse(
      () => UpdateInstructorSchema.parse(body),
      (dto) => this.service.update(id, dto),
    );
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Desactivar instructor y desasignar de talleres',
  })
  @ApiResponse({ status: 200, description: 'Instructor desactivado' })
  @ApiResponse({ status: 404, description: 'Instructor no encontrado' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
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
