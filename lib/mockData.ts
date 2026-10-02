export const categories = [
  "YMCK",
  "Holo Patch",
  "Colour Ribbon",
  "Black Ribbon",
  "MCC660 Holo Patch",
  "MCC660 Clear",
  "Toner",
  "Printer Ink",
  "Other Consumables"
];

export const stations = [
  "Head Office",
  "Accra",
  "Tema",
  "Kumasi",
  "Cape Coast",
  "Takoradi",
  "Tamale",
  "Ho",
  "Koforidua",
  "Sunyani",
  "Bolgatanga",
  "Wa"
];

export const departments = [
  "IT",
  "HR",
  "Finance",
  "Administration",
  "Procurement",
  "Operations",
  "Vehicle Registration",
  "Driver Licensing",
  "Roadworthiness",
  "Customer Service"
];

export const consumables = [
  {
    id: "CONS-001",
    name: "YMCK Ribbon",
    category: "YMCK",
    unit: "Roll",
    station: "Head Office",
    department: "IT",
    received: 200,
    issued: 155,
    balance: 45,
    reorderLevel: 50,
    status: "LOW STOCK"
  },
  {
    id: "CONS-002",
    name: "Holo Patch",
    category: "Holo Patch",
    unit: "Roll",
    station: "Accra",
    department: "Operations",
    received: 100,
    issued: 20,
    balance: 80,
    reorderLevel: 25,
    status: "IN STOCK"
  },

  {
    id: "CONS-004",
    name: "Toner Cartridge",
    category: "Toner",
    unit: "Piece",
    station: "Tema",
    department: "IT",
    received: 30,
    issued: 5,
    balance: 25,
    reorderLevel: 5,
    status: "IN STOCK"
  },

  {
    id: "CONS-006",
    name: "Driver License Cards",
    category: "Other Consumables",
    unit: "Pack",
    station: "Accra",
    department: "Driver Licensing",
    received: 1000,
    issued: 800,
    balance: 200,
    reorderLevel: 150,
    status: "IN STOCK"
  }
];

export const transactions = [
  {
    id: "TXN-001",
    date: "2026-09-10",
    item: "YMCK Ribbon",
    type: "Stock Issued",
    quantity: 5,
    from: "Central Stores",
    to: "Accra Station",
    officer: "John Doe",
    reference: "ISS-001",
    balance: 45
  },

  {
    id: "TXN-003",
    date: "2026-09-14",
    item: "Toner Cartridge",
    type: "Stock Adjustment",
    quantity: -1,
    from: "Tema",
    to: "N/A",
    officer: "Mike Ross",
    reference: "ADJ-001",
    balance: 25
  }
];

export const cardPrintingBatches = [
  {
    batchId: "CPB-2026-001",
    dateIssued: "2026-09-14",
    issuedTo: "Card Production Unit",
    consumableId: "CONS-006",
    consumableName: "Driver License Cards",
    quantityIssued: 200,
    status: "Pending", // Pending or Reconciled
    printedCards: 0,
    damagedCards: 0,
    recaptureCards: 0
  },
  {
    batchId: "CPB-2026-002",
    dateIssued: "2026-09-10",
    issuedTo: "External Vendor A",
    consumableId: "CONS-006",
    consumableName: "Driver License Cards",
    quantityIssued: 500,
    status: "Reconciled",
    printedCards: 485,
    damagedCards: 10,
    recaptureCards: 5
  },
  {
    batchId: "CPB-2026-003",
    dateIssued: "2026-09-15",
    issuedTo: "Card Production Unit (Accra)",
    consumableId: "CONS-001",
    consumableName: "YMCK Ribbon",
    quantityIssued: 50,
    status: "Pending",
    printedCards: 0,
    damagedCards: 0,
    recaptureCards: 0
  },
  {
    batchId: "CPB-2026-004",
    dateIssued: "2026-09-16",
    issuedTo: "Security Printing Division",
    consumableId: "CONS-002",
    consumableName: "Holo Patch",
    quantityIssued: 30,
    status: "Pending",
    printedCards: 0,
    damagedCards: 0,
    recaptureCards: 0
  },
  {
    batchId: "CPB-2026-005",
    dateIssued: "2026-09-16",
    issuedTo: "IT Print Unit",
    consumableId: "CONS-004",
    consumableName: "Toner Cartridge",
    quantityIssued: 10,
    status: "Pending",
    printedCards: 0,
    damagedCards: 0,
    recaptureCards: 0
  }
];

