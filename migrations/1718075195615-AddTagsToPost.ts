import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTagsToPost1718075195615 implements MigrationInterface {
    name = 'AddTagsToPost1718075195615'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`tags\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`tags\``);
    }

}
