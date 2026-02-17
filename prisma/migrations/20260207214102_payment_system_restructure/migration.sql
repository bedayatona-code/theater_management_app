/*
  Warnings:

  - You are about to drop the `invoices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `eventPlayerId` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "invoices_invoiceNumber_key";

-- AlterTable
ALTER TABLE "events" ADD COLUMN "commissionerPhone" TEXT;
ALTER TABLE "events" ADD COLUMN "commissionerTaxId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "image" TEXT;
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "invoices";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "eventPlayerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_events_eventPlayerId_fkey" FOREIGN KEY ("eventPlayerId") REFERENCES "event_players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'TRANSFER',
    "transactionReference" TEXT,
    "checkNumber" TEXT,
    "bankAccount" TEXT,
    "bankNumber" TEXT,
    "receiptLink" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "bankAccount", "bankNumber", "createdAt", "id", "notes", "paymentDate", "playerId", "receiptLink", "updatedAt") SELECT "amount", "bankAccount", "bankNumber", "createdAt", "id", "notes", "paymentDate", "playerId", "receiptLink", "updatedAt" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE TABLE "new_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "imageUrl" TEXT,
    "overpaymentDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_players" ("address", "createdAt", "email", "fullName", "id", "phone", "taxId", "updatedAt") SELECT "address", "createdAt", "email", "fullName", "id", "phone", "taxId", "updatedAt" FROM "players";
DROP TABLE "players";
ALTER TABLE "new_players" RENAME TO "players";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_paymentId_eventPlayerId_key" ON "payment_events"("paymentId", "eventPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
