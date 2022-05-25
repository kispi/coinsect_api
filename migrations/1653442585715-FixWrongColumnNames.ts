import {MigrationInterface, QueryRunner} from "typeorm";

export class FixWrongColumnNames1653442585715 implements MigrationInterface {
    name = 'FixWrongColumnNames1653442585715'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`profiles\` CHANGE \`type_profile_gender\` \`gender\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`profiles\` DROP COLUMN \`gender\``);
        await queryRunner.query(`ALTER TABLE \`profiles\` ADD \`gender\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`profiles\` DROP COLUMN \`gender\``);
        await queryRunner.query(`ALTER TABLE \`profiles\` ADD \`gender\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`profiles\` CHANGE \`gender\` \`type_profile_gender\` varchar(255) NULL`);
    }

}
