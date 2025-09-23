import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) { }

  create(email: string, password: string, name: string) {
    const user = this.repo.create({ email, password, name });

    return this.repo.save(user);
  }

  findOne(id: number) {
    if (!id) {
      return null;
    }
    // return this.repo.findOne(id);
    return this.repo.findOneBy({ id });
  }

  find(email: string) {
    // return this.repo.find({ email });
    return this.repo.findBy({ email });
  }

  async update(id: number, attrs: Partial<User>) {
    // const user = await this.findOne(id);
    const user = await this.repo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('user not found');
    }
    Object.assign(user, attrs);
    return this.repo.save(user);
  }

  async remove(id: number) {
    // const user = await this.findOne(id);
    const user = await this.repo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return this.repo.remove(user);
  }

  //incrementTokenVersion 는 강제 로그아웃, 전체 로그아웃에서만 사용
  // 만약 일반 로그아웃에서 사용할 경우 다른 기기에 저장된 토큰 버전이 전부 오래된 버전이 되어버림
  async incrementTokenVersion(userId: number) {
    // const user = await this.repo.findOne({ where: { id: userId } });
    const user = await this.repo.findOneBy({ id: userId });
    if (!user) return;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.repo.save(user);
  }

  async upsertOAuthUser(params: {
    provider: 'kakao';
    providerId: string;
    email?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  }) {
    const { provider, providerId, email, name, avatarUrl } = params;
    let user = await this.repo.findOne({ where: { provider, providerId } });
    if (!user) {
      user = this.repo.create({
        email: email ?? null,
        password: '!',
        provider,
        providerId,
        name: name ?? null,

      });
    }
    return this.repo.save(user);
  }
}
