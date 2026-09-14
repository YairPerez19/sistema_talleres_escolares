import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AsistenciasModule } from './asistencias/asistencias.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { ProfilesModule } from './profiles/profiles.module';
import { TalleresModule } from './talleres/talleres.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    AuthModule,
    EmailModule,
    TalleresModule,
    AsistenciasModule,
    ProfilesModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
