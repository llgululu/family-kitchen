-- AlterTable: wx_openid 改为可空（H5 手机号注册用户没有微信 openid）
ALTER TABLE `user` MODIFY `wx_openid` VARCHAR(191) NULL;

-- AlterTable: 新增手机号 + 密码哈希（H5 账号 + 密码登录 / 跨端互通）
ALTER TABLE `user` ADD COLUMN `phone` VARCHAR(20) NULL,
    ADD COLUMN `password_hash` VARCHAR(100) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_phone_key` ON `user`(`phone`);

-- CreateIndex
CREATE INDEX `user_phone_idx` ON `user`(`phone`);
