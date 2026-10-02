# System Process Flow Documentation
## Driver and Vehicle Licensing Authority (DVLA) — Consumables Management & Card Production System

---

### Document Control
- **Document Title:** System Process Flow & Workflow Architecture
- **Version:** 1.0.0
- **Date:** September 25, 2026
- **Status:** Approved
- **Applicable System:** DVLA Consumables Management System

---

## 1. Executive Summary & Master Lifecycle

The **DVLA Consumables Management & Card Production System** governs the operational workflow for license printing supplies and office consumables from vendor intake to card printing yield reconciliation.

### 1.1 Master Stock Lifecycle Overview

```
[ Vendor / Supplier Delivery ]
              |
              v
     1. STOCK INTAKE (ReceiveStockModal)
        - Logs delivery with Auto-GRN Number
        - Increments available stock balance
              |
              v
     2. CONSUMABLES INVENTORY REGISTER
        - Tracks live balances across stations
        - Triggers Low Stock Alerts when Balance <= Reorder Level
              |
              v
     3. STOCK ISSUANCE (IssueStockModal)
        - Dispatches stock to Stations / Printing Labs
        - Captures Expected Card Production Output
        - Decrements stock balance & creates Pending Batch
              |
              v
     4. CARD PRODUCTION & PRINTING
        - License cards printed on dye-sublimation printers
        - Damaged/Recaptured cards logged by printing operators
              |
              v
     5. BATCH RECONCILIATION (ReconciliationModal)
        - Reconciles Issued vs. Printed vs. Damaged cards
        - Computes Yield (%) and Waste (%) metrics
        - Closes batch audit trail as Reconciled
```

---

## 2. Process Flow Details

### Process Flow 1: New Consumable Item Registration

#### Description
Registers a new consumable item (e.g., YMCK Ribbon, Smart Card Blanks, Laminate Film) into the central database via `AddConsumableModal`.

#### Flow Sequence Diagram

```
Actor (Store Officer)          Modal UI                        Backend API & DB
      |                           |                                   |
      |-- 1. Click "Add Consumable"->|                                   |
      |                           |-- 2. GET /api/categories & stations->|
      |                           |<-- 3. Return Lookups -------------|
      |-- 4. Select Category ---->|                                   |
      |                           |-- 5. Auto-generate Item Code ---->|
      |-- 6. Fill Form Fields --->|                                   |
      |-- 7. Click "Save Record"->|                                   |
      |                           |-- 8. POST /api/consumables ------>|
      |                           |      (Insert item & opening GRN)  |
      |                           |<-- 9. 201 Created Response -------|
      |                           |-- 10. Close Modal & Refresh Grid->|
```

#### Detailed Steps
1. **Trigger:** Store officer clicks the **"Add Consumable"** button on the Consumables Inventory page (`app/consumables/page.tsx`).
2. **Modal Invocation:** `AddConsumableModal` opens with dimensions `sm:max-w-4xl` and `overflow-x-hidden`.
3. **Lookup Loading:** The modal automatically fetches active categories, stations, and departments from `/api/categories`, `/api/stations`, and `/api/departments`.
4. **Code Generation:** When a category is selected, the system generates a formatted code using the category prefix (e.g. `CARD-482`, `RIBB-109`).
5. **Form Entry:** The user inputs item name, unit of measure, initial quantity, reorder level, max target level, assigned station, department, default supplier, and description.
6. **Validation:** Client checks that name, category, item code, and reorder level are provided.
7. **Database Persistence:** Sends JSON payload to `POST /api/consumables`.
   - Inserts record into `consumables` table.
   - If initial quantity > 0, automatically creates an opening stock receipt in `stock_receipts` and logs entry in `stock_movements`.
8. **UI Completion:** Displays success message, closes the modal after 1.2 seconds, and calls `onSuccess` callback to refresh the inventory grid without page reload.

---

### Process Flow 2: Stock Intake & Delivery Receipts

#### Description
Logs incoming shipments of consumables delivered by suppliers with automated Goods Received Note (GRN) generation via `ReceiveStockModal`.

#### Flow Sequence Diagram

