import { MigrationInterface, QueryRunner } from "typeorm";

export class PostUserIsNotUnique1667183721951 implements MigrationInterface {
    name = 'PostUserIsNotUnique1667183721951'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`replies\` DROP FOREIGN KEY \`FK_c961efa3687d100ed22cd409534\``);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_c4f9a7bd77b489e711277ee5986\``);
        await queryRunner.query(`DROP INDEX \`REL_c961efa3687d100ed22cd40953\` ON \`replies\``);
        await queryRunner.query(`DROP INDEX \`REL_c4f9a7bd77b489e711277ee598\` ON \`posts\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_c4f9a7bd77b489e711277ee598\` ON \`posts\` (\`user_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_c961efa3687d100ed22cd40953\` ON \`replies\` (\`user_id\`)`);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_c4f9a7bd77b489e711277ee5986\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`replies\` ADD CONSTRAINT \`FK_c961efa3687d100ed22cd409534\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
