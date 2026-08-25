import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateGuestStatusEnum1726000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing status column if it exists
        const table = await queryRunner.getTable('guests');
        if (table) {
            const statusColumn = table.findColumnByName('status');
            if (statusColumn) {
                await queryRunner.dropColumn('guests', 'status');
            }
        }

        // Add new status column with Pending, Complete, Denied enum values
        await queryRunner.addColumn(
            'guests',
            new TableColumn({
                name: 'status',
                type: 'varchar',
                default: "'Pending'",
                isNullable: false,
            }),
        );

        // Add check constraint to enforce enum values
        await queryRunner.query(
            `ALTER TABLE guests ADD CHECK (status IN ('Pending', 'Complete', 'Denied'))`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop check constraint
        await queryRunner.query(
            `ALTER TABLE guests DROP CHECK IF EXISTS guests_status_check`,
        );
        // Drop status column
        await queryRunner.dropColumn('guests', 'status');
    }
}
