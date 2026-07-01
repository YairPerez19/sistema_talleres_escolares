import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifyIdentitySchema, VerifyIdentityDto } from './dto/verify-identity.dto';
import { VerifyOtpSchema, VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpSchema, ResendOtpDto } from './dto/resend-otp.dto';
import { RegisterStudentSchema, RegisterStudentDto } from './dto/register-student.dto';
import { ZodError } from 'zod';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register-student')
  @HttpCode(HttpStatus.CREATED)
  async registerStudent(@Body() body: unknown) {
    try {
      const dto = RegisterStudentSchema.parse(body) as RegisterStudentDto;
      return await this.authService.registerStudent(dto);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException('Datos de registro inválidos.');
      }
      throw err;
    }
  }

  @Post('verify-identity')
  @HttpCode(HttpStatus.OK)
  async verifyIdentity(@Body() body: unknown) {
    try {
      const dto = VerifyIdentitySchema.parse(body) as VerifyIdentityDto;
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
  async sendOtp(@Body() body: unknown) {
    try {
      const dto = ResendOtpSchema.parse(body) as ResendOtpDto;
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
  async verifyOtp(@Body() body: unknown) {
    try {
      const dto = VerifyOtpSchema.parse(body) as VerifyOtpDto;
      return await this.authService.verifyOtp(dto.pending_token, dto.code);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException('Código inválido.');
      }
      throw err;
    }
  }
}
