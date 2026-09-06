import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerBehindProxyGuard } from './common/throttler-behind-proxy.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { TalleresModule } from './talleres/talleres.module';
import { AiModule } from './ai/ai.module';
import { AlumnosModule } from './alumnos/alumnos.module';
import { InstructoresModule } from './instructores/instructores.module';
import { AdminModule } from './admin/admin.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { AsistenciasModule } from './asistencias/asistencias.module';
import { AdeudosModule } from './adeudos/adeudos.module';
import { ReportesModule } from './reportes/reportes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 30,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,
      },
    ]),
    AuthModule,
    EmailModule,
    TalleresModule,
    AiModule,
    AlumnosModule,
    InstructoresModule,
    AdminModule,
    InscripcionesModule,
    AsistenciasModule,
    AdeudosModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