export interface CategoryDefault {
  station: string;
  department: string;
  purpose: "standard" | "printing";
  officer: string;
  codePrefix: string;
}

export const categoryDefaults: Record<string, CategoryDefault> = {
  "YMCK": {
    station: "Head Office",
    department: "IT",
    purpose: "printing",
    officer: "Kwame Mensah (Card Production)",
    codePrefix: "YMCK"
  },
  "Holo Patch": {
    station: "Accra",
    department: "Operations",
    purpose: "printing",
    officer: "Abena Osei (Security Print)",
    codePrefix: "HOLO"
  },
  "Colour Ribbon": {
    station: "Head Office",
    department: "IT",
    purpose: "printing",
    officer: "Kofi Annan (Print Room)",
    codePrefix: "CLR"
  },
  "Black Ribbon": {
    station: "Accra",
    department: "Driver Licensing",
    purpose: "printing",
    officer: "Akosua Nkrumah",
    codePrefix: "BLK"
  },
  "MCC660 Holo Patch": {
    station: "Head Office",
    department: "IT",
    purpose: "printing",
    officer: "Yaw Boateng",
    codePrefix: "MCC"
  },
  "MCC660 Clear": {
    station: "Head Office",
    department: "IT",
    purpose: "printing",
    officer: "Yaw Boateng",
    codePrefix: "MCCC"
  },
  "Toner": {
    station: "Tema",
    department: "IT",
    purpose: "standard",
    officer: "Mike Ross (IT Admin)",
    codePrefix: "TNR"
  },
  "Printer Ink": {
    station: "Kumasi",
    department: "Administration",
    purpose: "standard",
    officer: "Grace Appiah",
    codePrefix: "INK"
  },
  "Other Consumables": {
    station: "Accra",
    department: "Driver Licensing",
    purpose: "standard",
    officer: "Samuel Addo",
    codePrefix: "OTH"
  }
};

export function generateReferenceNumber(type: "issue" | "receive" = "issue", category?: string): string {
  const prefix = type === "receive" 
    ? "REC" 
    : (category && categoryDefaults[category]?.codePrefix ? `REQ-${categoryDefaults[category].codePrefix}` : "REQ");
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${year}-${randomSuffix}`;
}

export const userAccounts = [
  {
    id: "USR-001",
    name: "John Doe",
    email: "john.doe@dvla.gov.gh",
    role: "Administrator",
    station: "Head Office",
    department: "IT",
    status: "Active",
    lastLogin: "2026-09-16 08:30"
  },
  {
    id: "USR-002",
    name: "Mike Ross",
    email: "mike.ross@dvla.gov.gh",
    role: "Store Officer",
    station: "Tema",
    department: "IT",
    status: "Active",
    lastLogin: "2026-09-15 14:20"
  },
  {
    id: "USR-003",
    name: "Abena Osei",
    email: "abena.osei@dvla.gov.gh",
    role: "Station Officer",
    station: "Accra",
    department: "Operations",
    status: "Active",
    lastLogin: "2026-09-14 11:45"
  },
  {
    id: "USR-004",
    name: "Kwame Mensah",
    email: "kwame.mensah@dvla.gov.gh",
    role: "Supervisor",
    station: "Head Office",
    department: "Driver Licensing",
    status: "Active",
    lastLogin: "2026-09-12 09:15"
  },
  {
    id: "USR-005",
    name: "Grace Appiah",
    email: "grace.appiah@dvla.gov.gh",
    role: "Viewer",
    station: "Kumasi",
    department: "Administration",
    status: "Inactive",
    lastLogin: "2026-08-30 16:50"
  }
];

