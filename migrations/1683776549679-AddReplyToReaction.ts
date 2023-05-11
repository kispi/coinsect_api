import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReplyToReaction1683776549679 implements MigrationInterface {
    name = 'AddReplyToReaction1683776549679'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`reactions\` ADD \`reply_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`reactions\` ADD CONSTRAINT \`FK_26b6acbcaf61508347ba962a21a\` FOREIGN KEY (\`reply_id\`) REFERENCES \`replies\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`reactions\` DROP FOREIGN KEY \`FK_26b6acbcaf61508347ba962a21a\``);
        await queryRunner.query(`ALTER TABLE \`reactions\` DROP COLUMN \`reply_id\``);
    }

}
