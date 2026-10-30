-- ============================================================
-- DVLA CONSUMABLES RETURN SHEET — Complete Seed Data (from CONSUMABLES RETURN SHEET (1).xlsx)
-- ============================================================
SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ------------------------------------------------------------
-- 1. CONSUMABLE TYPES (Matching Excel Return Sheet Columns)
-- ------------------------------------------------------------
INSERT IGNORE INTO categories (name, code_prefix, purpose, is_active) VALUES
('Holo Patch',        'HOLO',  'printing', 1),
('Color Ribbon',      'CLR',   'printing', 1),
('MCC660 Holo Patch', 'MCCHP', 'printing', 1),
('MCC660 Clear',      'MCCCL', 'printing', 1),
('Black',             'BLK',   'printing', 1);

-- ------------------------------------------------------------
-- 2. DEFAULT ROLE ACCOUNTS (password for all: Admin@1234)
-- ------------------------------------------------------------
INSERT IGNORE INTO users (first_name, last_name, email, phone, password_hash, role, status, must_change_password) VALUES
('System',  'Administrator', 'admin@dvla.gov.gh',      '030-0000001', '$2b$12$/MxzEYz.3Sq/n6TWF4sRPeHNRoTBrTIPFv6lxOFzZgWN/bdauGR9q', 'Administrator',   'Active', 0),
('Richard', 'Anafo',         'issuer@dvla.gov.gh',     '030-0000002', '$2b$12$/MxzEYz.3Sq/n6TWF4sRPeHNRoTBrTIPFv6lxOFzZgWN/bdauGR9q', 'Store Officer',   'Active', 0),
('George',  'Adjei',         'requester@dvla.gov.gh',  '030-0000003', '$2b$12$/MxzEYz.3Sq/n6TWF4sRPeHNRoTBrTIPFv6lxOFzZgWN/bdauGR9q', 'Station Officer', 'Active', 0),
('Thomas',  'Owusu Manu',    'supervisor@dvla.gov.gh', '030-0000004', '$2b$12$/MxzEYz.3Sq/n6TWF4sRPeHNRoTBrTIPFv6lxOFzZgWN/bdauGR9q', 'Supervisor',      'Active', 0),
('Gideon',  'Odoom',         'viewer@dvla.gov.gh',     '030-0000005', '$2b$12$/MxzEYz.3Sq/n6TWF4sRPeHNRoTBrTIPFv6lxOFzZgWN/bdauGR9q', 'Viewer',          'Active', 0);

-- ------------------------------------------------------------
-- 3. INITIAL CONSUMABLE STOCKS (Opening & Restock Batches)
-- ------------------------------------------------------------
DELETE FROM consumable_stocks WHERE reference_number LIKE 'STK-2026-%';

INSERT INTO consumable_stocks
  (reference_number, date_received, category_id, consumable_name, quantity_added, supplier, batch_number, received_by, remarks)
VALUES
  ('STK-2026-0001', '2026-01-02', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        150, 'DVLA Central Store', 'BATCH-HP-2601',    'MR. RICHARD ANAFO', 'Q1 Opening Stock — Holo Patch'),
  ('STK-2026-0002', '2026-01-02', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      250, 'DVLA Central Store', 'BATCH-CR-2601',    'MR. RICHARD ANAFO', 'Q1 Opening Stock — Color Ribbon'),
  ('STK-2026-0003', '2026-01-03', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 150, 'DVLA Central Store', 'BATCH-MCCHP-2601', 'MR. RICHARD ANAFO', 'Q1 Opening Stock — MCC660 Holo Patch'),
  ('STK-2026-0004', '2026-01-03', (SELECT id FROM categories WHERE name = 'MCC660 Clear' LIMIT 1),      'MCC660 Clear',      80,  'DVLA Central Store', 'BATCH-MCCCL-2601', 'MR. RICHARD ANAFO', 'Q1 Opening Stock — MCC660 Clear'),
  ('STK-2026-0005', '2026-01-03', (SELECT id FROM categories WHERE name = 'Black' LIMIT 1),             'Black',             80,  'DVLA Central Store', 'BATCH-BLK-2601',   'MR. RICHARD ANAFO', 'Q1 Opening Stock — Black Ribbon'),
  ('STK-2026-0006', '2026-04-01', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        100, 'DVLA Procurement',   'BATCH-HP-2604',    'MR. RICHARD ANAFO', 'Q2 Restock Delivery'),
  ('STK-2026-0007', '2026-04-01', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      200, 'DVLA Procurement',   'BATCH-CR-2604',    'MR. RICHARD ANAFO', 'Q2 Restock Delivery'),
  ('STK-2026-0008', '2026-07-01', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 100, 'DVLA Procurement',   'BATCH-MCCHP-2607', 'MR. RICHARD ANAFO', 'Q3 Restock Delivery');

