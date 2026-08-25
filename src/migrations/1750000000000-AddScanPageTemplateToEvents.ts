import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddScanPageTemplateToEvents1750000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('events');
        if (table && !table.findColumnByName('scanPageTemplate')) {
            await queryRunner.addColumn(
                'events',
                new TableColumn({
                    name: 'scanPageTemplate',
                    type: 'text',
                    isNullable: true,
                    default: null,
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('events');
        if (table && table.findColumnByName('scanPageTemplate')) {
            await queryRunner.dropColumn('events', 'scanPageTemplate');
        }
    }
}
