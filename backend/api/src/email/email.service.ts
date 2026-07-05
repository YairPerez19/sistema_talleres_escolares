import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.from = this.configService.get<string>('SMTP_FROM') || '"SITE CBTis 61" <noreply@cbtis61.edu.mx>';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email configurado: ${user} via ${host}:${port}`);
    } else {
      this.logger.warn('SMTP no configurado. Los correos no se enviaran realmente.');
    }
  }

  async sendOtpEmail(to: string, otpCode: string, nombre: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('[MOCK EMAIL] SMTP no configurado.');
      this.logger.log(`[MOCK EMAIL] Para: ${to} | Codigo: ${otpCode}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'Tu codigo de verificacion - SITE CBTis 61',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0F0A0D; color: #fff; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #c13b5c;">SITE</h1>
              <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 4px;">CBTis No. 61</p>
            </div>
            <p style="font-size: 15px; margin-bottom: 20px;">Hola <strong>${nombre}</strong>,</p>
            <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 24px;">Usa el siguiente codigo para verificar tu cuenta:</p>
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #c13b5c; background: rgba(193,59,92,0.1); padding: 16px 24px; border-radius: 12px; display: inline-block;">
                ${otpCode}
              </span>
            </div>
            <p style="font-size: 12px; color: rgba(255,255,255,0.4);">Este codigo expira en 10 minutos. Si no solicitaste este codigo, ignora este correo.</p>
          </div>
        `,
      });

      this.logger.log(`Correo enviado a ${to} | Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error('Error enviando correo via SMTP:', error);
      this.logger.log(`[FALLBACK] Para: ${to} | Codigo: ${otpCode}`);
    }
  }
}
