import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Repository } from 'typeorm';

describe('UsersService', () => {
  let service: UsersService;
  let repo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository, // 가짜 Repository 주입
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should create a user with email + password', async () => {
    const mockUser = { id: 1, email: 'test@test.com', password: 'hashed' } as User;
    jest.spyOn(repo, 'create').mockReturnValue(mockUser);
    jest.spyOn(repo, 'save').mockResolvedValue(mockUser);

    const result = await service.create('test@test.com', 'hashed', '홍길동');

    expect(result.email).toBe('test@test.com');
    expect(result.password).toBe('hashed');
    expect(repo.save).toHaveBeenCalled();
  });
});