```
Actor (Receiving Clerk)        Modal UI                        Backend API & DB
      |                           |                                   |
      |-- 1. Click "Receive Stock"->|                                 |
      |                           |-- 2. GET /api/consumables ------->|
      |                           |<-- 3. Return Items & Balances ----|
      |                           |-- 4. Auto-generate GRN Reference->|
      |-- 5. Select Item & Qty -->|                                   |
      |-- 6. Enter Supplier Name->|                                   |
      |-- 7. Click "Save Record"->|                                   |
      |                           |-- 8. POST /api/receipts --------->|
      |                           |      BEGIN TRANSACTION            |
      |                           |      - Insert stock_receipts      |
      |                           |      - UPDATE consumables         |
      |                           |        SET received = received + Q|
      |                           |            balance = balance + Q  |
      |                           |      - Insert stock_movements     |
      |                           |      COMMIT TRANSACTION           |
      |                           |<-- 9. 200 OK (new balance) -------|
      |                           |-- 10. Close Modal & Update Grid ->|
```

#### Detailed Steps
1. **Trigger:** User clicks **"Receive Stock"** on the Dashboard overview or Consumables page.
2. **Modal Invocation:** `ReceiveStockModal` opens in a full `sm:max-w-4xl` dialog with `overflow-x-hidden`.
3. **GRN Auto-Generation:** The system generates a GRN reference (e.g. `GRN-2026-8391`).
4. **Item Selection & Balance Preview:** Selecting an item displays its category and current available balance.
5. **Data Input:** User inputs quantity received, date received, supplier name, receiving station, department, delivery condition (Good/Damaged/Partial), and notes.
6. **Execution (`POST /api/receipts`):**
   - Database executes inside a transaction.
   - Creates `stock_receipts` record.
   - Atomically updates `consumables` (`received = received + qty`, `balance = balance + qty`).
   - Inserts audit trail log in `stock_movements`.
7. **Result:** Success banner displays new balance; modal closes and refreshes parent table view.

---

### Process Flow 3: Stock Issuance & Expected Output Logging

#### Description
Dispatches consumable items from store to regional stations or card printing centers via `IssueStockModal`. Captures forecasted card production output (`expected_quantity`).

#### Flow Sequence Diagram

```
Actor (Store Officer)          Modal UI                        Backend API & DB
      |                           |                                   |
      |-- 1. Click "Issue Stock"->|                                   |
      |                           |-- 2. Fetch Items & Lookups ------->|
      |-- 3. Select Item & Qty -->|                                   |
      |-- 4. Input Expected Output|                                   |
      |-- 5. Select Station/Dept->|                                   |
      |-- 6. Click "Submit Issue"->|                                   |
      |                           |-- 7. POST /api/issues ------------>|
      |                           |      Validate (Qty <= Balance)    |
      |                           |      BEGIN TRANSACTION            |
      |                           |      - Insert stock_issues        |
      |                           |      - UPDATE consumables balance |
      |                           |      - Create Pending batch in    |
      |                           |        card_printing_batches      |
      |                           |      COMMIT TRANSACTION           |
      |                           |<-- 8. 200 OK (issue reference) ---|
      |                           |-- 9. Close Modal & Refresh Grid -->|
```

#### Detailed Steps
1. **Trigger:** User clicks **"Issue Stock"** in the UI.
2. **Form Organization:** Form is rendered in paired grid pairs:
   - Pair 1: Consumable Item & Quantity Issued
   - Pair 2: Expected Quantity (Card Output) & Date Issued
   - Pair 3: Reference Number (`ISS-YYYY-XXXX`) & Destination Station
   - Pair 4: Destination Department & Receiving Officer
   - Pair 5: Issuance Purpose & Remarks
3. **Stock Check:** Client & server verify that `quantity_issued <= current_balance`.
4. **Expected Card Output:** User inputs `expected_quantity` (the estimated cards to produce from this stock).
5. **Execution (`POST /api/issues`):**
   - Decrements `balance` and increments `issued` in `consumables`.
   - Inserts `stock_issues` record.
   - Creates a linked `card_printing_batches` record with status `Pending`.
6. **Result:** Data table reloaded showing new issue entry and pending batch status.

---

### Process Flow 4: Card Production Batch Reconciliation

#### Description
Station officers reconcile issued card-printing materials against actual driver's license cards produced, damaged, or recaptured using `ReconciliationModal`.

#### Flow Sequence Diagram

```
Actor (Station Officer)        Modal UI                        Backend API & DB
      |                           |                                   |
      |-- 1. Click Reconcile Icon>|                                   |
      |   (FileSignature icon)    |-- 2. GET /api/issues/[id] -------->|
      |                           |<-- 3. Return Issue & Batch Data --|
      |                           |                                   |
      |                           |-- 4. Display Expected Cards ------|
      |-- 5. Enter Printed Cards->|                                   |
      |-- 6. Enter Damaged Cards->|                                   |
      |-- 7. Enter Recapture Cards|                                   |
      |                           |-- 8. Compute Real-time: ----------|
      |                           |      - Unaccounted Cards          |
      |                           |      - Yield %                    |
      |                           |      - Waste %                    |
      |-- 9. Click "Save &        |                                   |
      |      Reconcile Batch" --->|                                   |
      |                           |-- 10. PUT /api/batches/[id] ------>|
      |                           |       Update status to Reconciled |
      |                           |       Store yield & waste %       |
      |                           |<-- 11. 200 OK (Batch Reconciled) -|
      |                           |-- 12. Close Modal & Update Badge -|
```

