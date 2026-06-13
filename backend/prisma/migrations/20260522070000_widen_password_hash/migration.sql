-- AlterTable: scrypt 哈希（scrypt$<salt>$<hash>）约 168 字符，原 VARCHAR(100) 不够，加宽到 255
ALTER TABLE `user` MODIFY `password_hash` VARCHAR(255) NULL;
