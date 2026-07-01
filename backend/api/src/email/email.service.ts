import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendOtpEmail(to: string, otpCode: string, nombre: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Resend no configurado. OTP no enviado realmente.');
      this.logger.log(`[MOCK EMAIL] Para: ${to} | Código: ${otpCode}`);
      return;
    }

    try {
      const response = await this.resend.emails.send({
        from: 'SITE CBTis 61 <onboarding@resend.dev>',
        to,
        subject: 'Tu código de verificación SITE',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0F0A0D; color: #fff; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #c13b5c;">SITE</h1>
              <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 4px;">CBTis No. 61</p>
            </div>
            <p style="font-size: 15px; margin-bottom: 20px;">Hola <strong>${nombre}</strong>,</p>
            <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 24px;">Usa el siguiente código para verificar tu identidad:</p>
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #c13b5c; background: rgba(193,59,92,0.1); padding: 16px 24px; border-radius: 12px; display: inline-block;">
                ${otpCode}
              </span>
            </div>
            <p style="font-size: 12px; color: rgba(255,255,255,0.4);">Este código expira en 10 minutos. Si no solicitaste este código, ignora este correo.</p>
          </div>
        `,
      });
      
      if (response.error) {
        this.logger.error('Resend API Error:', response.error);
        this.logger.log(`[MOCK EMAIL] Para: ${to} | Código: ${otpCode}`);
      } else {
        this.logger.log(`Resend envió correctamente el correo a ${to} con ID: ${response.data?.id}`);
      }
    } catch (error) {
      this.logger.error('Error enviando OTP via Resend', error);
      this.logger.log(`[MOCK EMAIL] Para: ${to} | Código: ${otpCode}`);
    }
  }
}
