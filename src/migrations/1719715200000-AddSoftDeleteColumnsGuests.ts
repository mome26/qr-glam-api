import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSoftDeleteColumnsGuests1719715200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'guests',
            new TableColumn({
                name: 'deletedAt',
                type: 'datetime',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('guests', 'deletedAt');
    }
}
