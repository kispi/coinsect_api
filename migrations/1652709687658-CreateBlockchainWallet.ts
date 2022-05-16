import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateBlockchainWallet1652709687658 implements MigrationInterface {
    name = 'CreateBlockchainWallet1652709687658'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`wallets\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`address\` varchar(255) NOT NULL, \`memo\` varchar(255) NULL, \`description\` varchar(255) NULL, \`blockchain_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`blockchains\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`name\` varchar(255) NOT NULL, \`symbol\` varchar(255) NOT NULL, \`icon\` varchar(255) NOT NULL, \`explore_url\` varchar(255) NULL, \`description\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`wallets\` ADD CONSTRAINT \`FK_b31281e17d4fe91380854c56aca\` FOREIGN KEY (\`blockchain_id\`) REFERENCES \`blockchains\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`wallets\` DROP FOREIGN KEY \`FK_b31281e17d4fe91380854c56aca\``);
        await queryRunner.query(`DROP TABLE \`blockchains\``);
        await queryRunner.query(`DROP TABLE \`wallets\``);
    }

}
