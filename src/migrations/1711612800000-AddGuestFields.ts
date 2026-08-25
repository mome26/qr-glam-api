import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuestFields1711612800000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Note: status is already present in entity and might be in DB,
        // but role and group are definitely new.
        // In SQLite, we can't easily check column existence in migration script without complex logic,
        // so we use try/catch or just trust the schema state.

        try {
            await queryRunner.query(`ALTER TABLE guests ADD COLUMN role TEXT`);
        } catch (e) {
            console.log('Column "role" might already exist, skipping...');
        }

        try {
            await queryRunner.query(
                `ALTER TABLE guests ADD COLUMN \`group\` TEXT`,
            );
        } catch (e) {
            console.log('Column "group" might already exist, skipping...');
        }

        // status is already in entity with default 'confirmed',
        // checking if we need to add it to DB if it's missing.
        try {
            await queryRunner.query(
                `ALTER TABLE guests ADD COLUMN status TEXT DEFAULT 'confirmed'`,
            );
        } catch (e) {
            console.log('Column "status" might already exist, skipping...');
        }
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // SQLite does not support DROP COLUMN
    }
}
