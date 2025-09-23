import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { TokenService } from '../common/token/token.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let tokenService: TokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 1, email: 'a@a.com', tokenVersion: 0 }),
          },
        },
        {
          provide: TokenService,
          useValue: {
            generateAccessToken: jest.fn().mockResolvedValue('access'),
            generateRefreshToken: jest.fn().mockResolvedValue('refresh'),
          },
        },
        {
          provide: ConfigService,   // ✅ 추가
          useValue: {
            get: jest.fn().mockReturnValue('dummy'), // 필요에 맞게 반환값 설정
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    tokenService = module.get<TokenService>(TokenService);
  });

  it('should signup a user and return tokens', async () => {
    const result = await service.signup('a@a.com', 'pw', '홍길동');

    expect(result.user.email).toBe('a@a.com');
    expect(result.accessToken).toBe('access');
    expect(result.refreshToken).toBe('refresh');
    expect(usersService.create).toHaveBeenCalled();
    expect(tokenService.generateAccessToken).toHaveBeenCalled();
  });
});
