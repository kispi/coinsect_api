import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateBoards1629858201904 implements MigrationInterface {
    name = 'CreateBoards1629858201904'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `boards` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `type` varchar(255) NOT NULL, `title` varchar(255) NOT NULL, `description` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `posts` ADD `board_id` int NULL");
        await queryRunner.query("ALTER TABLE `bad_words` CHANGE `type` `type` varchar(255) NOT NULL DEFAULT 'insulting'");
        await queryRunner.query("ALTER TABLE `posts` ADD CONSTRAINT `FK_22fd59b98091387a27788f7a8b1` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `posts` DROP FOREIGN KEY `FK_22fd59b98091387a27788f7a8b1`");
        await queryRunner.query("ALTER TABLE `bad_words` CHANGE `type` `type` varchar(255) NOT NULL DEFAULT ''");
        await queryRunner.query("ALTER TABLE `posts` DROP COLUMN `board_id`");
        await queryRunner.query("DROP TABLE `boards`");
    }

}
