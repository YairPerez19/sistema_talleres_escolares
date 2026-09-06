import { Injectable, HttpException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getThrottlerName(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest<{ url?: string }>();
    if (request.url?.startsWith('/api/auth')) {
      return 'auth';
    }
    return 'default';
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    return (req.ip as string) ?? 'anonymous';
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async throwThrottlingException(): Promise<void> {
    throw new HttpException(
      'Demasiadas solicitudes. Inténtalo más tarde.',
      429,
    );
  }
}
