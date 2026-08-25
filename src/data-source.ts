import { DataSource } from 'typeorm';

import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'better-sqlite3',
    database: './data/qr-glam.db',
    synchronize: false,
    logging: true,
    entities: [process.cwd() + '/src/**/*.entity{.ts,.js}'],
    migrations: [process.cwd() + '/src/migrations/*{.ts,.js}'],
    subscribers: [],
});
