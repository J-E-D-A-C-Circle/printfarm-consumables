-- ============================================================
-- DVLA CONSUMABLES RETURN SHEET — Complete Seed Data
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
-- 3. FULL EXCEL CONSUMABLES RETURN SHEET RECORDS (Rows 6-47)
-- ------------------------------------------------------------
INSERT IGNORE INTO consumable_requests
  (reference_number, date_requested, category_id, consumable_name, quantity_requested, quantity_issued, issued_by, requested_by, received_by, date_returned, total_consumption, status)
VALUES
  ('REQ-2026-0001', '2026-01-06', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        2,  2,  'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'GIDEON ODOOM',        '2026-01-06', 552,   'Completed'),
  ('REQ-2026-0002', '2026-01-13', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        4,  4,  'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'OWUSU GODFRED TWUM',  '2026-01-13', 2019,  'Completed'),
  ('REQ-2026-0003', '2026-01-13', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 10, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'GIDEON ODOOM',        NULL,         NULL,  'Issued'),
  ('REQ-2026-0004', '2026-01-14', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 29, 39, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'OWUSU GODFRED TWUM',  '2026-01-14', 16617, 'Completed'),
  ('REQ-2026-0005', '2026-01-20', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      17, 17, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'OWUSU GODFRED TWUM',  '2026-01-20', 16623, 'Completed'),
  ('REQ-2026-0006', '2026-01-20', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      10, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'GIDEON ODOOM',        '2026-01-20', 10000, 'Completed'),
  ('REQ-2026-0007', '2026-01-20', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        10, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'GIDEON ODOOM',        '2026-01-20', 5000,  'Completed'),
  ('REQ-2026-0008', '2026-01-26', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      18, 18, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'KWAKU OPOKU WARE',    '2026-01-28', 17933, 'Completed'),
  ('REQ-2026-0009', '2026-02-09', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      9,  9,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-02-09', 8755,  'Completed'),
  ('REQ-2026-0010', '2026-02-05', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        6,  6,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-02-12', 3890,  'Completed'),
  ('REQ-2026-0011', '2026-02-12', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      14, 14, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'OWUSU GODFRED TWUM',  '2026-02-12', 13905, 'Completed'),
  ('REQ-2026-0012', '2026-02-16', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        20, 20, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-02-16', NULL,  'Issued'),
  ('REQ-2026-0013', '2026-02-17', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      13, 13, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-02-17', 12911, 'Completed'),
  ('REQ-2026-0014', '2026-02-20', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        24, 24, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-02-20', 14358, 'Completed'),
  ('REQ-2026-0015', '2026-02-20', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      15, 15, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-02-20', 14484, 'Completed'),
  ('REQ-2026-0016', '2026-03-04', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      14, 14, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-03-04', NULL,  'Issued'),
  ('REQ-2026-0017', '2026-03-10', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        11, 11, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-03-10', 6397,  'Completed'),
  ('REQ-2026-0018', '2026-03-11', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      6,  6,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-03-11', 5440,  'Completed'),
  ('REQ-2026-0019', '2026-03-17', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        4,  4,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-03-17', 3131,  'Completed'),
  ('REQ-2026-0020', '2026-03-16', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      7,  7,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-03-16', 6581,  'Completed'),
  ('REQ-2026-0021', '2026-03-19', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      31, 31, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-04-08', 31000, 'Completed'),
  ('REQ-2026-0022', '2026-03-26', (SELECT id FROM categories WHERE name = 'Black' LIMIT 1),             'Black',             10, 11, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-03-26', 516,   'Completed'),
  ('REQ-2026-0023', '2026-04-08', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        20, 40, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'OWUSU GODFRED TWUM',  '2026-04-07', 24347, 'Completed'),
  ('REQ-2026-0024', '2026-04-08', (SELECT id FROM categories WHERE name = 'MCC660 Clear' LIMIT 1),      'MCC660 Clear',      10, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'OWUSU GODFRED TWUM',  '2026-04-07', 12170, 'Completed'),
  ('REQ-2026-0025', '2026-04-13', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        16, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'GIDEON ODOOM',        '2026-04-20', 10144, 'Completed'),
  ('REQ-2026-0026', '2026-04-15', (SELECT id FROM categories WHERE name = 'Black' LIMIT 1),             'Black',             10, 10, 'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'OWUSU GODFRED TWUM',  '2026-04-15', 18659, 'Completed'),
  ('REQ-2026-0027', '2026-04-20', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        2,  2,  'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'GIDEON ODOOM',        '2026-04-29', 1203,  'Completed'),
  ('REQ-2026-0028', '2026-04-29', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      4,  4,  'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'KWAKU OPOKU WARE',    '2026-04-29', 4000,  'Completed'),
  ('REQ-2026-0029', '2026-05-05', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      4,  4,  'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'YAKUBU HIDAYAATU',    '2026-05-05', 3631,  'Completed'),
  ('REQ-2026-0030', '2026-05-05', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      6,  5,  'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'YAKUBU HIDAYAATU',    '2026-05-05', 5081,  'Completed'),
  ('REQ-2026-0031', '2026-05-05', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      6,  2,  'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'OWUSU GODFRED TWUM',  '2026-05-08', 2150,  'Completed'),
  ('REQ-2026-0032', '2026-05-08', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        2,  1,  'MR. RICHARD ANAFO', 'GEORGE ADJEI',      'GIDEON ODOOM',        '2026-05-29', 606,   'Completed'),
  ('REQ-2026-0033', '2026-05-29', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        1,  4,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-06-16', 3941,  'Completed'),
  ('REQ-2026-0034', '2026-06-10', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      4,  1,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-06-11', 805,   'Completed'),
  ('REQ-2026-0035', '2026-06-10', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        1,  1,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'ASIAMAH SAMUEL OPOKU','2026-06-17', 602,   'Completed'),
  ('REQ-2026-0036', '2026-06-12', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        1,  10, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-06-23', 9463,  'Completed'),
  ('REQ-2026-0037', '2026-06-15', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      10, 2,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-06-17', 1626,  'Completed'),
  ('REQ-2026-0038', '2026-06-17', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        2,  24, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-06-23', 32955, 'Completed'),
  ('REQ-2026-0039', '2026-06-22', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 24, 11, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-06-23', 20928, 'Completed'),
  ('REQ-2026-0040', '2026-06-23', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      11, 2,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'GIDEON ODOOM',        '2026-07-07', 1212,  'Completed'),
  ('REQ-2026-0041', '2026-07-07', (SELECT id FROM categories WHERE name = 'Holo Patch' LIMIT 1),        'Holo Patch',        2,  4,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'YAKUBU HIDAYAATU',    '2026-07-13', 4000,  'Completed'),
  ('REQ-2026-0042', '2026-07-09', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      4,  20, 'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-07-10', 32955, 'Completed'),
  ('REQ-2026-0043', '2026-07-10', (SELECT id FROM categories WHERE name = 'MCC660 Holo Patch' LIMIT 1), 'MCC660 Holo Patch', 20, 3,  'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', 'OWUSU GODFRED TWUM',  '2026-07-13', 2749,  'Completed'),
  ('REQ-2026-0044', '2026-07-13', (SELECT id FROM categories WHERE name = 'Color Ribbon' LIMIT 1),      'Color Ribbon',      3,  NULL,'MR. RICHARD ANAFO', 'THOMAS OWUSU MANU', NULL,                  NULL,         NULL,  'Pending Issue');

INSERT IGNORE INTO system_migrations (migration_key) VALUES
  ('return_sheet_v1'),
  ('rbac_default_users_v1'),
  ('cleanup_unused_tables_and_full_seed_v2');

SET foreign_key_checks = 1;
