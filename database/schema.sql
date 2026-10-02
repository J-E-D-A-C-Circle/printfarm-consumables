-- ============================================================
-- DVLA CONSUMABLES MANAGEMENT SYSTEM — MySQL Schema
-- ============================================================
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_ENGINE_SUBSTITUTION';

-- ------------------------------------------------------------
-- STATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stations (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  region         VARCHAR(100) NOT NULL DEFAULT '',
  address        TEXT,
  contact_phone  VARCHAR(20),
  is_head_office TINYINT(1) NOT NULL DEFAULT 0,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_station_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- DEPARTMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dept_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  code_prefix  VARCHAR(20) NOT NULL DEFAULT '',
  purpose      ENUM('standard','printing') NOT NULL DEFAULT 'standard',
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- USERS
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
  station_id             INT UNSIGNED,
  department_id          INT UNSIGNED,
  status                 ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  must_change_password   TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at          DATETIME,
  failed_login_attempts  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until           DATETIME,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email (email),
  KEY fk_user_station (station_id),
  KEY fk_user_department (department_id),
  CONSTRAINT fk_user_station FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE SET NULL,
  CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- CONSUMABLES (Item Registry)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumables (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_code         VARCHAR(50) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  category_id       INT UNSIGNED NOT NULL,
  unit              VARCHAR(50) NOT NULL DEFAULT 'Piece',
  station_id        INT UNSIGNED,
  department_id     INT UNSIGNED,
  supplier_default  VARCHAR(255),
  lead_time_days    INT UNSIGNED NOT NULL DEFAULT 0,
  received          INT NOT NULL DEFAULT 0,
  issued            INT NOT NULL DEFAULT 0,
  balance           INT NOT NULL DEFAULT 0,
  reorder_level     INT NOT NULL DEFAULT 0,
  max_stock_level   INT NOT NULL DEFAULT 9999,
  status            ENUM('IN STOCK','LOW STOCK','OUT OF STOCK') NOT NULL DEFAULT 'IN STOCK',
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  created_by        INT UNSIGNED,
  updated_by        INT UNSIGNED,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_item_code (item_code),
  KEY fk_cons_category (category_id),
  KEY fk_cons_station (station_id),
  KEY fk_cons_department (department_id),
  CONSTRAINT fk_cons_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT fk_cons_station FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE SET NULL,
  CONSTRAINT fk_cons_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- STOCK RECEIPTS (Receive Stock)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_receipts (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grn_number            VARCHAR(50) NOT NULL,
  po_number             VARCHAR(100),
  consumable_id         INT UNSIGNED NOT NULL,
  quantity              INT NOT NULL,
  supplier              VARCHAR(255) NOT NULL,
  station_id            INT UNSIGNED,
  department_id         INT UNSIGNED,
  delivery_condition    ENUM('Good','Damaged','Partial') NOT NULL DEFAULT 'Good',
  delivery_note_path    VARCHAR(500),
  remarks               TEXT,
  received_by_user_id   INT UNSIGNED,
  approved_by_user_id   INT UNSIGNED,
  date_received         DATE NOT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY fk_receipt_consumable (consumable_id),
  KEY fk_receipt_station (station_id),
  KEY fk_receipt_received_by (received_by_user_id),
  KEY fk_receipt_approved_by (approved_by_user_id),
  UNIQUE KEY uq_grn_number (grn_number),
  CONSTRAINT fk_receipt_consumable FOREIGN KEY (consumable_id) REFERENCES consumables (id),
  CONSTRAINT fk_receipt_station FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE SET NULL,
  CONSTRAINT fk_receipt_received_by FOREIGN KEY (received_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_receipt_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- CARD PRINTING BATCHES (pre-declared so stock_issues can FK it)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS card_printing_batches (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_code            VARCHAR(50) NOT NULL,
  consumable_id         INT UNSIGNED NOT NULL,
  issue_id              INT UNSIGNED,
  date_issued           DATE NOT NULL,
  issued_to             VARCHAR(255) NOT NULL,
  quantity_issued       INT NOT NULL,
  expected_quantity     INT UNSIGNED NOT NULL DEFAULT 0,
  status                ENUM('Pending','Reconciled','Voided') NOT NULL DEFAULT 'Pending',
  printed_cards         INT NOT NULL DEFAULT 0,
  damaged_cards         INT NOT NULL DEFAULT 0,
  recapture_cards       INT NOT NULL DEFAULT 0,
  unaccounted           INT GENERATED ALWAYS AS (quantity_issued - printed_cards - damaged_cards - recapture_cards) STORED,
  yield_percentage      DECIMAL(5,2) GENERATED ALWAYS AS (IF(quantity_issued > 0, (printed_cards / quantity_issued) * 100, 0)) STORED,
  waste_percentage      DECIMAL(5,2) GENERATED ALWAYS AS (IF(quantity_issued > 0, (damaged_cards / quantity_issued) * 100, 0)) STORED,
  reason_for_damage     VARCHAR(255),
  recapture_reason      TEXT,
  notes                 TEXT,
  supporting_doc_path   VARCHAR(500),
  reconciled_by_user_id INT UNSIGNED,
  witness_user_id       INT UNSIGNED,
  reconciled_at         DATETIME,
  date_of_reconciliation DATE,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_batch_code (batch_code),
  KEY fk_batch_consumable (consumable_id),
  KEY fk_batch_reconciled_by (reconciled_by_user_id),
  CONSTRAINT fk_batch_consumable FOREIGN KEY (consumable_id) REFERENCES consumables (id),
  CONSTRAINT fk_batch_reconciled_by FOREIGN KEY (reconciled_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_batch_witness FOREIGN KEY (witness_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- STOCK ISSUES (Issue Stock)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_issues (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_number      VARCHAR(50) NOT NULL,
  requisition_number    VARCHAR(100),
  consumable_id         INT UNSIGNED NOT NULL,
  quantity              INT NOT NULL,
  expected_quantity     INT UNSIGNED NOT NULL DEFAULT 0,
  from_station_id       INT UNSIGNED,
  to_station_id         INT UNSIGNED,
  department_id         INT UNSIGNED,
  purpose               ENUM('standard','printing','maintenance','training','emergency') NOT NULL DEFAULT 'standard',
  batch_id              INT UNSIGNED,
  receiving_officer     VARCHAR(255),
  issuing_user_id       INT UNSIGNED,
  authorized_by_user_id INT UNSIGNED,
  remarks               TEXT,
  date_issued           DATE NOT NULL,
  balance_after         INT NOT NULL DEFAULT 0,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reference_number (reference_number),
  KEY fk_issue_consumable (consumable_id),
  KEY fk_issue_from_station (from_station_id),
  KEY fk_issue_to_station (to_station_id),
  KEY fk_issue_batch (batch_id),
  CONSTRAINT fk_issue_consumable FOREIGN KEY (consumable_id) REFERENCES consumables (id),
  CONSTRAINT fk_issue_from_station FOREIGN KEY (from_station_id) REFERENCES stations (id) ON DELETE SET NULL,
  CONSTRAINT fk_issue_to_station FOREIGN KEY (to_station_id) REFERENCES stations (id) ON DELETE SET NULL,
  CONSTRAINT fk_issue_batch FOREIGN KEY (batch_id) REFERENCES card_printing_batches (id) ON DELETE SET NULL,
  CONSTRAINT fk_issue_issuing_user FOREIGN KEY (issuing_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_issue_authorized_by FOREIGN KEY (authorized_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK from batches.issue_id → stock_issues after both tables created
ALTER TABLE card_printing_batches
  ADD CONSTRAINT fk_batch_issue FOREIGN KEY (issue_id) REFERENCES stock_issues (id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- STOCK ADJUSTMENTS (Write-off, Transfer, Opening Balance, Reversal)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_number VARCHAR(50) NOT NULL,
  consumable_id    INT UNSIGNED NOT NULL,
  adjustment_type  ENUM('write-off','transfer','opening-balance','reversal','correction') NOT NULL,
  quantity_change  INT NOT NULL COMMENT 'Positive = add, Negative = subtract',
  reason           TEXT NOT NULL,
  station_id       INT UNSIGNED,
  approved_by      INT UNSIGNED,
  created_by       INT UNSIGNED NOT NULL,
  balance_after    INT NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_adj_reference (reference_number),
  KEY fk_adj_consumable (consumable_id),
  CONSTRAINT fk_adj_consumable FOREIGN KEY (consumable_id) REFERENCES consumables (id),
  CONSTRAINT fk_adj_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_adj_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  type        ENUM('low_stock','out_of_stock','pending_reconciliation','approval_required','stock_received','stock_issued','system') NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  link        VARCHAR(500),
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY fk_notif_user (user_id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- AUDIT LOG
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

-- ------------------------------------------------------------
-- IMPORT HISTORY
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_history (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  file_name       VARCHAR(255) NOT NULL,
  imported_by     INT UNSIGNED,
  total_rows      INT NOT NULL DEFAULT 0,
  valid_rows      INT NOT NULL DEFAULT 0,
  invalid_rows    INT NOT NULL DEFAULT 0,
  status          ENUM('success','partial','failed') NOT NULL DEFAULT 'success',
  error_details   JSON,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_import_user FOREIGN KEY (imported_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
