# Software Requirements Specification (SRS)
## Driver and Vehicle Licensing Authority (DVLA) — Consumables Management & Card Production Reconciliation System

---

### Document Information
- **System Name:** DVLA Consumables Management & Card Production System
- **Document Version:** 1.0.0
- **Date:** September 25, 2026
- **Status:** Approved / Active Release
- **Target Audience:** System Architects, Software Developers, Database Administrators, Quality Assurance Engineers, DVLA IT Steering Committee

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the complete functional, non-functional, database, and system interface requirements for the **DVLA Consumables Management & Card Production System**. The system provides centralized inventory control, stock intake (receipts), stock issuance, automated card production yield tracking, stock reconciliation, and reporting across all Driver and Vehicle Licensing Authority (DVLA) regional stations and departments in Ghana.

### 1.2 Scope
The scope of this web-based software application encompasses:
- **Centralized Consumables Register:** Multi-station, multi-department inventory tracking for card blanks, printer ribbons (YMCK/K-film), laminate films, cleaning kits, and general office consumables.
- **Stock Intake (Receipts):** Modal-driven stock receipt processing with automated Goods Received Note (GRN) code generation.
- **Stock Issuance:** Requisition-based stock issuance capturing expected card production outputs per issuance.
- **Card Production Batch Reconciliation:** Dedicated reconciliation workflows comparing expected card output against actual printed, damaged, and recapture cards with auto-computed yield (%) and waste (%) indicators.
- **Dispatch & Category Management:** Category configuration with custom code prefixes, dispatch transaction tracking, and dynamic multi-option table pagination (15, 25, 50, 75, 100 per page).
- **Audit & Analytics:** Real-time movement history, low stock notifications, audit logging, and card printing yield reporting.