#### Detailed Steps
1. **Trigger:** On the Dispatch table (`/categories`), user clicks the **Reconciliation Icon button** (`FileSignature` icon).
2. **Data Loading:** Modal loads batch details including Issued Quantity, Expected Cards, Station, and Date Issued.
3. **Data Entry:** User enters:
   - **Printed Cards:** Successfully produced driver's license cards.
   - **Damaged Cards:** Cards damaged during printing or lamination.
   - **Recapture Cards:** Cards spoiled due to applicant data recaptures.
   - **Reason for Damage & Notes.**
4. **Real-time Metrics:**
   $$\text{Unaccounted Cards} = \text{Quantity Issued} - \text{Printed Cards} - \text{Damaged Cards} - \text{Recapture Cards}$$
   $$\text{Yield \%} = \left(\frac{\text{Printed Cards}}{\text{Quantity Issued}}\right) \times 100$$
   $$\text{Waste \%} = \left(\frac{\text{Damaged Cards}}{\text{Quantity Issued}}\right) \times 100$$
5. **Execution (`PUT /api/batches/[id]`):** Updates batch status to `Reconciled` and updates yield/waste metrics.
6. **Result:** Badge changes from `Pending` (Amber) to `Reconciled` (Green).

---

### Process Flow 5: Low Stock Monitoring & Alert Workflow

#### Description
Automated engine checking stock thresholds and notifying store officers when items fall below reorder levels.

```
[ Stock Issuance Executed ]
            |
            v
[ Balance Decremented ]
            |
            v
     Is Balance <= Reorder Level?
            |
    +-------+-------+
    |               |
   YES              NO
    |               |
    v               v
Set Status to   Keep Status
"LOW STOCK"     "IN STOCK"
or "OUT OF STOCK"   |
    |               +--> (End)
    v
Generate System Notification
& Highlight Badge (Orange/Red)
    |
    v
Store Officer Action:
Triggers Reorder / Stock Intake
```

---

### Process Flow 6: Dispatch Table Pagination & Filtering Workflow

#### Description
Provides customizable data views with multi-option pagination (15, 25, 50, 75, 100 per page) and real-time filtering.

```
+-----------------------------------------------------------------------+
|  User selects Page Size (Default: 15)  [Dropdown: 15 | 25 | 50 | 75 | 100] |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|  Calculate Pagination Math:                                           |
|  - Total Items = N                                                    |
|  - Total Pages = Math.ceil(Total Items / Page Size)                   |
|  - Current Slice = [(Page - 1) * PageSize : Page * PageSize]          |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|  Render Table Rows + Navigation Controls ("Prev", "Next", "Page X of Y")|
+-----------------------------------------------------------------------+
```

---

## 3. Summary Matrix of System Modals & Workflows

| Modal Name | Trigger Location | Purpose | Key Inputs | Target API Route |
| :--- | :--- | :--- | :--- | :--- |
| **`AddConsumableModal`** | Consumables Page Header | Create new consumable catalog item | Name, Category, Unit, Reorder Level, Initial Qty, Station, Dept | `POST /api/consumables` |
| **`ReceiveStockModal`** | Dashboard Header / Consumables Page | Log incoming stock delivery | Item, Qty, Supplier, Date, GRN Reference, Condition | `POST /api/receipts` |
| **`IssueStockModal`** | Consumables Page / Action Buttons | Issue stock & log expected cards | Item, Qty Issued, Expected Cards, Station, Dept, Purpose | `POST /api/issues` |
| **`ReconciliationModal`** | Dispatch Table Row Icon | Reconcile printing output vs waste | Printed Cards, Damaged Cards, Recapture Cards, Notes | `PUT /api/batches/[id]` |
| **`ViewItemModal`** | Consumables Table Row Eye Icon | View item specs & batch history | N/A (Read-only view) | `GET /api/consumables/[id]` |
| **`EditItemModal`** | Consumables Table Row Edit Icon | Update item details | Name, Category, Station, Department, Reorder Level | `PUT /api/consumables/[id]` |

---

*End of System Process Flow Documentation.*
