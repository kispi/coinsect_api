import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateAuthUserProfile1653384838762 implements MigrationInterface {
    name = 'CreateAuthUserProfile1653384838762'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`posts\` CHANGE \`post_type\` \`type_post_type\` varchar(255) NOT NULL DEFAULT 'normal'`);
        await queryRunner.query(`CREATE TABLE \`profiles\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`type_profile_gender\` varchar(255) NULL, \`birthday\` datetime NULL, \`name\` varchar(255) NULL, \`nickname\` varchar(255) NOT NULL, \`user_id\` int NULL, \`image_id\` int NULL, UNIQUE INDEX \`REL_9e432b7df0d182f8d292902d1a\` (\`user_id\`), UNIQUE INDEX \`REL_f1b79d17943bdb86510ea68bd0\` (\`image_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`auth_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`token\` varchar(255) NOT NULL, \`provider\` varchar(255) NOT NULL, \`user_id\` int NULL, UNIQUE INDEX \`REL_9691367d446cd8b18f462c191b\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_securities\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`password_reset_token\` varchar(255) NULL, \`password_reset_token_sent_at\` datetime NULL, \`user_id\` int NULL, UNIQUE INDEX \`REL_9d5cb6692af6393ea37ca4ee21\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`birthday\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`password\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`phone\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`role\` varchar(255) NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`auth\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`sign_in_count\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`last_sign_in\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`last_sign_in_ip\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`deactivated_at\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`type_post_type\``);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`type_post_type\` varchar(255) NOT NULL DEFAULT 'normal'`);
        await queryRunner.query(`ALTER TABLE \`profiles\` ADD CONSTRAINT \`FK_9e432b7df0d182f8d292902d1a2\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`profiles\` ADD CONSTRAINT \`FK_f1b79d17943bdb86510ea68bd06\` FOREIGN KEY (\`image_id\`) REFERENCES \`images\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`auth_tokens\` ADD CONSTRAINT \`FK_9691367d446cd8b18f462c191b3\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_securities\` ADD CONSTRAINT \`FK_9d5cb6692af6393ea37ca4ee218\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_securities\` DROP FOREIGN KEY \`FK_9d5cb6692af6393ea37ca4ee218\``);
        await queryRunner.query(`ALTER TABLE \`auth_tokens\` DROP FOREIGN KEY \`FK_9691367d446cd8b18f462c191b3\``);
        await queryRunner.query(`ALTER TABLE \`profiles\` DROP FOREIGN KEY \`FK_f1b79d17943bdb86510ea68bd06\``);
        await queryRunner.query(`ALTER TABLE \`profiles\` DROP FOREIGN KEY \`FK_9e432b7df0d182f8d292902d1a2\``);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`type_post_type\``);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`type_post_type\` varchar(255) NOT NULL DEFAULT 'normal'`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`deactivated_at\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`last_sign_in_ip\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`last_sign_in\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`sign_in_count\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`auth\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`role\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`phone\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`password\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`birthday\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`name\` varchar(255) NOT NULL`);
        await queryRunner.query(`DROP INDEX \`REL_9d5cb6692af6393ea37ca4ee21\` ON \`user_securities\``);
        await queryRunner.query(`DROP TABLE \`user_securities\``);
        await queryRunner.query(`DROP INDEX \`REL_9691367d446cd8b18f462c191b\` ON \`auth_tokens\``);
        await queryRunner.query(`DROP TABLE \`auth_tokens\``);
        await queryRunner.query(`DROP INDEX \`REL_f1b79d17943bdb86510ea68bd0\` ON \`profiles\``);
        await queryRunner.query(`DROP INDEX \`REL_9e432b7df0d182f8d292902d1a\` ON \`profiles\``);
        await queryRunner.query(`DROP TABLE \`profiles\``);
        await queryRunner.query(`ALTER TABLE \`posts\` CHANGE \`type_post_type\` \`post_type\` varchar(255) NOT NULL DEFAULT 'normal'`);
    }

}
