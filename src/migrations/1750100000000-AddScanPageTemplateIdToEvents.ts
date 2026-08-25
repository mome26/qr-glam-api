import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddScanPageTemplateIdToEvents1750100000000
    implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('events');
        if (table && !table.findColumnByName('scanPageTemplateId')) {
            await queryRunner.addColumn(
                'events',
                new TableColumn({
                    name: 'scanPageTemplateId',
                    type: 'varchar',
                    length: '100',
                    isNullable: true,
                    default: null,
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('events');
        if (table && table.findColumnByName('scanPageTemplateId')) {
            await queryRunner.dropColumn('events', 'scanPageTemplateId');
        }
    }
}
