import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../../src/auth/auth.service';
import { EmailService } from '../../src/email/email.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

type MockSupabaseClient = {
  auth: {
    signInWithPassword: jest.Mock;
    admin: {
      createUser: jest.Mock;
      deleteUser: jest.Mock;
      updateUserById: jest.Mock;
    };
  };
  from: jest.Mock;
  schema: jest.Mock;
  select: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
};

let mockSupabaseClient: MockSupabaseClient;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockAuth = {
      signInWithPassword: jest.fn(),
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        updateUserById: jest.fn(),
      },
    };

    const chainable = {
      from: jest.fn().mockReturnThis(),
      schema: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    mockSupabaseClient = { ...chainable, auth: mockAuth };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'SUPABASE_URL':
                  return 'https://test.supabase.co';
                case 'SUPABASE_SERVICE_ROLE_KEY':
                  return 'service-role-key';
                case 'SUPABASE_ANON_KEY':
                  return 'anon-key';
                case 'JWT_SECRET':
                  return 'jwt-secret';
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendOtpEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('verifyIdentity', () => {
    const dto = {
      role: 'student' as const,
      email: 'test@example.com',
      password: 'password123',
      matricula: '12345',
    };

    it('throws UnauthorizedException when credentials are invalid', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login' },
      });

      await expect(service.verifyIdentity(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when role does not match', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-1' },
          session: { access_token: 'at', refresh_token: 'rt' },
        },
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      await expect(service.verifyIdentity(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('sendOtp', () => {
    beforeEach(() => {
      mockedJwt.verify.mockReturnValue({
        user_id: 'user-1',
        email: 'test@example.com',
        role: 'student',
      });

      mockSupabaseClient.order.mockReturnThis();
      mockSupabaseClient.limit.mockReturnThis();

      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      mockedBcrypt.hash.mockResolvedValue('hashed-otp');
    });

    it('throws UnauthorizedException when token is invalid', async () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.sendOtp('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns cooldown when OTP was recently sent', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: { created_at: new Date().toISOString() },
        error: null,
      });

      const result = await service.sendOtp('valid-token');
      expect(result.sent).toBe(false);
      expect(result.cooldown_until).toBeDefined();
    });
  });

  describe('verifyOtp', () => {
    beforeEach(() => {
      mockedJwt.verify.mockReturnValue({
        user_id: 'user-1',
        email: 'test@example.com',
        role: 'student',
      });
    });

    it('throws UnauthorizedException when token is expired', async () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('expired');
      });

      await expect(
        service.verifyOtp('expired-token', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException when no active code exists', async () => {
      mockSupabaseClient.order.mockReturnThis();
      mockSupabaseClient.limit.mockReturnThis();

      mockSupabaseClient.select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await expect(service.verifyOtp('valid-token', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
