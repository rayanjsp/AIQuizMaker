-- DropForeignKey
ALTER TABLE `result` DROP FOREIGN KEY `Result_quizId_fkey`;

-- AddForeignKey
ALTER TABLE `Result` ADD CONSTRAINT `Result_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `Quiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
