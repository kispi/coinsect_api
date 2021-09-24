import {MigrationInterface, QueryRunner} from "typeorm";

export class CreatePersonsAndImages1632474644577 implements MigrationInterface {
    name = 'CreatePersonsAndImages1632474644577'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `images` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `key` varchar(255) NOT NULL, `type` varchar(255) NULL, `description` varchar(255) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `persons` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `name` varchar(255) NOT NULL, `bio` text NULL, `description` varchar(255) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `persons_images` (`persons_id` int NOT NULL, `images_id` int NOT NULL, INDEX `IDX_548d8a618676b449d257b09f99` (`persons_id`), INDEX `IDX_0410d424dcc1a868954b2324cb` (`images_id`), PRIMARY KEY (`persons_id`, `images_id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `persons_images` ADD CONSTRAINT `FK_548d8a618676b449d257b09f99c` FOREIGN KEY (`persons_id`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE `persons_images` ADD CONSTRAINT `FK_0410d424dcc1a868954b2324cbb` FOREIGN KEY (`images_id`) REFERENCES `images`(`id`) ON DELETE CASCADE ON UPDATE CASCADE");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `persons_images` DROP FOREIGN KEY `FK_0410d424dcc1a868954b2324cbb`");
        await queryRunner.query("ALTER TABLE `persons_images` DROP FOREIGN KEY `FK_548d8a618676b449d257b09f99c`");
        await queryRunner.query("DROP INDEX `IDX_0410d424dcc1a868954b2324cb` ON `persons_images`");
        await queryRunner.query("DROP INDEX `IDX_548d8a618676b449d257b09f99` ON `persons_images`");
        await queryRunner.query("DROP TABLE `persons_images`");
        await queryRunner.query("DROP TABLE `persons`");
        await queryRunner.query("DROP TABLE `images`");
    }

}
