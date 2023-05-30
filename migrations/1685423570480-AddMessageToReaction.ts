import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMessageToReaction1685423570480 implements MigrationInterface {
    name = 'AddMessageToReaction1685423570480'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`reactions\` ADD \`message_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`reactions\` ADD CONSTRAINT \`FK_2ee227780745018b358237c0ad7\` FOREIGN KEY (\`message_id\`) REFERENCES \`messages\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`reactions\` DROP FOREIGN KEY \`FK_2ee227780745018b358237c0ad7\``);
        await queryRunner.query(`ALTER TABLE \`reactions\` DROP COLUMN \`message_id\``);
    }

}
