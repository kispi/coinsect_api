import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsEditedToPostAndReply1687845873480 implements MigrationInterface {
    name = 'AddIsEditedToPostAndReply1687845873480'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`replies\` ADD \`is_edited\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`is_edited\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`is_edited\``);
        await queryRunner.query(`ALTER TABLE \`replies\` DROP COLUMN \`is_edited\``);
    }

}
