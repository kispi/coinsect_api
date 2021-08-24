import {MigrationInterface, QueryRunner} from "typeorm";

export class AlterMessages1629770605629 implements MigrationInterface {
    name = 'AlterMessages1629770605629'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `messages` ADD `type` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `messages` ADD `text` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `messages` ADD `nickname` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `messages` ADD `image` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `messages` ADD `token` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `messages` ADD `ts` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `messages` ADD `num_connections` INTEGER NOT NULL");
        await queryRunner.query(`
            UPDATE
                messages AS m,
                (SELECT
                    id,
                    json->>'$.type' AS type,
                    json->>'$.text' AS text,
                    json->>'$.user.profile.nickname' AS nickname,
                    json->>'$.user.profile.image' AS image,
                    json->>'$.user.token' AS token,
                    json->>'$.ts' AS ts,
                    json->>'$.numConnections' AS numConnections
                FROM
                    messages) j
            SET
                m.type = j.type,
                m.text = j.text,
                m.nickname = j.nickname,
                m.image = j.image,
                m.token = j.token,
                m.ts = j.ts,
                m.num_connections = j.numConnections
            WHERE
                m.id = j.id;
        `);
        await queryRunner.query("ALTER TABLE `messages` DROP COLUMN `json`");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `messages` DROP COLUMN `ts`");
        await queryRunner.query("ALTER TABLE `messages` DROP COLUMN `token`");
        await queryRunner.query("ALTER TABLE `messages` DROP COLUMN `image`");
        await queryRunner.query("ALTER TABLE `messages` DROP COLUMN `nickname`");
        await queryRunner.query("ALTER TABLE `messages` DROP COLUMN `text`");
        await queryRunner.query("ALTER TABLE `messages` DROP COLUMN `type`");
        await queryRunner.query("ALTER TABLE `messages` DROP COLUMN `numConnections`")
    }
}
