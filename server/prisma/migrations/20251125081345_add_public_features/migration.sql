/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `Quiz` will be added. If there are existing duplicate values, this will fail.
  - The required column `publicId` was added to the `Quiz` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE `result` DROP FOREIGN KEY `Result_userId_fkey`;

-- AlterTable
ALTER TABLE `quiz` ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `publicId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `result` ADD COLUMN `guestName` VARCHAR(191) NULL,
    MODIFY `userId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Quiz_publicId_key` ON `Quiz`(`publicId`);

-- AddForeignKey
ALTER TABLE `Result` ADD CONSTRAINT `Result_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
