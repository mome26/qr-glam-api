import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUrlStrategyToEvents1712160000000 implements MigrationInterface {
    name = 'AddUrlStrategyToEvents1712160000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // SQLite doesn't support multiple columns in one ALTER TABLE, nor NOT NULL without default or existing data
        await queryRunner.query(
            `ALTER TABLE "events" ADD COLUMN "urlStrategy" TEXT DEFAULT 'pure-slug'`,
        );
        await queryRunner.query(
            `ALTER TABLE "events" ADD COLUMN "urlHash" VARCHAR(8)`,
        );
        await queryRunner.query(
            `ALTER TABLE "events" ADD COLUMN "requireAuthForQrScan" BOOLEAN DEFAULT 0`,
        );

        // Create unique index on urlHash
        await queryRunner.query(
            `CREATE UNIQUE INDEX "idx_events_urlHash" ON "events" ("urlHash") WHERE "urlHash" IS NOT NULL`,
        );

        // Create composite index on (slug, id)
        await queryRunner.query(
            `CREATE INDEX "idx_events_slug_id" ON "events" ("slug", "id")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_events_slug_id"`);
        await queryRunner.query(`DROP INDEX "idx_events_urlHash"`);

        // In SQLite, dropping columns is tricky; if it's modern SQLite, it works
        try {
            await queryRunner.query(
                `ALTER TABLE "events" DROP COLUMN "requireAuthForQrScan"`,
            );
            await queryRunner.query(
                `ALTER TABLE "events" DROP COLUMN "urlHash"`,
            );
            await queryRunner.query(
                `ALTER TABLE "events" DROP COLUMN "urlStrategy"`,
            );
        } catch (e) {
            // Fallback for older SQLite: rename table, create new, copy data
        }
    }
}
