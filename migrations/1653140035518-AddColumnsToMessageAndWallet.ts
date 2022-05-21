import {MigrationInterface, QueryRunner} from "typeorm";

export class AddColumnsToMessageAndWallet1653140035518 implements MigrationInterface {
    name = 'AddColumnsToMessageAndWallet1653140035518'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`wallets\` ADD \`balance\` decimal(36,18) NULL`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD \`meta\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`meta\``);
        await queryRunner.query(`ALTER TABLE \`wallets\` DROP COLUMN \`balance\``);
    }

}
