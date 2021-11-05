import {MigrationInterface, QueryRunner} from "typeorm";

export class AddSharingKeyToPerson1636075542697 implements MigrationInterface {
    name = 'AddSharingKeyToPerson1636075542697'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `notifications` ADD `active` tinyint NOT NULL DEFAULT 0");
        await queryRunner.query("ALTER TABLE `persons` ADD `sharing_key` varchar(255) NOT NULL");
        await queryRunner.query("CREATE INDEX `IDX_89f9415bbf88a6b48e3732a49a` ON `posts` (`sharing_key`)");
        await queryRunner.query("CREATE INDEX `IDX_c36ac561ee4ee4114bf93b98ec` ON `persons` (`sharing_key`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_c36ac561ee4ee4114bf93b98ec` ON `persons`");
        await queryRunner.query("DROP INDEX `IDX_89f9415bbf88a6b48e3732a49a` ON `posts`");
        await queryRunner.query("ALTER TABLE `persons` DROP COLUMN `sharing_key`");
        await queryRunner.query("ALTER TABLE `notifications` DROP COLUMN `active`");
    }

}
