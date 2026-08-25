import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorEvent1711586000003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE events ADD COLUMN defaultTemplateId TEXT`,
        );
        await queryRunner.query(`ALTER TABLE events ADD COLUMN mediaLink TEXT`);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {}
}
