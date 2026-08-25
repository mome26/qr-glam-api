import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration to update urlHash column from varchar(8) to varchar(36)
 * to support full UUID v7 format for all events.
 */
export class UpdateUrlHashToUuidV717350000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Change column type from varchar(8) to varchar(36)
        await queryRunner.changeColumn(
            'events',
            'urlHash',
            new TableColumn({
                name: 'urlHash',
                type: 'varchar',
                length: '36',
                isNullable: true,
                isUnique: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert column type back to varchar(8)
        await queryRunner.changeColumn(
            'events',
            'urlHash',
            new TableColumn({
                name: 'urlHash',
                type: 'varchar',
                length: '8',
                isNullable: true,
                isUnique: true,
            }),
        );
    }
}
