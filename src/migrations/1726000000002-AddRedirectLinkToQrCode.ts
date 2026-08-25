import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRedirectLinkToQrCode1726000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('qr_codes');
        if (table && !table.findColumnByName('redirectLink')) {
            await queryRunner.addColumn(
                'qr_codes',
                new TableColumn({
                    name: 'redirectLink',
                    type: 'text',
                    isNullable: true,
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('qr_codes', 'redirectLink');
    }
}
