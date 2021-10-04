import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateNotification1633342250707 implements MigrationInterface {
    name = 'CreateNotification1633342250707'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `notifications` (`id` int NOT NULL AUTO_INCREMENT, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `deleted_at` datetime(6) NULL, `text` varchar(255) NOT NULL, `type` varchar(255) NOT NULL, `link` varchar(255) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE `notifications`");
    }

}
