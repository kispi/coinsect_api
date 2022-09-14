import {MigrationInterface, QueryRunner} from "typeorm";

export class AddTokenToBannedUser1663166179825 implements MigrationInterface {
    name = 'AddTokenToBannedUser1663166179825'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`banned_users\` ADD \`token\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`banned_users\` DROP COLUMN \`token\``);
    }

}
