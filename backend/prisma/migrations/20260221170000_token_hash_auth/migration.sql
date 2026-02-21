-- Move auth tokens to hash-only storage
ALTER TABLE `refresh_tokens`
  ADD COLUMN `token_hash` CHAR(64) NULL;

UPDATE `refresh_tokens`
SET `token_hash` = SHA2(`token`, 256)
WHERE `token` IS NOT NULL;

ALTER TABLE `refresh_tokens`
  MODIFY `token_hash` CHAR(64) NOT NULL,
  DROP INDEX `refresh_tokens_token_key`,
  ADD UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
  DROP COLUMN `token`;

ALTER TABLE `users`
  ADD COLUMN `password_reset_token_hash` CHAR(64) NULL;

UPDATE `users`
SET `password_reset_token_hash` = SHA2(`password_reset_token`, 256)
WHERE `password_reset_token` IS NOT NULL;

ALTER TABLE `users`
  DROP COLUMN `password_reset_token`;
