import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserToMessage1666747922005 implements MigrationInterface {
    name = 'AddUserToMessage1666747922005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`profiles\` DROP FOREIGN KEY \`FK_f1b79d17943bdb86510ea68bd06\``);
        await queryRunner.query(`DROP INDEX \`REL_f1b79d17943bdb86510ea68bd0\` ON \`profiles\``);
        await queryRunner.query(`ALTER TABLE \`profiles\` CHANGE \`image_id\` \`image\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD \`user_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`profiles\` DROP COLUMN \`image\``);
        await queryRunner.query(`ALTER TABLE \`profiles\` ADD \`image\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_830a3c1d92614d1495418c46736\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_830a3c1d92614d1495418c46736\``);
        await queryRunner.query(`ALTER TABLE \`profiles\` DROP COLUMN \`image\``);
        await queryRunner.query(`ALTER TABLE \`profiles\` ADD \`image\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`user_id\``);
        await queryRunner.query(`ALTER TABLE \`profiles\` CHANGE \`image\` \`image_id\` int NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_f1b79d17943bdb86510ea68bd0\` ON \`profiles\` (\`image_id\`)`);
        await queryRunner.query(`ALTER TABLE \`profiles\` ADD CONSTRAINT \`FK_f1b79d17943bdb86510ea68bd06\` FOREIGN KEY (\`image_id\`) REFERENCES \`images\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
