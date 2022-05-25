import {MigrationInterface, QueryRunner} from "typeorm";

export class AlterTypePostTypeToPostType1653442177027 implements MigrationInterface {
    name = 'AlterTypePostTypeToPostType1653442177027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`posts\` CHANGE \`type_post_type\` \`post_type\` varchar(255) NOT NULL DEFAULT 'normal'`);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`post_type\``);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`post_type\` varchar(255) NOT NULL DEFAULT 'normal'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`post_type\``);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`post_type\` varchar(255) NOT NULL DEFAULT 'normal'`);
        await queryRunner.query(`ALTER TABLE \`posts\` CHANGE \`post_type\` \`type_post_type\` varchar(255) NOT NULL DEFAULT 'normal'`);
    }

}
