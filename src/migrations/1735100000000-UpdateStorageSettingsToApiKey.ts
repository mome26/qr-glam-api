import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateStorageSettingsToApiKey1735100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Drop old OAuth columns
        await queryRunner.dropColumn('storage_settings', 'googleClientId');
        await queryRunner.dropColumn('storage_settings', 'googleClientSecret');
        await queryRunner.dropColumn('storage_settings', 'googleRefreshToken');

        // 2. Add new API Key column
        await queryRunner.addColumn(
            'storage_settings',
            new TableColumn({
                name: 'googleApiKey',
                type: 'varchar',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Drop new API Key column
        await queryRunner.dropColumn('storage_settings', 'googleApiKey');

        // 2. Add back old OAuth columns
        await queryRunner.addColumns('storage_settings', [
            new TableColumn({
                name: 'googleClientId',
                type: 'varchar',
                isNullable: true,
            }),
            new TableColumn({
                name: 'googleClientSecret',
                type: 'varchar',
                isNullable: true,
            }),
            new TableColumn({
                name: 'googleRefreshToken',
                type: 'varchar',
                isNullable: true,
            }),
        ]);
    }
}
