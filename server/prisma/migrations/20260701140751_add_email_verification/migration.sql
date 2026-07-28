-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verify_expiry" TIMESTAMP(3),
ADD COLUMN     "email_verify_token" TEXT;
