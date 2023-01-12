import { MigrationInterface, QueryRunner } from "typeorm";

export class ReactionUserIsNotUnique1673510249064 implements MigrationInterface {
    name = 'ReactionUserIsNotUnique1673510249064'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`reactions\` DROP FOREIGN KEY \`FK_a1ac38351a456da43cd26d38be8\``);
        await queryRunner.query(`ALTER TABLE \`reactions\` DROP FOREIGN KEY \`FK_dde6062145a93649adc5af3946e\``);
        await queryRunner.query(`DROP INDEX \`REL_dde6062145a93649adc5af3946\` ON \`reactions\``);
        await queryRunner.query(`ALTER TABLE \`reactions\` ADD CONSTRAINT \`FK_a1ac38351a456da43cd26d38be8\` FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`reactions\` DROP FOREIGN KEY \`FK_a1ac38351a456da43cd26d38be8\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_dde6062145a93649adc5af3946\` ON \`reactions\` (\`user_id\`)`);
        await queryRunner.query(`ALTER TABLE \`reactions\` ADD CONSTRAINT \`FK_dde6062145a93649adc5af3946e\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reactions\` ADD CONSTRAINT \`FK_a1ac38351a456da43cd26d38be8\` FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
