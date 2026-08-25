import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorQrCode1711586000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if columns exist before adding (SQLite doesn't have IF NOT EXISTS for ALTER TABLE)
        const table = await queryRunner.getTable('qr_codes');

        if (table && !table.findColumnByName('numericId')) {
            await queryRunner.query(
                `ALTER TABLE qr_codes ADD COLUMN numericId INTEGER DEFAULT 0`,
            );
        }

        if (table && !table.findColumnByName('guestId')) {
            await queryRunner.query(
                `ALTER TABLE qr_codes ADD COLUMN guestId TEXT`,
            );
        }

        if (table && !table.findColumnByName('redirectLink')) {
            await queryRunner.query(
                `ALTER TABLE qr_codes ADD COLUMN redirectLink TEXT`,
            );
        }

        if (table && !table.findColumnByName('templateId')) {
            await queryRunner.query(
                `ALTER TABLE qr_codes ADD COLUMN templateId TEXT`,
            );
        }

        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS eventNumericIndex ON qr_codes(eventId, numericId)
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS guestIdIndex ON qr_codes(guestId)
    `);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // Drop columns not trivially supported in SQLite via ALTER TABLE
    }
}
