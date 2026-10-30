import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
  // eslint-disable-next-line no-var
  var _schemaInitialized: Promise<void> | undefined;
}

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "dvla_user",
    password: process.env.DB_PASSWORD || "dvla_pass",
    database: process.env.DB_NAME || "dvla_consumables",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "+00:00",
    dateStrings: true,
  });
}

// Singleton: reuse pool across hot-reloads in dev
const pool = globalThis._mysqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis._mysqlPool = pool;
}

export { pool };

const DEFAULT_CONSUMABLE_TYPES = [
  { name: "Holo Patch", code_prefix: "HOLO", purpose: "printing" },
  { name: "Color Ribbon", code_prefix: "CLR", purpose: "printing" },
  { name: "MCC660 Holo Patch", code_prefix: "MCCHP", purpose: "printing" },
  { name: "MCC660 Clear", code_prefix: "MCCCL", purpose: "printing" },
  { name: "Black", code_prefix: "BLK", purpose: "printing" },
];

export const FULL_EXCEL_SEED_ROWS: Array<{
  ref: string;
  date_requested: string;
  consumable_name: string;
  quantity_requested: number;
  quantity_issued: number | null;
  issued_by: string | null;
  requested_by: string;
  received_by: string | null;
  date_returned: string | null;
  total_consumption: number | null;
  status: "Pending Issue" | "Issued" | "Completed";
  remarks?: string | null;
}> = [
  {"ref":"REQ-2026-0001","date_requested":"2026-01-06","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":2,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"GIDEON ODOOM","date_returned":"2026-01-06","total_consumption":552,"status":"Completed"},
  {"ref":"REQ-2026-0002","date_requested":"2026-01-13","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":4,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-01-13","total_consumption":2019,"status":"Completed"},
  {"ref":"REQ-2026-0003","date_requested":"2026-01-13","consumable_name":"MCC660 Holo Patch","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"GIDEON ODOOM","date_returned":null,"total_consumption":null,"status":"Issued"},
  {"ref":"REQ-2026-0004","date_requested":"2026-01-14","consumable_name":"MCC660 Holo Patch","quantity_requested":0,"quantity_issued":29,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-01-14","total_consumption":18617,"status":"Completed"},
  {"ref":"REQ-2026-0005","date_requested":"2026-01-14","consumable_name":"MCC660 Clear","quantity_requested":0,"quantity_issued":29,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-01-14","total_consumption":0,"status":"Completed"},
  {"ref":"REQ-2026-0006","date_requested":"2026-01-14","consumable_name":"Black","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-01-14","total_consumption":0,"status":"Completed"},
  {"ref":"REQ-2026-0007","date_requested":"2026-01-20","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":17,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-01-20","total_consumption":16623,"status":"Completed"},
  {"ref":"REQ-2026-0008","date_requested":"2026-01-20","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":null,"date_returned":"2026-01-20","total_consumption":10000,"status":"Completed"},
  {"ref":"REQ-2026-0009","date_requested":"2026-01-20","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":null,"date_returned":"2026-01-20","total_consumption":5000,"status":"Completed"},
  {"ref":"REQ-2026-0010","date_requested":"2026-01-28","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":18,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"KWAKU OPOKU WARE","date_returned":"2026-01-28","total_consumption":17933,"status":"Completed"},
  {"ref":"REQ-2026-0011","date_requested":"2026-02-09","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":9,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-02-09","total_consumption":8755,"status":"Completed"},
  {"ref":"REQ-2026-0012","date_requested":"2026-02-05","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":6,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-02-12","total_consumption":3690,"status":"Completed"},
  {"ref":"REQ-2026-0013","date_requested":"2026-02-12","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":14,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-02-12","total_consumption":13905,"status":"Completed"},
  {"ref":"REQ-2026-0014","date_requested":"2026-02-16","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":20,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-02-16","total_consumption":null,"status":"Issued"},
  {"ref":"REQ-2026-0015","date_requested":"2026-02-17","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":13,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-02-17","total_consumption":12911,"status":"Completed"},
  {"ref":"REQ-2026-0016","date_requested":"2026-02-20","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":24,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-02-20","total_consumption":14356,"status":"Completed"},
  {"ref":"REQ-2026-0017","date_requested":"2026-02-20","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":15,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-02-20","total_consumption":14484,"status":"Completed"},
  {"ref":"REQ-2026-0018","date_requested":"2026-03-04","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":14,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-03-04","total_consumption":null,"status":"Issued"},
  {"ref":"REQ-2026-0019","date_requested":"2026-03-10","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":11,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-03-10","total_consumption":6357,"status":"Completed"},
  {"ref":"REQ-2026-0020","date_requested":"2026-03-11","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":6,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-03-11","total_consumption":5440,"status":"Completed"},
  {"ref":"REQ-2026-0021","date_requested":"2026-03-17","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":4,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODUM","date_returned":"2026-03-17","total_consumption":3131,"status":"Completed"},
  {"ref":"REQ-2026-0022","date_requested":"2026-03-16","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":7,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-03-16","total_consumption":6581,"status":"Completed"},
  {"ref":"REQ-2026-0023","date_requested":"2026-03-19","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":31,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-04-08","total_consumption":31000,"status":"Completed"},
  {"ref":"REQ-2026-0024","date_requested":"2026-03-26","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":1,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-03-26","total_consumption":516,"status":"Completed"},
  {"ref":"REQ-2026-0025","date_requested":"2026-03-26","consumable_name":"Black","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-03-26","total_consumption":0,"status":"Completed"},
  {"ref":"REQ-2026-0026","date_requested":"2026-04-05","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":20,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-04-07","total_consumption":24347,"status":"Completed"},
  {"ref":"REQ-2026-0027","date_requested":"2026-04-05","consumable_name":"MCC660 Holo Patch","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-04-07","total_consumption":0,"status":"Completed"},
  {"ref":"REQ-2026-0028","date_requested":"2026-04-05","consumable_name":"MCC660 Clear","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-04-07","total_consumption":0,"status":"Completed"},
  {"ref":"REQ-2026-0029","date_requested":"2026-04-13","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":16,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"GIDEON ODOOM","date_returned":"2026-04-20","total_consumption":10144,"status":"Completed"},
  {"ref":"REQ-2026-0030","date_requested":"2026-04-15","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":6,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-04-15","total_consumption":19989,"status":"Completed"},
  {"ref":"REQ-2026-0031","date_requested":"2026-04-15","consumable_name":"Black","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-04-15","total_consumption":0,"status":"Completed"},
  {"ref":"REQ-2026-0032","date_requested":"2026-04-20","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":2,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"GIDEON ODOOM","date_returned":"2026-04-29","total_consumption":1203,"status":"Completed"},
  {"ref":"REQ-2026-0033","date_requested":"2026-04-29","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":4,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"KWAKU OPOKU WARE","date_returned":"2026-04-29","total_consumption":4000,"status":"Completed"},
  {"ref":"REQ-2026-0034","date_requested":"2026-05-05","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":4,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"YAKUBU HIDAYAATU","date_returned":"2026-05-05","total_consumption":3931,"status":"Completed"},
  {"ref":"REQ-2026-0035","date_requested":"2026-05-05","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":6,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"YAKUBU HIDAYAATU","date_returned":"2026-05-05","total_consumption":5061,"status":"Completed"},
  {"ref":"REQ-2026-0036","date_requested":"2026-05-08","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":2,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-05-08","total_consumption":2150,"status":"Completed"},
  {"ref":"REQ-2026-0037","date_requested":"2026-05-29","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":1,"issued_by":"MR. RICHARD ANAFO","requested_by":"GEORGE ADJEI","received_by":"GIDEON ODOOM","date_returned":"2026-05-29","total_consumption":606,"status":"Completed"},
  {"ref":"REQ-2026-0038","date_requested":"2026-06-10","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":4,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-06-16","total_consumption":3941,"status":"Completed"},
  {"ref":"REQ-2026-0039","date_requested":"2026-06-10","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":1,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-06-11","total_consumption":605,"status":"Completed"},
  {"ref":"REQ-2026-0040","date_requested":"2026-06-12","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":1,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"ASIAMAH SAMUEL OPKU","date_returned":"2026-06-17","total_consumption":602,"status":"Completed"},
  {"ref":"REQ-2026-0041","date_requested":"2026-06-15","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-06-23","total_consumption":9493,"status":"Completed"},
  {"ref":"REQ-2026-0042","date_requested":"2026-06-17","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":2,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-06-17","total_consumption":1626,"status":"Completed"},
  {"ref":"REQ-2026-0043","date_requested":"2026-06-22","consumable_name":"MCC660 Holo Patch","quantity_requested":0,"quantity_issued":24,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-06-22","total_consumption":32855,"status":"Completed"},
  {"ref":"REQ-2026-0044","date_requested":"2026-06-23","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":11,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-06-23","total_consumption":20926,"status":"Completed"},
  {"ref":"REQ-2026-0045","date_requested":"2026-07-07","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":2,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-07-07","total_consumption":1212,"status":"Completed"},
  {"ref":"REQ-2026-0046","date_requested":"2026-07-09","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":4,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"YAKUBU HIDAYAATU","date_returned":"2026-07-13","total_consumption":4000,"status":"Completed"},
  {"ref":"REQ-2026-0047","date_requested":"2026-07-10","consumable_name":"MCC660 Holo Patch","quantity_requested":0,"quantity_issued":20,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-07-10","total_consumption":32855,"status":"Completed"},
  {"ref":"REQ-2026-0048","date_requested":"2026-07-13","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":3,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-07-13","total_consumption":2749,"status":"Completed"},
  {"ref":"REQ-2026-0049","date_requested":"2026-07-21","consumable_name":"MCC660 Holo Patch","quantity_requested":0,"quantity_issued":25,"issued_by":"MR. RICHARD ANAFO","requested_by":"NANA KWAME GYAPONG","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-06-22","total_consumption":12520,"status":"Completed"},
  {"ref":"REQ-2026-0050","date_requested":"2026-07-21","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":2,"issued_by":"MR. RICHARD ANAFO","requested_by":"NANA KWAME GYAPONG","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-07-22","total_consumption":2391,"status":"Completed"},
  {"ref":"REQ-2026-0051","date_requested":"2026-08-04","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":2,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"GIDEON ODOOM","date_returned":"2026-08-05","total_consumption":2458,"status":"Completed"},
  {"ref":"REQ-2026-0052","date_requested":"2026-08-06","consumable_name":"MCC660 Holo Patch","quantity_requested":0,"quantity_issued":25,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"GIDEON ODOOM","date_returned":"2026-09-11","total_consumption":10325,"status":"Completed"},
  {"ref":"REQ-2026-0053","date_requested":"2026-08-19","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":31,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-08-31","total_consumption":30649,"status":"Completed"},
  {"ref":"REQ-2026-0054","date_requested":"2026-08-19","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":2,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-08-24","total_consumption":1556,"status":"Completed"},
  {"ref":"REQ-2026-0055","date_requested":"2026-08-19","consumable_name":"Black","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-08-24","total_consumption":0,"status":"Completed"},
  {"ref":"REQ-2026-0056","date_requested":"2026-08-24","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"GIDEON ODOOM","date_returned":null,"total_consumption":6016,"status":"Completed"},
  {"ref":"REQ-2026-0057","date_requested":"2026-08-31","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":22,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-08-31","total_consumption":21962,"status":"Completed"},
  {"ref":"REQ-2026-0058","date_requested":"2026-09-07","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":18,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-09-15","total_consumption":null,"status":"Issued"},
  {"ref":"REQ-2026-0059","date_requested":"2026-09-08","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":13,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"GIDEON ODOOM","date_returned":"2026-09-11","total_consumption":7836,"status":"Completed"},
  {"ref":"REQ-2026-0060","date_requested":"2026-09-14","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":7,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"GIDEON ODOOM","date_returned":"2026-09-17","total_consumption":4212,"status":"Completed"},
  {"ref":"REQ-2026-0061","date_requested":"2026-09-15","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":20,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-09-15","total_consumption":19991,"status":"Completed"},
  {"ref":"REQ-2026-0062","date_requested":"2026-09-22","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":6,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-09-22","total_consumption":7370,"status":"Completed"},
  {"ref":"REQ-2026-0063","date_requested":"2026-09-22","consumable_name":"Black","quantity_requested":0,"quantity_issued":10,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"GIDEON ODOOM","date_returned":"2026-09-22","total_consumption":90278,"status":"Completed"},
  {"ref":"REQ-2026-0064","date_requested":"2026-09-24","consumable_name":"MCC660 Holo Patch","quantity_requested":0,"quantity_issued":6,"issued_by":"MR. RICHARD ANAFO","requested_by":"","received_by":"GIDEON ODOOM","date_returned":"2026-09-30","total_consumption":2980,"status":"Completed"},
  {"ref":"REQ-2026-0065","date_requested":"2026-09-24","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":28,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-10-13","total_consumption":28000,"status":"Completed"},
  {"ref":"REQ-2026-0066","date_requested":"2026-09-30","consumable_name":"MCC660 Holo Patch","quantity_requested":0,"quantity_issued":20,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"GIDEON ODOOM","date_returned":null,"total_consumption":9782,"status":"Completed"},
  {"ref":"REQ-2026-0067","date_requested":"2025-10-14","consumable_name":"Color Ribbon","quantity_requested":0,"quantity_issued":26,"issued_by":"MR. RICHARD ANAFO","requested_by":"THOMAS OWUSU MANU","received_by":"OWUSU GODFRED TWUM","date_returned":"2026-10-26","total_consumption":24983,"status":"Completed"},
  {"ref":"REQ-2026-0068","date_requested":"2026-10-26","consumable_name":"Holo Patch","quantity_requested":0,"quantity_issued":6,"issued_by":"MR. RICHARD ANAFO","requested_by":"BRIGHT GYABAAH","received_by":"GIDEON ODOOM","date_returned":"2026-10-28","total_consumption":3664,"status":"Completed"},
];

async function initReturnSheetSchema(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_migrations (
        migration_key VARCHAR(100) PRIMARY KEY,
        applied_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name         VARCHAR(100) NOT NULL,
        code_prefix  VARCHAR(20) NOT NULL DEFAULT '',
        purpose      ENUM('standard','printing') NOT NULL DEFAULT 'printing',
        is_active    TINYINT(1) NOT NULL DEFAULT 1,
        created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_category_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
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
        KEY idx_date_requested (date_requested),
        KEY idx_category_id (category_id),
        KEY idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
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
        KEY idx_audit_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Check if cleanup of unused tables + full Excel seed v2 has been applied
    const [migV2] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT migration_key FROM system_migrations WHERE migration_key = 'cleanup_unused_tables_and_full_seed_v2'`
    );

    if (migV2.length === 0) {
      await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

      // Drop legacy foreign keys on users table if they exist
      for (const fkName of ["fk_user_station", "fk_user_department"]) {
        try {
          await conn.query(`ALTER TABLE users DROP FOREIGN KEY ${fkName}`);
        } catch {
          // Foreign key already absent
        }
      }

      // Drop unused columns on users table if they exist
      for (const colName of ["station_id", "department_id"]) {
        try {
          await conn.query(`ALTER TABLE users DROP COLUMN ${colName}`);
        } catch {
          // Column already absent
        }
      }

      // Drop all unused / legacy tables from the database
      const unusedTables = [
        "notifications",
        "stock_movements",
        "stock_issues",
        "stock_receipts",
        "consumable_batches",
        "consumables",
        "reconciliations",
        "yield_reconciliations",
        "movements",
        "batches",
        "receipts",
        "issues",
        "stations",
        "departments",
      ];
      for (const tbl of unusedTables) {
        await conn.query(`DROP TABLE IF EXISTS \`${tbl}\``);
      }

      await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

      // Ensure 5 core Consumable Types exist and are active
      for (const ct of DEFAULT_CONSUMABLE_TYPES) {
        const [existingCat] = await conn.query<mysql.RowDataPacket[]>(
          `SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1`,
          [ct.name]
        );
        if (existingCat.length === 0) {
          await conn.query(
            `INSERT INTO categories (name, code_prefix, purpose, is_active) VALUES (?, ?, ?, 1)`,
            [ct.name, ct.code_prefix, ct.purpose]
          );
        } else {
          await conn.query(
            `UPDATE categories SET is_active = 1, name = ? WHERE id = ?`,
            [ct.name, existingCat[0].id]
          );
        }
      }

      // Deactivate legacy non-sheet category names
      await conn.query(
        `UPDATE categories SET is_active = 0 WHERE name IN ('YMCK', 'Colour Ribbon', 'Black Ribbon', 'Toner', 'Printer Ink', 'Other Consumables')`
      );

      // Ensure 5 default RBAC role accounts exist (Password: Admin@1234)
      const defaultHash = "$2b$12$/MxzEYz.3Sq/n6TWF4sRPeHNRoTBrTIPFv6lxOFzZgWN/bdauGR9q";
      const defaultUsers = [
        { first_name: "System", last_name: "Administrator", email: "admin@dvla.gov.gh", role: "Administrator" },
        { first_name: "Richard", last_name: "Anafo", email: "issuer@dvla.gov.gh", role: "Store Officer" },
        { first_name: "George", last_name: "Adjei", email: "requester@dvla.gov.gh", role: "Station Officer" },
        { first_name: "Thomas", last_name: "Owusu Manu", email: "supervisor@dvla.gov.gh", role: "Supervisor" },
        { first_name: "Gideon", last_name: "Odoom", email: "viewer@dvla.gov.gh", role: "Viewer" },
      ];

      for (const u of defaultUsers) {
        await conn.query(
          `INSERT IGNORE INTO users
            (first_name, last_name, email, password_hash, role, status, must_change_password)
           VALUES (?, ?, ?, ?, ?, 'Active', 0)`,
          [u.first_name, u.last_name, u.email, defaultHash, u.role]
        );
      }

      // Push all 44 Excel Return Sheet rows (upserting by reference_number)
      const [catRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT id, name FROM categories WHERE is_active = 1`
      );
      const catMap = new Map<string, number>();
      for (const r of catRows) {
        catMap.set(String(r.name).toLowerCase(), Number(r.id));
      }

      for (const row of FULL_EXCEL_SEED_ROWS) {
        const catId = catMap.get(row.consumable_name.toLowerCase()) ?? null;
        const [existingReq] = await conn.query<mysql.RowDataPacket[]>(
          `SELECT id FROM consumable_requests WHERE reference_number = ? LIMIT 1`,
          [row.ref]
        );
        if (existingReq.length > 0) {
          await conn.query(
            `UPDATE consumable_requests
             SET date_requested = ?,
                 category_id = ?,
                 consumable_name = ?,
                 quantity_requested = ?,
                 quantity_issued = ?,
                 issued_by = ?,
                 requested_by = ?,
                 received_by = ?,
                 date_returned = ?,
                 total_consumption = ?,
                 status = ?
             WHERE id = ?`,
            [
              row.date_requested,
              catId,
              row.consumable_name,
              row.quantity_requested,
              row.quantity_issued,
              row.issued_by,
              row.requested_by,
              row.received_by,
              row.date_returned,
              row.total_consumption,
              row.status,
              existingReq[0].id,
            ]
          );
        } else {
          await conn.query(
            `INSERT INTO consumable_requests
              (reference_number, date_requested, category_id, consumable_name,
               quantity_requested, quantity_issued, issued_by, requested_by,
               received_by, date_returned, total_consumption, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.ref,
              row.date_requested,
              catId,
              row.consumable_name,
              row.quantity_requested,
              row.quantity_issued,
              row.issued_by,
              row.requested_by,
              row.received_by,
              row.date_returned,
              row.total_consumption,
              row.status,
            ]
          );
        }
      }

      await conn.query(
        `INSERT IGNORE INTO system_migrations (migration_key) VALUES ('return_sheet_v1'), ('rbac_default_users_v1'), ('cleanup_unused_tables_and_full_seed_v2')`
      );
    }

    // Seed initial consumable_stocks batches if not yet seeded
    const [stockMig] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT migration_key FROM system_migrations WHERE migration_key = 'consumable_stocks_v1'`
    );
    if (stockMig.length === 0) {
      const [catRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT id, name FROM categories WHERE is_active = 1`
      );
      const catMap = new Map<string, number>();
      for (const r of catRows) {
        catMap.set(String(r.name).toLowerCase(), Number(r.id));
      }

      const initialStocks = [
        { ref: "STK-2026-0001", date_received: "2026-01-02", consumable_name: "Holo Patch", quantity_added: 150, supplier: "DVLA Central Store", batch_number: "BATCH-HP-2601", received_by: "MR. RICHARD ANAFO", remarks: "Q1 Opening Stock — Holo Patch" },
        { ref: "STK-2026-0002", date_received: "2026-01-02", consumable_name: "Color Ribbon", quantity_added: 250, supplier: "DVLA Central Store", batch_number: "BATCH-CR-2601", received_by: "MR. RICHARD ANAFO", remarks: "Q1 Opening Stock — Color Ribbon" },
        { ref: "STK-2026-0003", date_received: "2026-01-03", consumable_name: "MCC660 Holo Patch", quantity_added: 250, supplier: "DVLA Central Store", batch_number: "BATCH-MCCHP-2601", received_by: "MR. RICHARD ANAFO", remarks: "Q1 Opening Stock — MCC660 Holo Patch" },
        { ref: "STK-2026-0004", date_received: "2026-01-03", consumable_name: "MCC660 Clear", quantity_added: 80, supplier: "DVLA Central Store", batch_number: "BATCH-MCCCL-2601", received_by: "MR. RICHARD ANAFO", remarks: "Q1 Opening Stock — MCC660 Clear" },
        { ref: "STK-2026-0005", date_received: "2026-01-03", consumable_name: "Black", quantity_added: 80, supplier: "DVLA Central Store", batch_number: "BATCH-BLK-2601", received_by: "MR. RICHARD ANAFO", remarks: "Q1 Opening Stock — Black Ribbon" },
        { ref: "STK-2026-0006", date_received: "2026-04-01", consumable_name: "Holo Patch", quantity_added: 100, supplier: "DVLA Procurement", batch_number: "BATCH-HP-2604", received_by: "MR. RICHARD ANAFO", remarks: "Q2 Restock Delivery" },
        { ref: "STK-2026-0007", date_received: "2026-04-01", consumable_name: "Color Ribbon", quantity_added: 200, supplier: "DVLA Procurement", batch_number: "BATCH-CR-2604", received_by: "MR. RICHARD ANAFO", remarks: "Q2 Restock Delivery" },
      ];

      for (const s of initialStocks) {
        const catId = catMap.get(s.consumable_name.toLowerCase()) ?? null;
        await conn.query(
          `INSERT IGNORE INTO consumable_stocks
            (reference_number, date_received, category_id, consumable_name, quantity_added, supplier, batch_number, received_by, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.ref, s.date_received, catId, s.consumable_name, s.quantity_added, s.supplier, s.batch_number, s.received_by, s.remarks]
        );
      }

      await conn.query(
        `INSERT IGNORE INTO system_migrations (migration_key) VALUES ('consumable_stocks_v1')`
      );
    }

    // Sync exact 68 records from CONSUMABLES RETURN SHEET (1).xlsx with quantity_requested = 0 (v4)
    const [migV4] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT migration_key FROM system_migrations WHERE migration_key = 'sync_consumables_return_sheet_xlsx_v4'`
    );
    if (migV4.length === 0) {
      const [catRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT id, name FROM categories WHERE is_active = 1`
      );
      const catMap = new Map<string, number>();
      for (const r of catRows) {
        catMap.set(String(r.name).toLowerCase(), Number(r.id));
      }

      // Remove previous seeded REQ-2026-% entries and re-insert exact 68 rows from CONSUMABLES RETURN SHEET (1).xlsx
      await conn.query(`DELETE FROM consumable_requests WHERE reference_number LIKE 'REQ-2026-%'`);

      for (const row of FULL_EXCEL_SEED_ROWS) {
        const catId = catMap.get(row.consumable_name.toLowerCase()) ?? null;
        await conn.query(
          `INSERT INTO consumable_requests
            (reference_number, date_requested, category_id, consumable_name,
             quantity_requested, quantity_issued, issued_by, requested_by,
             received_by, date_returned, total_consumption, status, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.ref,
            row.date_requested,
            catId,
            row.consumable_name,
            row.quantity_requested,
            row.quantity_issued,
            row.issued_by,
            row.requested_by,
            row.received_by,
            row.date_returned,
            row.total_consumption,
            row.status,
            row.remarks ?? null,
          ]
        );
      }

      // Ensure stock batches cover the full 68-row issued quantities
      await conn.query(`UPDATE consumable_stocks SET quantity_added = 250 WHERE reference_number = 'STK-2026-0002'`);
      await conn.query(`UPDATE consumable_stocks SET quantity_added = 250 WHERE reference_number = 'STK-2026-0003'`);
      await conn.query(`UPDATE consumable_stocks SET quantity_added = 80 WHERE reference_number = 'STK-2026-0005'`);
      await conn.query(`UPDATE consumable_stocks SET quantity_added = 200 WHERE reference_number = 'STK-2026-0007'`);

      await conn.query(
        `INSERT IGNORE INTO system_migrations (migration_key) VALUES ('fix_return_sheet_exact_mapping_v3'), ('sync_consumables_return_sheet_xlsx_v4')`
      );
    }
  } catch (err) {
    console.error("Schema initialization warning:", err);
  } finally {
    conn.release();
  }
}

export async function ensureSchema(): Promise<void> {
  if (!globalThis._schemaInitialized) {
    globalThis._schemaInitialized = initReturnSheetSchema();
  }
  await globalThis._schemaInitialized;
}

// Convenience wrapper — returns rows typed as T[]
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  await ensureSchema();
  const [rows] = await pool.execute(sql, params as any);
  return rows as T[];
}

// Single-row fetch
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

// Execute (INSERT / UPDATE / DELETE) — returns ResultSetHeader
export async function execute(
  sql: string,
  params?: any[]
): Promise<mysql.ResultSetHeader> {
  await ensureSchema();
  const [result] = await pool.execute(sql, params as any);
  return result as mysql.ResultSetHeader;
}
