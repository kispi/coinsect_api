import {MigrationInterface, QueryRunner} from "typeorm";

export class AddAlternativeToBadWord1652246618067 implements MigrationInterface {
    name = 'AddAlternativeToBadWord1652246618067'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`bad_words\` ADD \`alternative\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`bad_words\` DROP COLUMN \`alternative\``);
    }

}
