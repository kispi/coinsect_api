import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateWhaleAlert1660482716266 implements MigrationInterface {
    name = 'CreateWhaleAlert1660482716266'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`whale_alerts\` (\`hash\` varchar(255) NOT NULL, \`amount\` int NULL, \`amount_usd\` int NULL, \`from_address\` varchar(255) NULL, \`blockchain\` varchar(255) NULL, \`symbol\` varchar(255) NULL, \`from_owner\` varchar(255) NULL, \`from_owner_type\` varchar(255) NULL, \`to_address\` varchar(255) NULL, \`to_owner\` varchar(255) NULL, \`to_owner_type\` varchar(255) NULL, \`transaction_count\` int NULL, \`transaction_type\` varchar(255) NULL, \`timestamp\` int NULL, UNIQUE INDEX \`IDX_7c748a8328297bc5b25d652109\` (\`hash\`), PRIMARY KEY (\`hash\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_7c748a8328297bc5b25d652109\` ON \`whale_alerts\``);
        await queryRunner.query(`DROP TABLE \`whale_alerts\``);
    }

}
