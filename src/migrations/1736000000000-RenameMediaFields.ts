import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameMediaFields1736000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE events ADD COLUMN mediaSourceUrl TEXT`,
        );
        await queryRunner.query(
            `ALTER TABLE events ADD COLUMN mediaFolderId TEXT`,
        );
        await queryRunner.query(
            `UPDATE events SET mediaSourceUrl = mediaLink, mediaFolderId = mediaFolderUrl`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE events SET mediaLink = mediaSourceUrl, mediaFolderUrl = mediaFolderId`,
        );
        await queryRunner.query(
            `ALTER TABLE events DROP COLUMN mediaSourceUrl`,
        );
        await queryRunner.query(`ALTER TABLE events DROP COLUMN mediaFolderId`);
    }
}
