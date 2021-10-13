import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateBannedUser1634105500860 implements MigrationInterface {
    name = 'CreateBannedUser1634105500860'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `banned_users` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `ip` varchar(255) NULL, `reason` text NULL, `until` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6), `user_id` int NULL, UNIQUE INDEX `REL_fd5e420215b009a896ac51fd66` (`user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `banned_users` ADD CONSTRAINT `FK_fd5e420215b009a896ac51fd66e` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `banned_users` DROP FOREIGN KEY `FK_fd5e420215b009a896ac51fd66e`");
        await queryRunner.query("DROP INDEX `REL_fd5e420215b009a896ac51fd66` ON `banned_users`");
        await queryRunner.query("DROP TABLE `banned_users`");
    }

}
