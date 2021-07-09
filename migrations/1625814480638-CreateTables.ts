import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateTables1625814480638 implements MigrationInterface {
    name = 'CreateTables1625814480638'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `users` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `birthday` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, `email` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `reactions` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `title` varchar(255) NOT NULL, `nickname` varchar(255) NOT NULL, `ip` varchar(255) NOT NULL, `article_id` int NULL, `user_id` int NULL, UNIQUE INDEX `REL_dde6062145a93649adc5af3946` (`user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `replies` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `content` text NOT NULL, `nickname` varchar(255) NOT NULL, `ip` varchar(255) NOT NULL, `article_id` int NULL, `user_id` int NULL, UNIQUE INDEX `REL_c961efa3687d100ed22cd40953` (`user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `articles` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `title` varchar(255) NOT NULL, `content` text NOT NULL, `views` int NOT NULL, `nickname` varchar(255) NOT NULL, `ip` varchar(255) NOT NULL, `user_id` int NULL, UNIQUE INDEX `REL_87bb15395540ae06337a486a77` (`user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `reactions` ADD CONSTRAINT `FK_c5575009b033142965fcc5519cd` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `reactions` ADD CONSTRAINT `FK_dde6062145a93649adc5af3946e` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_3d6ac9d415aba0cb9ea4edf5712` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_c961efa3687d100ed22cd409534` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `articles` ADD CONSTRAINT `FK_87bb15395540ae06337a486a77a` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `articles` DROP FOREIGN KEY `FK_87bb15395540ae06337a486a77a`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_c961efa3687d100ed22cd409534`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_3d6ac9d415aba0cb9ea4edf5712`");
        await queryRunner.query("ALTER TABLE `reactions` DROP FOREIGN KEY `FK_dde6062145a93649adc5af3946e`");
        await queryRunner.query("ALTER TABLE `reactions` DROP FOREIGN KEY `FK_c5575009b033142965fcc5519cd`");
        await queryRunner.query("DROP INDEX `REL_87bb15395540ae06337a486a77` ON `articles`");
        await queryRunner.query("DROP TABLE `articles`");
        await queryRunner.query("DROP INDEX `REL_c961efa3687d100ed22cd40953` ON `replies`");
        await queryRunner.query("DROP TABLE `replies`");
        await queryRunner.query("DROP INDEX `REL_dde6062145a93649adc5af3946` ON `reactions`");
        await queryRunner.query("DROP TABLE `reactions`");
        await queryRunner.query("DROP TABLE `users`");
    }

}
