import {MigrationInterface, QueryRunner} from "typeorm";

export class AlterBoards1630636249085 implements MigrationInterface {
    name = 'AlterBoards1630636249085'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `boards` CHANGE `type` `type` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `boards` CHANGE `title` `title` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `boards` CHANGE `description` `description` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `boards` CHANGE `description` `description` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `boards` CHANGE `title` `title` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `boards` CHANGE `type` `type` varchar(255) NOT NULL");
    }

}
