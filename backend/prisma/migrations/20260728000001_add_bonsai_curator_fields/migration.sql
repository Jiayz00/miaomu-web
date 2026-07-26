-- Drop obsolete columns that are no longer in the Prisma schema
-- MySQL does not support `DROP COLUMN IF EXISTS`, use prepared statements instead
SET @dropCareLevel = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bonsais' AND COLUMN_NAME = 'care_level'
);
SET @dropSqlCare = IF(@dropCareLevel > 0, 'ALTER TABLE `bonsais` DROP COLUMN `care_level`', 'SELECT 1');
PREPARE stmt FROM @dropSqlCare;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @dropSpecies = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bonsais' AND COLUMN_NAME = 'species'
);
SET @dropSqlSpecies = IF(@dropSpecies > 0, 'ALTER TABLE `bonsais` DROP COLUMN `species`', 'SELECT 1');
PREPARE stmt FROM @dropSqlSpecies;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- AlterTable
ALTER TABLE `bonsais` ADD COLUMN `catalog_number` VARCHAR(50) NULL,
    ADD COLUMN `artistic_description` TEXT NULL,
    ADD COLUMN `era` VARCHAR(50) NULL,
    ADD COLUMN `material` VARCHAR(100) NULL,
    ADD COLUMN `pot_description` VARCHAR(255) NULL,
    ADD COLUMN `canopy_width` INT NULL,
    ADD COLUMN `dimensions` VARCHAR(100) NULL,
    ADD COLUMN `provenance` TEXT NULL,
    ADD COLUMN `exhibitions` JSON NULL;

-- CreateIndex
CREATE UNIQUE INDEX `bonsais_catalog_number_key` ON `bonsais`(`catalog_number`);