### 1.3 Definitions, Acronyms, and Abbreviations
- **DVLA:** Driver and Vehicle Licensing Authority (Ghana)
- **GRN:** Goods Received Note (unique reference code for stock delivery receipts)
- **YMCK:** Yellow, Magenta, Cyan, Black (dye-sublimation printer ribbon used for printing driver's license cards)
- **Expected Quantity / Output:** The forecasted number of driver's license cards to be printed from an issued quantity of printing consumables.
- **Yield (%):** Percentage of successfully printed cards relative to the quantity of consumables issued (`[Printed Cards / Issued Quantity] * 100`).
- **Waste (%):** Percentage of spoiled or damaged card materials relative to the quantity of consumables issued (`[Damaged Cards / Issued Quantity] * 100`).
- **RBAC:** Role-Based Access Control
- **SRS:** Software Requirements Specification

### 1.4 Technology Stack Overview
- **Frontend Framework:** Next.js 16 (App Router with Turbopack), React 19, TypeScript
- **Styling & UI:** Vanilla CSS / Tailwind CSS, Lucide React Icon Library, Shadcn UI Components
- **Backend API:** Next.js API Routes / Node.js
- **Database:** MySQL 8.0 (Relational Database Management System)
- **Containerization:** Docker & Docker Compose (`dvla_app`, `dvla_mysql`, `dvla_phpmyadmin`)

---

## 2. Overall Description

### 2.1 Product Perspective & Operating Environment
The system operates as a responsive web app deployed within a containerized environment (Docker). Central store officers and station officers across regional DVLA centers interact with the application via modern web browsers (Chrome, Edge, Firefox, Safari).

```
+-----------------------------------------------------------------------------------+
|                            DVLA Web Client (Browser)                              |
+-----------------------------------------------------------------------------------+
                                          |
                                HTTP / HTTPS (REST API)
                                          v
+-----------------------------------------------------------------------------------+
|                        Next.js 16 Application Server                              |
|   +-------------------+    +----------------------+    +----------------------+   |
|   | Dashboard & UI    |    | API Routes & Logic   |    | Modal Dialog Controllers|
|   +-------------------+    +----------------------+    +----------------------+   |
+-----------------------------------------------------------------------------------+
                                          |
                              MySQL Protocol (Connection Pool)
                                          v
+-----------------------------------------------------------------------------------+
|                           MySQL 8.0 Database Container                            |
| (tables: consumables, stock_receipts, stock_issues, card_printing_batches, etc.)   |
+-----------------------------------------------------------------------------------+
```

### 2.2 Product Functions
1. **Consumable Item Registry & Modal Management:** Create, view, edit, archive, and monitor stock balance levels.
2. **Stock Intake (Modal Receive Stock):** Log incoming shipments from suppliers with auto-generated GRN references.
3. **Stock Issuance (Modal Issue Stock):** Record stock dispatched to stations/departments with mandatory `expected_quantity` entry for printing items.
4. **Card Production Reconciliation:** Icon-triggered modal form for logging printed, damaged, and recaptured cards; computes material efficiency.
5. **Categories & Dispatch Center:** Categorization of materials, dispatch logging, and customizable table pagination (15, 25, 50, 75, 100 per page).
6. **Stock Movements Audit:** Immutable ledger of every receipt, issue, and adjustment transaction.
7. **System Administration:** User account creation, role assignments, station and department hierarchy configuration.

### 2.3 User Classes and Characteristics
- **Administrator:** Full privileges to configure users, stations, departments, categories, and system parameters.
- **Supervisor:** Can authorize stock issues, approve reconciliations, and generate analytical yield reports.
- **Store Officer:** Manages daily inventory, records stock intake, processes stock issues, and registers new consumables.
- **Station Officer:** Views station-specific stock balances and submits reconciliation reports for card printing batches.
- **Viewer:** Read-only access to inventory lists and dashboards.

### 2.4 Design and Implementation Constraints
- **Modal Window Architecture:** All primary transactional forms (**Receive Stock**, **Issue Stock**, **Add Consumable**, **Edit Consumable**, **Reconcile Batch**, **View Item**) MUST open in modal dialogs (`DialogContent`).
- **Modal Sizing & No Side-Scrolling Rule:** Modal dialogs must use a standardized width (`sm:max-w-4xl w-full max-h-[90vh]`) and incorporate `overflow-x-hidden` and `overflow-y-auto` to strictly eliminate horizontal scrollbars.
- **Icon Actions:** Interactive table row actions (e.g., Reconciliation, Edit, View) must be presented as icon buttons with clear tooltips to maintain table grid spacing.
- **Pagination Standard:** Data tables must implement dynamic pagination defaulting to 15 items per page with dropdown choices of 15, 25, 50, 75, and 100 items.

---

## 3. System Features & Functional Requirements

### 3.1 Consumables Inventory Management
#### Description
Provides a live inventory register displaying item codes, descriptions, category, station, department, unit of measure, quantity received, quantity issued, current balance, and stock status (`IN STOCK`, `LOW STOCK`, `OUT OF STOCK`).

#### Functional Requirements
- **FR-1.1:** The system shall display a filterable table of all registered consumables with search by name, code, station, category, or status.
- **FR-1.2:** **Add Consumable Modal:** Clicking "Add Consumable" shall trigger a modal dialog (`AddConsumableModal`) containing:
  - Category dropdown (triggers auto-generated item code with prefix)
  - Item Code input with manual "Regenerate" button
  - Consumable Name
  - Unit of Measure (Roll, Box, Piece/Card, Pack, Cartridge, Ream, Gallon)
  - Initial Stock Quantity
  - Assigned Station & Department
  - Reorder Alert Level & Target Max Stock Level
  - Default Supplier & Technical Description
- **FR-1.3:** **View Item Modal:** Clicking the "Eye" icon shall open a modal detailing full item specifications and historical batch reconciliation history.
- **FR-1.4:** **Edit Item Modal:** Clicking the "Edit" icon shall open a modal dialog allowing updates to name, category, station, department, and reorder level.

---

### 3.2 Stock Intake & Delivery Receipts (Receive Stock Modal)
#### Description
Enables store officers to record delivery receipts when new consumable shipments arrive from vendors or suppliers.

#### Functional Requirements
- **FR-2.1:** **Receive Stock Modal:** Clicking "Receive Stock" anywhere in the system (Dashboard header or Consumables page) shall open `ReceiveStockModal`.
- **FR-2.2:** The form shall require:
  - Consumable Item selection (displaying live current balance)
  - Date Received (defaults to current date)
  - Quantity Received (must be >= 1)
  - Supplier / Vendor Name
  - Auto-generated Goods Received Note (GRN) number (format: `GRN-YYYY-XXXX`)
  - Receiving Station & Department
  - Delivery Condition (Good, Damaged, Partial)
  - Delivery Notes / Remarks
- **FR-2.3:** Upon submission, the backend API (`POST /api/receipts`) shall:
  - Insert a record into `stock_receipts`.
  - Atomically increase `received` and `balance` counts in `consumables`.
  - Record an entry in `stock_movements`.
  - Refresh the active UI data grid without requiring a full page reload.

---

### 3.3 Stock Issuance & Requisition (Issue Stock Modal)
#### Description
Handles stock dispatches from central storage to regional stations, departments, or card printing centers.

#### Functional Requirements
- **FR-3.1:** **Issue Stock Modal:** Clicking "Issue Stock" shall open `IssueStockModal`.
- **FR-3.2:** The issuance form fields shall be organized into paired grid sections:
  1. **Category & Item selection** (with live balance check)
  2. **Quantity Issued & Expected Quantity (Card Output)**
  3. **Date Issued & Requisition / Reference Number** (Auto-generated `ISS-YYYY-XXXX`)
  4. **Receiving Station & Department**
  5. **Receiving Officer & Issuance Purpose** (Standard, Card Printing, Maintenance, Training, Emergency)
  6. **Remarks / Issuance Notes**
- **FR-3.3:** **Expected Quantity Validation:** When issuing consumables under printing categories, the system MUST require input for `expected_quantity` (the forecasted card output).
- **FR-3.4:** Upon submission (`POST /api/issues`):
  - Check that quantity issued <= current available balance.
  - Decrement `balance` and increment `issued` in `consumables`.
  - Insert into `stock_issues`.
  - Automatically initialize a linked `card_printing_batches` record with status `Pending` when purpose is `printing` or item belongs to a card printing category.

---

### 3.4 Card Production Batch Reconciliation
#### Description
Provides tracking and audit reconciliation of issued card-printing materials against actual driver's license cards produced, damaged, or recaptured.

#### Functional Requirements
- **FR-4.1:** **Icon-Based Action:** The reconciliation trigger in the Dispatch table shall be displayed as a distinct action icon (`FileSignature` / pencil icon).
- **FR-4.2:** **Reconciliation Modal:** Clicking the reconcile icon shall open `ReconciliationModal`.
- **FR-4.3:** The modal shall display:
  - Batch / Requisition details (Consumable Name, Issued To, Date Issued, Quantity Issued, Expected Cards Output).
  - Input field for **Printed Cards** (successfully generated cards).
  - Input field for **Damaged Cards** (materials spoiled during production).
  - Input field for **Recapture Cards** (cards destroyed due to data recaptures).
  - Real-time calculation of **Unaccounted Materials** (`Issued - Printed - Damaged - Recapture`).
  - Real-time display of **Yield Percentage** (`(Printed / Issued) * 100`) and **Waste Percentage** (`(Damaged / Issued) * 100`).
  - Reason for Damage & Reconciliation Notes.
- **FR-4.4:** Upon clicking "Save & Reconcile Batch", `PUT /api/batches/[id]` shall update the batch status to `Reconciled` and record reconciliation timestamps and user IDs.

---

### 3.5 Category Configuration & Dispatch Table Pagination
#### Description
Allows administrators to manage consumable categories and monitor all dispatch logs with custom table pagination options.

#### Functional Requirements
- **FR-5.1:** **Category Setup:** Create and manage categories with custom code prefixes (e.g., `CARD`, `RIBB`, `FILM`, `PAPER`) used for automatic item coding.
- **FR-5.2:** **Dispatch Register:** Display all issued stock transactions with columns: Reference #, Consumable Item, Date, Issued To / Station, Purpose, Quantity Issued, Expected Cards, Batch Status, and Reconciliation Action Icon.
- **FR-5.3:** **Dynamic Pagination:**
  - Default page size: **15 items per page**.
  - Dropdown menu allowing selection of **15, 25, 50, 75, 100** items per page.
  - Page navigation controls ("Previous", "Next", "Page X of Y") with dynamic record counters.

---

## 4. Data Requirements & Database Schema

### 4.1 Schema Overview & Relationships

```
+----------------+          +-------------------+          +---------------------+
|   STATIONS     |<---------|    CONSUMABLES    |--------->|     CATEGORIES      |
+----------------+          +-------------------+          +---------------------+
  ^    ^                      ^      ^       ^
  |    |                      |      |       |
  |    +----------------------+      |       +-----------------------+
  |                           |      |                               |
+------------------+          |    +--------------------+    +-----------------------+
|  STOCK_RECEIPTS  |          |    |   STOCK_ISSUES     |    | CARD_PRINTING_BATCHES |
+------------------+          |    +--------------------+    +-----------------------+
                              |              |                           ^
                              |              +---------------------------+
                              +------------------------------------------+
```

### 4.2 Data Tables Definition

#### 1. `stations`
Stores DVLA national head office and regional station branches.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Station Identifier |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Station Name (e.g. 37 Accra, Kumasi, Tamale) |
| `region` | VARCHAR(100) | NOT NULL | Administrative Region |
| `is_head_office` | TINYINT(1) | DEFAULT 0 | Flag for Central Head Office |
| `is_active` | TINYINT(1) | DEFAULT 1 | Active status |

#### 2. `categories`
Categorizes consumables and defines coding prefixes.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Category Identifier |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Category Name (e.g., License Card Blanks, Ribbons) |
| `code_prefix` | VARCHAR(20) | NOT NULL | Code prefix for auto-generating item codes (e.g. CARD) |
| `purpose` | ENUM | 'standard', 'printing' | Category classification |

#### 3. `consumables`
The master inventory catalog of all tracked items.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Consumable Identifier |
| `item_code` | VARCHAR(50) | UNIQUE, NOT NULL | Unique Item Code (e.g. CARD-402) |
| `name` | VARCHAR(255) | NOT NULL | Item Name |
| `category_id` | INT UNSIGNED | FOREIGN KEY -> categories(id) | Category Reference |
| `unit` | VARCHAR(50) | NOT NULL | Unit of Measure |
| `received` | INT | DEFAULT 0 | Cumulative Total Received |
| `issued` | INT | DEFAULT 0 | Cumulative Total Issued |
| `balance` | INT | DEFAULT 0 | Current Available Stock Balance |
| `reorder_level` | INT | DEFAULT 0 | Low stock alert threshold |
| `status` | ENUM | 'IN STOCK', 'LOW STOCK', 'OUT OF STOCK' | Current Stock Status |

#### 4. `stock_receipts`
Logs stock delivery receipts (intake).
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Receipt Identifier |
| `grn_number` | VARCHAR(50) | UNIQUE, NOT NULL | Goods Received Note Reference |
| `consumable_id` | INT UNSIGNED | FOREIGN KEY -> consumables(id) | Consumable Reference |
| `quantity` | INT | NOT NULL | Received Quantity |
| `supplier` | VARCHAR(255) | NOT NULL | Vendor / Supplier Name |
| `date_received` | DATE | NOT NULL | Receipt Date |

#### 5. `stock_issues`
Logs dispatches of consumables to stations/departments.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Issue Identifier |
| `reference_number` | VARCHAR(50) | UNIQUE, NOT NULL | Issue Reference Number |
| `consumable_id` | INT UNSIGNED | FOREIGN KEY -> consumables(id) | Consumable Reference |
| `quantity` | INT | NOT NULL | Issued Quantity |
| `expected_quantity`| INT UNSIGNED | DEFAULT 0 | Expected Card Output |
| `to_station_id` | INT UNSIGNED | FOREIGN KEY -> stations(id) | Receiving Station |
| `receiving_officer`| VARCHAR(255) | NULLABLE | Officer receiving the stock |
| `date_issued` | DATE | NOT NULL | Issue Date |
| `balance_after` | INT | NOT NULL | Remaining Stock Balance after issue |

#### 6. `card_printing_batches`
Tracks card printing output, waste, and reconciliation.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Batch Identifier |
| `batch_code` | VARCHAR(50) | UNIQUE, NOT NULL | Batch Code |
| `consumable_id` | INT UNSIGNED | FOREIGN KEY -> consumables(id) | Consumable Reference |
| `issue_id` | INT UNSIGNED | FOREIGN KEY -> stock_issues(id) | Linked Issue Reference |
| `quantity_issued` | INT | NOT NULL | Quantity Issued |
| `expected_quantity`| INT UNSIGNED | DEFAULT 0 | Expected Cards Output |
| `status` | ENUM | 'Pending', 'Reconciled', 'Voided' | Reconciliation Status |
| `printed_cards` | INT | DEFAULT 0 | Successfully printed cards |
| `damaged_cards` | INT | DEFAULT 0 | Spoiled / damaged cards |
| `recapture_cards` | INT | DEFAULT 0 | Cards destroyed in recapture |
| `unaccounted` | INT (GENERATED)| STORED | `quantity_issued - printed - damaged - recapture` |
| `yield_percentage` | DECIMAL(5,2) | STORED | `(printed_cards / quantity_issued) * 100` |
| `waste_percentage` | DECIMAL(5,2) | STORED | `(damaged_cards / quantity_issued) * 100` |

---

## 5. Non-Functional Requirements

### 5.1 Performance & Scalability
- **Page Load Time:** Dashboard and table data pages shall load within 1.5 seconds under standard intranet conditions.
- **Database Query Efficiency:** All transactional queries shall utilize indexed foreign keys (`consumable_id`, `station_id`, `category_id`) to ensure response times < 100ms.
- **Concurrent Connections:** The MySQL connection pool shall handle up to 100 concurrent user sessions smoothly.

### 5.2 Security & Data Integrity
- **Transactional Consistency:** Stock receipts and issues MUST update stock balances inside database transactions to prevent race conditions or balance discrepancies.
- **Role-Based Access:** Standard users shall not be permitted to archive consumables or perform direct balance adjustments without Supervisor/Admin approval.
- **Input Sanitization:** All API inputs shall be validated against type and range rules before SQL query execution. Parameterized queries (`mysql2/promise`) are mandated to eliminate SQL injection risks.

### 5.3 Usability & User Experience (UX)
- **Modal Dialog Consistency:** All primary workflows (Receive, Issue, Add, Edit, Reconcile, View) operate inside standard modal dialogs, preventing context loss.
- **Zero Horizontal Side-Scroll:** All modal dialogs are styled with `sm:max-w-4xl w-full max-h-[90vh] overflow-x-hidden` so users never need to scroll horizontally.
- **Visual Status Indicators:** Color-coded badges for stock levels (`IN STOCK` = Green, `LOW STOCK` = Orange, `OUT OF STOCK` = Red) and reconciliation statuses (`Reconciled` = Green, `Pending` = Amber).

### 5.4 Maintainability & Deployment
- **Dockerized Environment:** The complete application stack is packaged into Docker services (`docker-compose.yml`) ensuring consistent deployment across development, testing, and production environments.
- **Database Migration Reliability:** Database schema changes are documented in idempotent SQL scripts (`database/schema.sql`).

---

## 6. Verification & Test Plan Matrix

| Requirement ID | Description | Verification Method | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **V-01** | Add Consumable Modal | User Interface Testing | Modal opens with `sm:max-w-4xl`, generates item code, and saves consumable record without page reload. |
| **V-02** | Stock Intake Modal | Functional API Testing | Submitting receipt updates `stock_receipts`, increments consumable `balance`, and logs movement. |
| **V-03** | Expected Quantity Input | Input Validation Testing | `expected_quantity` field accepts card output forecast and registers in `stock_issues` and linked batch. |
| **V-04** | Batch Reconciliation Icon | UI & Calculation Testing | Reconcile icon opens modal; yields, waste %, and unaccounted cards update dynamically. |
| **V-05** | Table Pagination | Navigation Testing | Table displays 15 rows by default; selector allows 15, 25, 50, 75, 100 per page with correct page counts. |
| **V-06** | Zero Side-Scroll Constraint | Responsive UI Inspection | Modal dialogs display zero horizontal scrollbars across desktop and mobile screens. |

---

*End of Software Requirements Specification Document.*
