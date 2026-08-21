import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ZodError } from 'zod';
import { AiService } from './ai.service';
import {
  GenerateDescriptionSchema,
  type GenerateDescriptionDto,
} from './dto/generate-description.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('generate-description')
  @ApiOperation({ summary: 'Generar descripción para un taller' })
  @ApiResponse({ status: 200, description: 'Descripción generada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async generateDescription(@Body() body: unknown) {
    let dto: GenerateDescriptionDto;
    try {
      dto = GenerateDescriptionSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        const detail = err.issues
          .map((i) => `${i.path.join('.') || 'campo'}: ${i.message}`)
          .join('; ');
        throw new BadRequestException(`Datos inválidos. ${detail}`);
      }
      throw err;
    }

    const description = await this.aiService.generateWorkshopDescription(
      dto.nombre,
      dto.categoria,
    );
    return { description };
  }
}
