-- ============================================================
-- DVLA CONSUMABLES MANAGEMENT — Seed Data
-- ============================================================
SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ------------------------------------------------------------
-- STATIONS
-- ------------------------------------------------------------
INSERT INTO stations (name, region, address, contact_phone, is_head_office) VALUES
('Head Office',  'Greater Accra', 'DVLA Headquarters, Accra',        '030-2222001', 1),
('Accra',        'Greater Accra', 'Accra Regional Office',           '030-2222002', 0),
('Tema',         'Greater Accra', 'Tema Regional Office',            '030-3033003', 0),
('Kumasi',       'Ashanti',       'Kumasi Regional Office',          '032-2022004', 0),
('Cape Coast',   'Central',       'Cape Coast Regional Office',      '033-2033005', 0),
('Takoradi',     'Western',       'Takoradi Regional Office',        '031-2022006', 0),
('Tamale',       'Northern',      'Tamale Regional Office',          '037-2020007', 0),
('Ho',           'Volta',         'Ho Regional Office',              '036-2020008', 0),
('Koforidua',    'Eastern',       'Koforidua Regional Office',       '034-2022009', 0),
('Sunyani',      'Bono',          'Sunyani Regional Office',         '035-2022010', 0),
('Bolgatanga',   'Upper East',    'Bolgatanga Regional Office',      '038-2021011', 0),
('Wa',           'Upper West',    'Wa Regional Office',              '039-2020012', 0);

-- ------------------------------------------------------------
-- DEPARTMENTS
-- ------------------------------------------------------------
INSERT INTO departments (name) VALUES
('IT'),
('HR'),
('Finance'),
('Administration'),
('Procurement'),
('Operations'),
('Vehicle Registration'),
('Driver Licensing'),
('Roadworthiness'),
('Customer Service');

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
INSERT INTO categories (name, code_prefix, purpose) VALUES
('YMCK',              'YMCK', 'printing'),
('Holo Patch',        'HOLO', 'printing'),
('Colour Ribbon',     'CLR',  'printing'),
('Black Ribbon',      'BLK',  'printing'),
('MCC660 Holo Patch', 'MCC',  'printing'),
('MCC660 Clear',      'MCCC', 'printing'),
('Toner',             'TNR',  'standard'),
('Printer Ink',       'INK',  'standard'),
('Other Consumables', 'OTH',  'standard');

-- ------------------------------------------------------------
-- ADMIN USER (password: Admin@1234)
-- bcrypt hash of 'Admin@1234' with salt rounds = 12
-- ------------------------------------------------------------
INSERT INTO users (first_name, last_name, email, phone, password_hash, role, station_id, department_id, status, must_change_password) VALUES
('System', 'Administrator', 'admin@dvla.gov.gh', '030-0000001',
 '$2b$12$/MxzEYz.3Sq/n6TWF4sRPeHNRoTBrTIPFv6lxOFzZgWN/bdauGR9q',
 'Administrator',
 (SELECT id FROM stations WHERE name = 'Head Office'),
 (SELECT id FROM departments WHERE name = 'IT'),
 'Active', 1);

-- ------------------------------------------------------------
-- SEED CONSUMABLES (matching mockData for continuity)
-- ------------------------------------------------------------
INSERT INTO consumables (item_code, name, category_id, unit, station_id, department_id, supplier_default, received, issued, balance, reorder_level, max_stock_level, status) VALUES
('CONS-001', 'YMCK Ribbon',
 (SELECT id FROM categories WHERE name = 'YMCK'),
 'Roll',
 (SELECT id FROM stations WHERE name = 'Head Office'),
 (SELECT id FROM departments WHERE name = 'IT'),
 '', 200, 155, 45, 50, 500, 'LOW STOCK'),

('CONS-002', 'Holo Patch',
 (SELECT id FROM categories WHERE name = 'Holo Patch'),
 'Roll',
 (SELECT id FROM stations WHERE name = 'Accra'),
 (SELECT id FROM departments WHERE name = 'Operations'),
 '', 100, 20, 80, 25, 300, 'IN STOCK'),

('CONS-004', 'Toner Cartridge',
 (SELECT id FROM categories WHERE name = 'Toner'),
 'Piece',
 (SELECT id FROM stations WHERE name = 'Tema'),
 (SELECT id FROM departments WHERE name = 'IT'),
 '', 30, 5, 25, 5, 100, 'IN STOCK'),

('CONS-006', 'Driver License Cards',
 (SELECT id FROM categories WHERE name = 'Other Consumables'),
 'Pack',
 (SELECT id FROM stations WHERE name = 'Accra'),
 (SELECT id FROM departments WHERE name = 'Driver Licensing'),
 '', 1000, 800, 200, 150, 2000, 'IN STOCK');

-- ------------------------------------------------------------
-- SEED CARD PRINTING BATCHES
-- ------------------------------------------------------------
INSERT INTO card_printing_batches (batch_code, consumable_id, date_issued, issued_to, quantity_issued, status, printed_cards, damaged_cards, recapture_cards) VALUES
('CPB-2026-001',
 (SELECT id FROM consumables WHERE item_code = 'CONS-006'),
 '2026-09-14', 'Card Production Unit', 200, 'Pending', 0, 0, 0),

('CPB-2026-002',
 (SELECT id FROM consumables WHERE item_code = 'CONS-006'),
 '2026-09-10', 'External Vendor A', 500, 'Reconciled', 485, 10, 5),

('CPB-2026-003',
 (SELECT id FROM consumables WHERE item_code = 'CONS-001'),
 '2026-09-15', 'Card Production Unit (Accra)', 50, 'Pending', 0, 0, 0),

('CPB-2026-004',
 (SELECT id FROM consumables WHERE item_code = 'CONS-002'),
 '2026-09-16', 'Security Printing Division', 30, 'Pending', 0, 0, 0),

('CPB-2026-005',
 (SELECT id FROM consumables WHERE item_code = 'CONS-004'),
 '2026-09-16', 'IT Print Unit', 10, 'Pending', 0, 0, 0);

SET foreign_key_checks = 1;
