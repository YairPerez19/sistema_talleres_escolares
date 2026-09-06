import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ZodError } from 'zod';
import { AdminService } from './admin.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard, CurrentUser } from '../common/roles.guard';
import type { AuthUser } from '../common/roles.guard';
import { AssignAdminSchema } from './dto/assign-admin.dto';

@ApiTags('administradores')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('administradores')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar usuarios administradores' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios con rol de administrador',
  })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  async listAdmins() {
    return this.service.listAdmins();
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Asignar rol de administrador a un usuario' })
  @ApiResponse({
    status: 201,
    description: 'Rol de administrador asignado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'El usuario ya es administrador' })
  async assignAdmin(@Body() body: unknown) {
    return this.parse(
      () => AssignAdminSchema.parse(body),
      (dto) => this.service.assignAdmin(dto),
    );
  }

  @Delete(':userId')
  @Roles('admin')
  @ApiOperation({
    summary:
      'Revocar rol de administrador a un usuario (no permite autorevocación)',
  })
  @ApiResponse({
    status: 200,
    description: 'Rol de administrador revocado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede autorevocar el rol de administrador',
  })
  @ApiResponse({
    status: 404,
    description: 'El usuario no tiene rol de administrador',
  })
  async revokeAdmin(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.revokeAdmin(userId, user.id);
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
