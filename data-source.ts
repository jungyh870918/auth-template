import { DataSource } from 'typeorm';
import { User } from './src/users/user.entity';
import { Report } from './src/reports/report.entity';

export const AppDataSource = new DataSource({
    type: 'sqlite',
    database: 'db.sqlite',
    entities: [User, Report],
    migrations: ['migrations/*.ts'],
    synchronize: false,
});
