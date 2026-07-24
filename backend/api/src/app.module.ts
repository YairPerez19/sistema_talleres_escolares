import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { TalleresModule } from './talleres/talleres.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    EmailModule,
    TalleresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
