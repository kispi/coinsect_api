import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastEditRemoveIsEditedFromPostAndReply1687846873712 implements MigrationInterface {
    name = 'AddLastEditRemoveIsEditedFromPostAndReply1687846873712'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`replies\` CHANGE \`is_edited\` \`last_edit\` tinyint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`posts\` CHANGE \`is_edited\` \`last_edit\` tinyint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`replies\` DROP COLUMN \`last_edit\``);
        await queryRunner.query(`ALTER TABLE \`replies\` ADD \`last_edit\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`last_edit\``);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`last_edit\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`last_edit\``);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`last_edit\` tinyint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`replies\` DROP COLUMN \`last_edit\``);
        await queryRunner.query(`ALTER TABLE \`replies\` ADD \`last_edit\` tinyint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`posts\` CHANGE \`last_edit\` \`is_edited\` tinyint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`replies\` CHANGE \`last_edit\` \`is_edited\` tinyint NOT NULL DEFAULT '0'`);
    }

}
