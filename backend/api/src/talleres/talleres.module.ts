import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TalleresController } from './talleres.controller';
import { TalleresService } from './talleres.service';

@Module({
  imports: [ConfigModule],
  controllers: [TalleresController],
  providers: [TalleresService],
  exports: [TalleresService],
})
export class TalleresModule {}
