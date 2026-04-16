-- AlterTable
ALTER TABLE `question` ADD COLUMN `pointValue` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `quiz` ADD COLUMN `mode` VARCHAR(191) NOT NULL DEFAULT 'standard',
    ADD COLUMN `scoreConfig` JSON NULL;
