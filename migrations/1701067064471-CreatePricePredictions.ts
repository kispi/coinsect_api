import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePricePredictions1701067064471 implements MigrationInterface {
    name = 'CreatePricePredictions1701067064471'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`price_predictions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`user_id\` int NULL, \`nickname\` varchar(255) NOT NULL, \`ip\` varchar(255) NULL, \`sharing_key\` varchar(255) NULL, \`password\` varchar(255) NULL, \`ticker\` varchar(255) NOT NULL, \`price_snapshot\` decimal(36,18) NOT NULL, \`time_from\` datetime NULL, \`time_to\` datetime NULL, \`price_min\` decimal(36,18) NULL, \`price_max\` decimal(36,18) NULL, INDEX \`IDX_c08779b39a4458d7181f9942ca\` (\`sharing_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_c08779b39a4458d7181f9942ca\` ON \`price_predictions\``);
        await queryRunner.query(`DROP TABLE \`price_predictions\``);
    }

}
