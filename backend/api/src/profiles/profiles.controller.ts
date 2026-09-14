import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { ProfilesService } from './profiles.service';
import { UpdateProfileSchema } from './dto/update-profile.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CurrentUser } from '../common/roles.guard';
import type { AuthUser } from '../common/roles.guard';

@Controller('profiles')
@UseGuards(RolesGuard)
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    return this.service.getProfile(user.id);
  }

  @Put('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.parse(
      () => UpdateProfileSchema.parse(body),
      (dto) => this.service.updateProfile(user.id, dto),
    );
  }

  @Get('settings')
  async getSettings() {
    return this.service.getSettings();
  }

  @Put('settings/:key')
  @Roles('admin')
  async updateSetting(
    @Param('key') key: string,
    @Body() body: { value: string },
  ) {
    if (!body?.value) {
      throw new BadRequestException('Campo value requerido.');
    }
    return this.service.updateSetting(key, body.value);
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
