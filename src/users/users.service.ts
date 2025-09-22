import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  create(email: string, password: string) {
    const user = this.repo.create({ email, password });

    return this.repo.save(user);
  }

  findOne(id: number) {
    if (!id) {
      return null;
    }
    return this.repo.findOne(id);
  }

  find(email: string) {
    return this.repo.find({ email });
  }

  async update(id: number, attrs: Partial<User>) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    Object.assign(user, attrs);
    return this.repo.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return this.repo.remove(user);
  }

  async incrementTokenVersion(userId: number) {
    const user = await this.repo.findOne({ where: { id: userId } });
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
        // name, avatarUrl 컬럼이 있으면 할당
      });
    }
    return this.repo.save(user);
  }
}
