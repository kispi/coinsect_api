import {MigrationInterface, QueryRunner} from "typeorm";

export class AlterPosts1630545847717 implements MigrationInterface {
    name = 'AlterPosts1630545847717'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `posts` CHANGE `post_type` `post_type` varchar(255) NOT NULL DEFAULT 'normal'");
        await queryRunner.query("ALTER TABLE `posts` CHANGE `views` `views` int NOT NULL DEFAULT '0'");
        await queryRunner.query("ALTER TABLE `posts` CHANGE `ip` `ip` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `posts` CHANGE `ip` `ip` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `posts` CHANGE `views` `views` int NOT NULL");
        await queryRunner.query("ALTER TABLE `posts` CHANGE `post_type` `post_type` varchar(255) NOT NULL");
    }

}
