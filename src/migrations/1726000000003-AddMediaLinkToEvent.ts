import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMediaLinkToEvent1726000000003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('events');
        if (table && !table.findColumnByName('mediaLink')) {
            await queryRunner.addColumn(
                'events',
                new TableColumn({
                    name: 'mediaLink',
                    type: 'text',
                    isNullable: true,
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('events', 'mediaLink');
    }
}
