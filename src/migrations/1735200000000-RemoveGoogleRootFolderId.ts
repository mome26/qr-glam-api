import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveGoogleRootFolderId1735200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('storage_settings', 'googleRootFolderId');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'storage_settings',
            new TableColumn({
                name: 'googleRootFolderId',
                type: 'varchar',
                isNullable: true,
            }),
        );
    }
}
