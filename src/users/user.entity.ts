import {
  AfterInsert,
  AfterRemove,
  AfterUpdate,
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { Report } from '../reports/report.entity';



@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true }) // OAuth 사용자 대비
  email: string | null;

  @Column()
  password: string;

  @Column({ default: true })
  admin: boolean;

  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ nullable: true })
  provider: string | null; // kakao, google, etc.

  @Column({ nullable: true })
  providerId: string | null;

  @Column({ nullable: true })
  name: string | null;

  @Column({ nullable: true })
  avatarUrl: string | null;

  @OneToMany(() => Report, (report) => report.user)
  reports: Report[];

  @AfterInsert()
  logInsert() {
    console.log('Inserted User with id', this.id);
  }

  @AfterUpdate()
  logUpdate() {
    console.log('Updated User with id', this.id);
  }

  @AfterRemove()
  logRemove() {
    console.log('Removed User with id', this.id);
  }
}
