import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCascadeRelationsToPostsAndReplies1631244569957 implements MigrationInterface {
    name = 'AddCascadeRelationsToPostsAndReplies1631244569957'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `reactions` DROP FOREIGN KEY `FK_a1ac38351a456da43cd26d38be8`");
        await queryRunner.query("ALTER TABLE `reactions` DROP FOREIGN KEY `FK_dde6062145a93649adc5af3946e`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_37aebdb3b4ecc3667b54869270b`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_3f53ba89a89b9cea8b9dd9286dc`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_c961efa3687d100ed22cd409534`");
        await queryRunner.query("ALTER TABLE `posts` DROP FOREIGN KEY `FK_22fd59b98091387a27788f7a8b1`");
        await queryRunner.query("ALTER TABLE `posts` DROP FOREIGN KEY `FK_c4f9a7bd77b489e711277ee5986`");
        await queryRunner.query("ALTER TABLE `reactions` ADD CONSTRAINT `FK_a1ac38351a456da43cd26d38be8` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `reactions` ADD CONSTRAINT `FK_dde6062145a93649adc5af3946e` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_3f53ba89a89b9cea8b9dd9286dc` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_37aebdb3b4ecc3667b54869270b` FOREIGN KEY (`parent_id`) REFERENCES `replies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_c961efa3687d100ed22cd409534` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `posts` ADD CONSTRAINT `FK_22fd59b98091387a27788f7a8b1` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `posts` ADD CONSTRAINT `FK_c4f9a7bd77b489e711277ee5986` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `posts` DROP FOREIGN KEY `FK_c4f9a7bd77b489e711277ee5986`");
        await queryRunner.query("ALTER TABLE `posts` DROP FOREIGN KEY `FK_22fd59b98091387a27788f7a8b1`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_c961efa3687d100ed22cd409534`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_37aebdb3b4ecc3667b54869270b`");
        await queryRunner.query("ALTER TABLE `replies` DROP FOREIGN KEY `FK_3f53ba89a89b9cea8b9dd9286dc`");
        await queryRunner.query("ALTER TABLE `reactions` DROP FOREIGN KEY `FK_dde6062145a93649adc5af3946e`");
        await queryRunner.query("ALTER TABLE `reactions` DROP FOREIGN KEY `FK_a1ac38351a456da43cd26d38be8`");
        await queryRunner.query("ALTER TABLE `posts` ADD CONSTRAINT `FK_c4f9a7bd77b489e711277ee5986` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `posts` ADD CONSTRAINT `FK_22fd59b98091387a27788f7a8b1` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_c961efa3687d100ed22cd409534` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_3f53ba89a89b9cea8b9dd9286dc` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `replies` ADD CONSTRAINT `FK_37aebdb3b4ecc3667b54869270b` FOREIGN KEY (`parent_id`) REFERENCES `replies`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `reactions` ADD CONSTRAINT `FK_dde6062145a93649adc5af3946e` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE `reactions` ADD CONSTRAINT `FK_a1ac38351a456da43cd26d38be8` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
    }

}
