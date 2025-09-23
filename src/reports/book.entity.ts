import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Book {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    publisher: string;

    @Column()
    year: number;

    @Column()
    author: string;

    @Column()
    edition: number;

    @ManyToOne(() => User, (user) => user.reports)
    user: User;
}
