import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorGuest1711586000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Guest previously might have had qrCodeId but now 1:1 on QrCode side
        // No changes needed if qrCodeId is dropped from code side
        // But we might need to remove old columns like Batch fields
        await queryRunner.query(`ALTER TABLE guests ADD COLUMN email TEXT`);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {}
}
