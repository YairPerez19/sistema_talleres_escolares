import { Module } from '@nestjs/common';
import { AdeudosController } from './adeudos.controller';
import { AdeudosService } from './adeudos.service';

@Module({
  controllers: [AdeudosController],
  providers: [AdeudosService],
  exports: [AdeudosService],
})
export class AdeudosModule {}
