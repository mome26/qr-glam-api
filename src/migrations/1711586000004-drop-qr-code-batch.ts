import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropQrCodeBatch1711586000004 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS qr_code_batches`);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {}
}
