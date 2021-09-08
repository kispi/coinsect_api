import {MigrationInterface, QueryRunner} from "typeorm";

export class AlterPostReactionNullableColumns1631092777906 implements MigrationInterface {
    name = 'AlterPostReactionNullableColumns1631092777906'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `reactions` CHANGE `nickname` `nickname` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `posts` CHANGE `title` `title` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `posts` CHANGE `title` `title` varchar(255) NOT NULL DEFAULT ''");
        await queryRunner.query("ALTER TABLE `reactions` CHANGE `nickname` `nickname` varchar(255) NOT NULL");
    }

}
