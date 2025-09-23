const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class initialSchemaPhones1625847615203 {
  name = 'initialSchemaPhones1625847615203'

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "email" varchar,
        "password" varchar NOT NULL,
        "admin" boolean NOT NULL DEFAULT (1),
        "tokenVersion" integer NOT NULL DEFAULT (0),
        "provider" varchar,
        "providerId" varchar,
        "name" varchar,
        "avatarUrl" varchar
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "report" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "manufacturer" varchar NOT NULL,
        "model" varchar NOT NULL,
        "screenSize" integer NOT NULL,
        "price" integer NOT NULL,
        "userId" integer,
        CONSTRAINT "FK_report_user" FOREIGN KEY ("userId") REFERENCES "user" ("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "report"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
