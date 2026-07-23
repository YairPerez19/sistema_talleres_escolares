import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  VerifyIdentitySchema,
  VerifyIdentityDto,
} from './dto/verify-identity.dto';
import { VerifyOtpSchema, VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpSchema, ResendOtpDto } from './dto/resend-otp.dto';
import {
  RegisterStudentSchema,
  RegisterStudentDto,
} from './dto/register-student.dto';
import {
  RegisterInstructorSchema,
  RegisterInstructorDto,
} from './dto/register-instructor.dto';
import { ZodError } from 'zod';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register-student')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo estudiante' })
  @ApiResponse({
    status: 201,
    description: 'Estudiante registrado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o correo ya registrado',
  })
  async registerStudent(@Body() body: unknown) {
    try {
      const dto = RegisterStudentSchema.parse(body);
      return await this.authService.registerStudent(dto);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException('Datos de registro inválidos.');
      }
      throw err;
    }
  }

  @Post('register-instructor')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear cuenta de instructor (solo administrador)',
  })
  @ApiResponse({
    status: 201,
    description: 'Instructor creado y asignado al taller',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 409,
    description: 'El taller ya tiene un instructor asignado',
  })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  async registerInstructor(@Body() body: unknown) {
    try {
      const dto = RegisterInstructorSchema.parse(body);
      return await this.authService.registerInstructor(dto);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException('Datos de registro inválidos.');
      }
      throw err;
    }
  }

  @Post('verify-identity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar identidad del usuario' })
  @ApiResponse({ status: 200, description: 'Identidad verificada' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async verifyIdentity(@Body() body: unknown) {
    try {
      const dto = VerifyIdentitySchema.parse(body);
      return await this.authService.verifyIdentity(dto);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException('Datos inválidos.');
      }
      throw err;
    }
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar código OTP por correo' })
  @ApiResponse({ status: 200, description: 'OTP enviado o en cooldown' })
  async sendOtp(@Body() body: unknown) {
    try {
      const dto = ResendOtpSchema.parse(body);
      return await this.authService.sendOtp(dto.pending_token);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException('Token inválido.');
      }
      throw err;
    }
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código OTP' })
  @ApiResponse({ status: 200, description: 'OTP verificado, sesión iniciada' })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado' })
  async verifyOtp(@Body() body: unknown) {
    try {
      const dto = VerifyOtpSchema.parse(body);
      return await this.authService.verifyOtp(dto.pending_token, dto.code);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException('Código inválido.');
      }
      throw err;
    }
  }
}