-- ------------------------------------------------------------
-- 4. FULL EXCEL CONSUMABLES RETURN SHEET RECORDS (Rows 6-66)
-- ------------------------------------------------------------
DELETE FROM consumable_requests WHERE reference_number LIKE 'REQ-2026-%';

INSERT INTO consumable_requests
  (reference_number, date_requested, category_id, consumable_name, quantity_requested, quantity_issued, issued_by, requested_by, received_by, date_returned, total_consumption, status, remarks)
VALUES
  ('REQ-2026-0001', '2026-01-06', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 2, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'GIDEON ODOOM', '2026-01-06', 552, 'Completed', NULL),
  ('REQ-2026-0002', '2026-01-13', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 4, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-01-13', 2019, 'Completed', NULL),
  ('REQ-2026-0003', '2026-01-13', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 0, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'GIDEON ODOOM', NULL, NULL, 'Issued', NULL),
  ('REQ-2026-0004', '2026-01-14', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 0, 29, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-01-14', 18617, 'Completed', NULL),
  ('REQ-2026-0005', '2026-01-14', (SELECT id FROM categories WHERE name = 'MCC660 Clear' LIMIT 1), 'MCC660 Clear', 0, 29, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-01-14', 0, 'Completed', NULL),
  ('REQ-2026-0006', '2026-01-14', (SELECT id FROM categories WHERE name = 'Black' LIMIT 1), 'Black', 0, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-01-14', 0, 'Completed', NULL),
  ('REQ-2026-0007', '2026-01-20', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 17, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-01-20', 16623, 'Completed', NULL),
  ('REQ-2026-0008', '2026-01-20', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', NULL, '2026-01-20', 10000, 'Completed', NULL),
  ('REQ-2026-0009', '2026-01-20', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', NULL, '2026-01-20', 5000, 'Completed', NULL),
  ('REQ-2026-0010', '2026-01-28', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 18, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'KWAKU OPOKU WARE', '2026-01-28', 17933, 'Completed', NULL),
  ('REQ-2026-0011', '2026-02-09', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 9, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-02-09', 8755, 'Completed', NULL),
  ('REQ-2026-0012', '2026-02-05', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 6, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-02-12', 3690, 'Completed', NULL),
  ('REQ-2026-0013', '2026-02-12', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 14, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-02-12', 13905, 'Completed', NULL),
  ('REQ-2026-0014', '2026-02-16', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 20, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-02-16', NULL, 'Issued', NULL),
  ('REQ-2026-0015', '2026-02-17', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 13, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-02-17', 12911, 'Completed', NULL),
  ('REQ-2026-0016', '2026-02-20', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 24, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-02-20', 14356, 'Completed', NULL),
  ('REQ-2026-0017', '2026-02-20', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 15, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-02-20', 14484, 'Completed', NULL),
  ('REQ-2026-0018', '2026-03-04', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 14, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-03-04', NULL, 'Issued', NULL),
  ('REQ-2026-0019', '2026-03-10', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 11, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-03-10', 6357, 'Completed', NULL),
  ('REQ-2026-0020', '2026-03-11', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 6, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-03-11', 5440, 'Completed', NULL),
  ('REQ-2026-0021', '2026-03-17', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 4, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODUM', '2026-03-17', 3131, 'Completed', NULL),
  ('REQ-2026-0022', '2026-03-16', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 7, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-03-16', 6581, 'Completed', NULL),
  ('REQ-2026-0023', '2026-03-19', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 31, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-04-08', 31000, 'Completed', NULL),
  ('REQ-2026-0024', '2026-03-26', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 1, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-03-26', 516, 'Completed', NULL),
  ('REQ-2026-0025', '2026-03-26', (SELECT id FROM categories WHERE name = 'Black' LIMIT 1), 'Black', 0, 10, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-03-26', 0, 'Completed', NULL),
  ('REQ-2026-0026', '2026-04-05', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 20, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-04-07', 24347, 'Completed', NULL),
  ('REQ-2026-0027', '2026-04-05', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 0, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-04-07', 0, 'Completed', NULL),
  ('REQ-2026-0028', '2026-04-05', (SELECT id FROM categories WHERE name = 'MCC660 Clear' LIMIT 1), 'MCC660 Clear', 0, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-04-07', 0, 'Completed', NULL),
  ('REQ-2026-0029', '2026-04-13', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 16, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'GIDEON ODOOM', '2026-04-20', 10144, 'Completed', NULL),
  ('REQ-2026-0030', '2026-04-15', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 6, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-04-15', 19989, 'Completed', NULL),
  ('REQ-2026-0031', '2026-04-15', (SELECT id FROM categories WHERE name = 'Black' LIMIT 1), 'Black', 0, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-04-15', 0, 'Completed', NULL),
  ('REQ-2026-0032', '2026-04-20', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 2, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'GIDEON ODOOM', '2026-04-29', 1203, 'Completed', NULL),
  ('REQ-2026-0033', '2026-04-29', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 4, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'KWAKU OPOKU WARE', '2026-04-29', 4000, 'Completed', NULL),
  ('REQ-2026-0034', '2026-05-05', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 4, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'YAKUBU HIDAYAATU', '2026-05-05', 3931, 'Completed', NULL),
  ('REQ-2026-0035', '2026-05-05', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 6, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'YAKUBU HIDAYAATU', '2026-05-05', 5061, 'Completed', NULL),
  ('REQ-2026-0036', '2026-05-08', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 2, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'OWUSU GODFRED TWUM', '2026-05-08', 2150, 'Completed', NULL),
  ('REQ-2026-0037', '2026-05-29', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 1, 'MR. RICHARD ANAFO', 'GEORGE ADJEI', 'GIDEON ODOOM', '2026-05-29', 606, 'Completed', NULL),
  ('REQ-2026-0038', '2026-06-10', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 4, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-06-16', 3941, 'Completed', NULL),
  ('REQ-2026-0039', '2026-06-10', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 1, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-06-11', 605, 'Completed', NULL),
  ('REQ-2026-0040', '2026-06-12', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 1, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'ASIAMAH SAMUEL OPKU', '2026-06-17', 602, 'Completed', NULL),
  ('REQ-2026-0041', '2026-06-15', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 10, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-06-23', 9493, 'Completed', NULL),
  ('REQ-2026-0042', '2026-06-17', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 2, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-06-17', 1626, 'Completed', NULL),
  ('REQ-2026-0043', '2026-06-22', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 0, 24, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-06-22', 32855, 'Completed', NULL),
  ('REQ-2026-0044', '2026-06-23', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 11, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-06-23', 20926, 'Completed', NULL),
  ('REQ-2026-0045', '2026-07-07', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 2, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-07-07', 1212, 'Completed', NULL),
  ('REQ-2026-0046', '2026-07-09', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 4, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'YAKUBU HIDAYAATU', '2026-07-13', 4000, 'Completed', NULL),
  ('REQ-2026-0047', '2026-07-10', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 0, 20, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-07-10', 32855, 'Completed', NULL),
  ('REQ-2026-0048', '2026-07-13', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 3, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-07-13', 2749, 'Completed', NULL),
  ('REQ-2026-0049', '2026-07-21', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 0, 25, 'MR. RICHARD ANAFO', 'NANA KWAME GYAPONG', 'OWUSU GODFRED TWUM', '2026-06-22', 12520, 'Completed', NULL),
  ('REQ-2026-0050', '2026-07-21', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 2, 'MR. RICHARD ANAFO', 'NANA KWAME GYAPONG', 'OWUSU GODFRED TWUM', '2026-07-22', 2391, 'Completed', NULL),
  ('REQ-2026-0051', '2026-08-04', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 2, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'GIDEON ODOOM', '2026-08-05', 2458, 'Completed', NULL),
  ('REQ-2026-0052', '2026-08-06', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 0, 25, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'GIDEON ODOOM', '2026-09-11', 10325, 'Completed', NULL),
  ('REQ-2026-0053', '2026-08-19', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 31, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'OWUSU GODFRED TWUM', '2026-08-31', 30649, 'Completed', NULL),
  ('REQ-2026-0054', '2026-08-19', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 2, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'OWUSU GODFRED TWUM', '2026-08-24', 1556, 'Completed', NULL),
  ('REQ-2026-0055', '2026-08-19', (SELECT id FROM categories WHERE name = 'Black' LIMIT 1), 'Black', 0, 10, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'OWUSU GODFRED TWUM', '2026-08-24', 0, 'Completed', NULL),
  ('REQ-2026-0056', '2026-08-24', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 10, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'GIDEON ODOOM', NULL, 6016, 'Completed', NULL),
  ('REQ-2026-0057', '2026-08-31', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 22, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'OWUSU GODFRED TWUM', '2026-08-31', 21962, 'Completed', NULL),
  ('REQ-2026-0058', '2026-09-07', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 18, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'OWUSU GODFRED TWUM', '2026-09-15', NULL, 'Issued', NULL),
  ('REQ-2026-0059', '2026-09-08', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 13, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'GIDEON ODOOM', '2026-09-11', 7836, 'Completed', NULL),
  ('REQ-2026-0060', '2026-09-14', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 7, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'GIDEON ODOOM', '2026-09-17', 4212, 'Completed', NULL),
  ('REQ-2026-0061', '2026-09-15', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 20, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'OWUSU GODFRED TWUM', '2026-09-15', 19991, 'Completed', NULL),
  ('REQ-2026-0062', '2026-09-22', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 6, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-09-22', 7370, 'Completed', NULL),
  ('REQ-2026-0063', '2026-09-22', (SELECT id FROM categories WHERE name = 'Black' LIMIT 1), 'Black', 0, 10, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM', '2026-09-22', 90278, 'Completed', NULL),
  ('REQ-2026-0064', '2026-09-24', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 0, 6, 'MR. RICHARD ANAFO', '', 'GIDEON ODOOM', '2026-09-30', 2980, 'Completed', NULL),
  ('REQ-2026-0065', '2026-09-24', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 28, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'OWUSU GODFRED TWUM', '2026-10-13', 28000, 'Completed', NULL),
  ('REQ-2026-0066', '2026-09-30', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 0, 20, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'GIDEON ODOOM', NULL, 9782, 'Completed', NULL),
  ('REQ-2026-0067', '2025-10-14', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1), 'Color Ribbon', 0, 26, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM', '2026-10-26', 24983, 'Completed', NULL),
  ('REQ-2026-0068', '2026-10-26', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1), 'Holo Patch', 0, 6, 'MR. RICHARD ANAFO', 'BRIGHT GYABAAH', 'GIDEON ODOOM', '2026-10-28', 3664, 'Completed', NULL);

INSERT IGNORE INTO system_migrations (migration_key) VALUES
  ('return_sheet_v1'),
  ('rbac_default_users_v1'),
  ('cleanup_unused_tables_and_full_seed_v2'),
  ('consumable_stocks_v1'),
  ('fix_return_sheet_exact_mapping_v3'),
  ('sync_consumables_return_sheet_xlsx_v4');

SET foreign_key_checks = 1;
