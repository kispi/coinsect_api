import {MigrationInterface, QueryRunner} from "typeorm";

export class AlterMessagesImageAllowNull1634625211864 implements MigrationInterface {
    name = 'AlterMessagesImageAllowNull1634625211864'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `messages` CHANGE `image` `image` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `messages` CHANGE `image` `image` varchar(255) NOT NULL");
    }

}
