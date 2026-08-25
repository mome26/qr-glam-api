import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveQrLinkFromQrCodes1740000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('qr_codes');
        if (table && table.findColumnByName('qrLink')) {
            await queryRunner.dropColumn('qr_codes', 'qrLink');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('qr_codes');
        if (table && !table.findColumnByName('qrLink')) {
            await queryRunner.addColumn(
                'qr_codes',
                new TableColumn({
                    name: 'qrLink',
                    type: 'varchar',
                    isNullable: false,
                    default: "''",
                }),
            );
        }
    }
}
