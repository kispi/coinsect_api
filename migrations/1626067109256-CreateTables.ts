import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateTables1626067109256 implements MigrationInterface {
    name = 'CreateTables1626067109256'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `users` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `birthday` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, `email` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `reactions` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `type` varchar(255) NOT NULL, `nickname` varchar(255) NOT NULL, `ip` varchar(255) NOT NULL, `post_id` int NULL, `user_id` int NULL, UNIQUE INDEX `REL_dde6062145a93649adc5af3946` (`user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `posts` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `title` varchar(255) NOT NULL, `content` text NOT NULL, `post_type` varchar(255) NOT NULL, `views` int NOT NULL, `nickname` varchar(255) NOT NULL, `ip` varchar(255) NOT NULL, `parent_id` int NULL, `user_id` int NULL, UNIQUE INDEX `REL_c4f9a7bd77b489e711277ee598` (`user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `reactions` ADD CONSTRAINT `FK_a1ac38351a456da43cd26d38be8` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `reactions` ADD CONSTRAINT `FK_dde6062145a93649adc5af3946e` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `posts` ADD CONSTRAINT `FK_d8be760cd953c4a98137c5237a6` FOREIGN KEY (`parent_id`) REFERENCES `posts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `posts` ADD CONSTRAINT `FK_c4f9a7bd77b489e711277ee5986` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `posts` DROP FOREIGN KEY `FK_c4f9a7bd77b489e711277ee5986`");
        await queryRunner.query("ALTER TABLE `posts` DROP FOREIGN KEY `FK_d8be760cd953c4a98137c5237a6`");
        await queryRunner.query("ALTER TABLE `reactions` DROP FOREIGN KEY `FK_dde6062145a93649adc5af3946e`");
        await queryRunner.query("ALTER TABLE `reactions` DROP FOREIGN KEY `FK_a1ac38351a456da43cd26d38be8`");
        await queryRunner.query("DROP INDEX `REL_c4f9a7bd77b489e711277ee598` ON `posts`");
        await queryRunner.query("DROP TABLE `posts`");
        await queryRunner.query("DROP INDEX `REL_dde6062145a93649adc5af3946` ON `reactions`");
        await queryRunner.query("DROP TABLE `reactions`");
        await queryRunner.query("DROP TABLE `users`");
    }

}
