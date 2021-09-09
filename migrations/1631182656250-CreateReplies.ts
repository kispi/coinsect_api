import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateReplies1631182656250 implements MigrationInterface {
    name = 'CreateReplies1631182656250'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `reactions` DROP FOREIGN KEY `FK_a1ac38351a456da43cd26d38be8`");
        await queryRunner.query("ALTER TABLE `posts` DROP FOREIGN KEY `FK_22fd59b98091387a27788f7a8b1`");
        await queryRunner.query("ALTER TABLE `posts` DROP FOREIGN KEY `FK_d8be760cd953c4a98137c5237a6`");
        await queryRunner.query("CREATE TABLE `replies` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `content` text NOT NULL, `nickname` varchar(255) NOT NULL, `ip` varchar(255) NULL, `password` varchar(255) NULL, `post_id` int NULL, `parent_id` int NULL, `user_id` int NULL, UNIQUE INDEX `REL_c961efa3687d100ed22cd40953` (`user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `posts` DROP COLUMN `parent_id`");
        await queryRunner.query("ALTER TABLE `posts` ADD `sharing_key` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `posts` ADD `password` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `reactions` ADD CONSTRAINT `FK_a1ac38351a456da43cd26d38be8` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_3f53ba89a89b9cea8b9dd9286dc` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_37aebdb3b4ecc3667b54869270b` FOREIGN KEY (`parent_id`) REFERENCES `replies`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_c961efa3687d100ed22cd409534` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `posts` ADD CONSTRAINT `FK_22fd59b98091387a27788f7a8b1` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `posts` DROP FOREIGN KEY `FK_22fd59b98091387a27788f7a8b1`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_c961efa3687d100ed22cd409534`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_37aebdb3b4ecc3667b54869270b`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_3f53ba89a89b9cea8b9dd9286dc`");
        await queryRunner.query("ALTER TABLE `reactions` DROP FOREIGN KEY `FK_a1ac38351a456da43cd26d38be8`");
        await queryRunner.query("ALTER TABLE `posts` DROP COLUMN `password`");
        await queryRunner.query("ALTER TABLE `posts` DROP COLUMN `sharing_key`");
        await queryRunner.query("ALTER TABLE `posts` ADD `parent_id` int NULL");
        await queryRunner.query("DROP INDEX `REL_c961efa3687d100ed22cd40953` ON `replies`");
        await queryRunner.query("DROP TABLE `replies`");
        await queryRunner.query("ALTER TABLE `posts` ADD CONSTRAINT `FK_d8be760cd953c4a98137c5237a6` FOREIGN KEY (`parent_id`) REFERENCES `posts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `posts` ADD CONSTRAINT `FK_22fd59b98091387a27788f7a8b1` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT");
        await queryRunner.query("ALTER TABLE `reactions` ADD CONSTRAINT `FK_a1ac38351a456da43cd26d38be8` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT");
    }

}
