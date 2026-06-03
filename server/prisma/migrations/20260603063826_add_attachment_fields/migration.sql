/*
  Warnings:

  - You are about to drop the column `ticketId` on the `ChatSession` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_ticketId_fkey";

-- AlterTable
ALTER TABLE "ChatSession" DROP COLUMN "ticketId";
