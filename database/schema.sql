-- ============================================================
-- DVLA CONSUMABLES RETURN SYSTEM — Clean MySQL Schema
-- ============================================================
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_ENGINE_SUBSTITUTION';

-- Drop any unused / legacy tables if present
DROP TABLE IF EXISTS
  notifications,
  stock_movements,
  stock_issues,
  stock_receipts,
  consumable_batches,
  consumables,
  reconciliations,
  yield_reconciliations,
  movements,
  batches,
  receipts,
  issues,
  stations,
  departments;

-- ------------------------------------------------------------
-- 1. SYSTEM MIGRATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_migrations (
  migration_key VARCHAR(100) PRIMARY KEY,
  applied_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. CATEGORIES (Consumable Types in Return Sheet)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  code_prefix  VARCHAR(20) NOT NULL DEFAULT '',
  purpose      ENUM('standard','printing') NOT NULL DEFAULT 'printing',
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. USERS (Role-Based Access Control)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id            VARCHAR(50),
  first_name             VARCHAR(100) NOT NULL,
  last_name              VARCHAR(100) NOT NULL,
  email                  VARCHAR(255) NOT NULL,
  phone                  VARCHAR(20),
  password_hash          VARCHAR(255) NOT NULL,
  role                   ENUM('Administrator','Supervisor','Store Officer','Station Officer','Viewer') NOT NULL DEFAULT 'Viewer',
  status                 ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  must_change_password   TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at          DATETIME,
  failed_login_attempts  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until           DATETIME,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. CONSUMABLE STOCKS (Stock In / Inventory Additions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumable_stocks (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_number VARCHAR(50) NOT NULL,
  date_received    DATE NOT NULL,
  category_id      INT UNSIGNED DEFAULT NULL,
  consumable_name  VARCHAR(150) NOT NULL,
  quantity_added   INT NOT NULL DEFAULT 0,
  supplier         VARCHAR(255) DEFAULT NULL,
  batch_number     VARCHAR(100) DEFAULT NULL,
  received_by      VARCHAR(255) NOT NULL,
  remarks          TEXT DEFAULT NULL,
  created_by       INT UNSIGNED DEFAULT NULL,
  updated_by       INT UNSIGNED DEFAULT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stock_reference (reference_number),
  KEY idx_stock_date (date_received),
  KEY idx_stock_consumable (consumable_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. CONSUMABLE REQUESTS & PRODUCTION RETURN SHEET
-- Flow: Request Quantity -> Quantity Issued (Exact, More, or Less) -> Production Result (Date Returned & Total Consumption)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumable_requests (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_number   VARCHAR(50) NOT NULL,
  date_requested     DATE NOT NULL,
  category_id        INT UNSIGNED DEFAULT NULL,
  consumable_name    VARCHAR(150) NOT NULL,
  quantity_requested INT NOT NULL DEFAULT 0,
  quantity_issued    INT DEFAULT NULL,
  issued_by          VARCHAR(255) DEFAULT NULL,
  requested_by       VARCHAR(255) NOT NULL,
  received_by        VARCHAR(255) DEFAULT NULL,
  date_returned      DATE DEFAULT NULL,
  total_consumption  INT DEFAULT NULL,
  status             ENUM('Pending Issue', 'Issued', 'Completed') NOT NULL DEFAULT 'Pending Issue',
  remarks            TEXT DEFAULT NULL,
  created_by         INT UNSIGNED DEFAULT NULL,
  updated_by         INT UNSIGNED DEFAULT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reference_number (reference_number),
  KEY idx_date_requested (date_requested),
  KEY idx_category_id (category_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. AUDIT LOG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED,
  user_name    VARCHAR(255),
  action       VARCHAR(100) NOT NULL,
  table_name   VARCHAR(100),
  record_id    INT UNSIGNED,
  old_values   JSON,
  new_values   JSON,
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY fk_audit_user (user_id),
  KEY idx_audit_action (action),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
