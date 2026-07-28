/*
  Warnings:

  - You are about to drop the column `email_verify_expiry` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `email_verify_token` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "email_verify_expiry",
DROP COLUMN "email_verify_token",
ALTER COLUMN "is_verified" SET DEFAULT true;
