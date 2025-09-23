import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  manufacturer: string; // 제조사

  @Column()
  model: string; // 모델명

  @Column()
  screenSize: number; // 화면 크기 (inch 단위 등)

  @Column()
  price: number; // 가격

  @ManyToOne(() => User, (user) => user.reports)
  user: User;
}
