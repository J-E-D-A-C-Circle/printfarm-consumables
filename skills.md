DVLA CONSUMABLES MANAGEMENT SYSTEM
UI/UX DESIGN AND FRONTEND DEVELOPMENT PROMPT

Build a simple, clean and professional internal Consumables Management System for the Driver and Vehicle Licensing Authority (DVLA), Ghana.

The system will be used by DVLA to record, monitor, distribute and report on all types of consumable items used across its offices, departments and stations.

IMPORTANT:

The design should be based on the attached hand-drawn concept.

Do not overcomplicate the interface.

The core idea is:

SIDEBAR
+
CONSUMABLE CATEGORIES
+
RECORDS TABLE
+
FILTERS
+
ADD DATA
+
IMPORT EXCEL
+
REPORTS

The application should feel like a simple internal government records system rather than a complicated commercial inventory application.


==================================================
1. TECHNOLOGY
==================================================

Use:

- Next.js
- React
- JavaScript only
- Tailwind CSS
- shadcn/ui
- Lucide React
- Framer Motion only where necessary

Do not use TypeScript.

For this stage, build the frontend/UI using realistic mock data.

No backend is required yet.

Structure the application properly so a backend and database can be connected later.


==================================================
2. DESIGN DIRECTION
==================================================

Follow the structure of the provided sketch.

The design should be:

- Simple
- Clean
- Professional
- Government/enterprise focused
- Data focused
- Easy to understand
- Fast to navigate
- Responsive

Use DVLA branding.

Use:

- DVLA blue as the primary colour
- Green as a supporting colour
- White background
- Light grey borders/backgrounds
- Dark text
- Subtle status colours

Avoid:

- Glassmorphism
- Heavy gradients
- Neon colours
- Excessive shadows
- Huge cards
- Excessive rounded corners
- Complicated animations
- Unnecessary dashboard widgets


==================================================
3. MAIN APPLICATION STRUCTURE
==================================================

The application should have:

LEFT SIDEBAR

TOP HEADER

MAIN CONTENT AREA


==================================================
4. LEFT SIDEBAR
==================================================

The sidebar should closely follow the structure in the sketch.

At the top:

DVLA LOGO

Below the logo:

CONSUMABLES

Navigation/categories should include:

- Consumables Records
- Station Stock
- Stock Movement
- Reports

Then create a section called:

CONSUMABLE CATEGORIES

Example categories:

- YMCK
- Holo Patch
- Colour Ribbon
- Black Ribbon
- MCC660 Holo Patch
- MCC660 Clear
- Toner
- Printer Ink
- Printing Materials
- Office Stationery
- Cleaning Materials
- Other Consumables

Important:

These categories are examples.

The system must allow administrators to add, edit and remove consumable categories later.

At the bottom of the sidebar:

Settings

User Profile


==================================================
5. TOP HEADER
==================================================

At the top of the main content area show:

CONSUMABLES RECORDS

On the right:

Import
Excel Template
Add Data

These buttons should closely follow the hand-drawn concept.

Also include:

- Search
- Notifications
- User profile


==================================================
6. CONSUMABLES RECORDS PAGE
==================================================

This is the main page.

Title:

Consumables Records

Description:

"View and manage records of consumable items across DVLA stations and departments."

At the top right:

IMPORT
EXCEL TEMPLATE
ADD DATA


==================================================
7. RECORDS TABLE
==================================================

The main content should be a large, clean data table.

Columns should include:

- Date
- Item
- Category
- Station
- Department
- Unit
- Quantity Received
- Quantity Issued
- Balance
- Reorder Level
- Status
- Actions

Example:

Date | Item | Category | Station | Department | Received | Issued | Balance | Status

The table should support:

- Search
- Sorting
- Filtering
- Pagination
- Column visibility
- View details
- Edit
- Delete where permitted


==================================================
8. SEARCH AND FILTERS
==================================================

The table should have strong filtering functionality.

Allow users to filter by:

- Consumable
- Category
- Station
- Department
- Date
- Status

Search by:

- Item name
- Item code
- Category
- Station

Add:

Clear Filters

and:

Apply Filters


==================================================
9. ADD DATA
==================================================

The "ADD DATA" button should open a clean data-entry form.

Title:

Add Consumable Record

Fields:

- Date
- Consumable Item
- Category
- Item Code
- Station
- Department
- Unit
- Quantity Received
- Quantity Issued
- Reorder Level
- Supplier
- Reference Number
- Remarks

Buttons:

Cancel
Save Record


==================================================
10. CONSUMABLE ITEM MASTER DATA
==================================================

The system should distinguish between:

CONSUMABLE ITEMS

and

CONSUMABLE TRANSACTIONS.

For example:

Item:

YMCK Ribbon

Category:

Printer Consumables

Unit:

Roll

Item Code:

CONS-001

Then transactions can record:

Received:
20

Issued:
5

Balance:
15

This allows the system to maintain proper records without duplicating the same consumable unnecessarily.


==================================================
11. STOCK MOVEMENT
==================================================

Create a simple Stock Movement page.

This page should show all movements of consumables.

Movement types:

- Stock Received
- Stock Issued
- Stock Adjustment
- Stock Transfer

Table:

Date
Item
Movement Type
Quantity
From
To
Officer
Reference
Balance

Example:

10 Sep 2026
YMCK Ribbon
Stock Issued
5
Central Stores
Accra Station
John Doe
ISS-001
45


==================================================
12. STOCK RECEIVING
==================================================

Create a simple form for recording newly received consumables.

Fields:

- Date Received
- Supplier
- Reference/Purchase Number
- Item
- Quantity
- Unit
- Receiving Station
- Receiving Officer
- Remarks

After saving:

The system should increase the available balance.


==================================================
13. STOCK ISSUING
==================================================

Create a simple form for issuing consumables.

Fields:

- Date
- Consumable
- Quantity
- Issuing Station
- Department
- Receiving Officer
- Purpose
- Reference Number
- Remarks

Before saving:

Show:

Current Balance

Quantity to Issue

Remaining Balance

Do not allow the UI to issue more than the available balance.

For the prototype, simulate validation.


==================================================
14. STATION MANAGEMENT
==================================================

Consumables should be associated with DVLA stations.

Allow filtering by station.

Example stations:

- Head Office
- Accra
- Tema
- Kumasi
- Cape Coast
- Takoradi
- Tamale
- Ho
- Koforidua
- Sunyani
- Bolgatanga
- Wa

Use mock station data.

Do not assume the example list represents the complete current DVLA station list.

The system should eventually support all DVLA stations.


==================================================
15. DEPARTMENT
==================================================

Allow consumables to be associated with departments.

Examples:

- IT
- HR
- Finance
- Administration
- Procurement
- Operations
- Vehicle Registration
- Driver Licensing
- Roadworthiness
- Customer Service

Allow administrators to manage departments later.


==================================================
16. STOCK BALANCE
==================================================

Create a Stock Balance view.

Show:

Item
Category
Station
Opening Balance
Received
Issued
Adjusted
Current Balance
Reorder Level
Status

Status examples:

IN STOCK

LOW STOCK

OUT OF STOCK


==================================================
17. LOW STOCK INDICATOR
==================================================

If the current balance reaches or falls below the reorder level:

Show:

LOW STOCK

If balance is zero:

OUT OF STOCK

If stock is sufficient:

IN STOCK

Use simple visual status badges.


==================================================
18. EXCEL IMPORT
==================================================

The "IMPORT" button should open an Import Data interface.

The user should be able to:

1. Select Excel file
2. Upload file
3. Preview records
4. Validate records
5. Show errors
6. Confirm import

Show an example preview table.

Example:

Item
Category
Station
Department
Quantity
Date

Show validation messages such as:

Missing Item
Invalid Quantity
Unknown Station
Duplicate Record

The prototype can simulate the import process.

Do not implement actual backend Excel processing yet.


==================================================
19. EXCEL TEMPLATE
==================================================

The "EXCEL TEMPLATE" button should provide a downloadable/template-style interface for the expected import format.

Template columns:

Date
Item Code
Item Name
Category
Station
Department
Unit
Quantity Received
Quantity Issued
Reorder Level
Supplier
Reference Number
Remarks

Also show a small explanation:

"Use this template when importing consumables records into the system."


==================================================
20. REPORTS
==================================================

Create a simple Reports page.

Reports should help management understand consumables usage.

Include:

- Total Consumables
- Total Stock Received
- Total Stock Issued
- Current Stock
- Low Stock Items
- Out of Stock Items

Allow filtering by:

- Date
- Station
- Department
- Category
- Item

Reports should include:

STOCK REPORT

ISSUANCE REPORT

RECEIVING REPORT

CONSUMABLE USAGE REPORT

LOW STOCK REPORT


==================================================
21. REPORT TABLE
==================================================

Example:

Consumable Usage Report

| Item | Category | Station | Received | Issued | Balance |
|------|----------|---------|----------|--------|---------|

Provide:

Export Excel
Print Report


==================================================
22. CONSUMABLE DETAILS
==================================================

Clicking a consumable should open its details.

Show:

Consumable Name
Item Code
Category
Unit
Current Balance
Reorder Level
Status

Then show:

TRANSACTION HISTORY

Date
Transaction
Quantity
Station
Department
Officer
Reference

This gives users a complete history of the item.


==================================================
23. AUDIT TRAIL
==================================================

The system should be designed with an audit trail in mind.

Track:

- Created by
- Created date
- Updated by
- Updated date
- Transaction performed by
- Transaction date

For example:

"Record added by Admin Officer on 10 September 2026."

This is important for internal accountability and future auditing.


==================================================
24. USER ROLES
==================================================

Design the UI to support future user roles.

Roles:

ADMINISTRATOR

- Full access

STORE OFFICER

- Add records
- Receive stock
- Issue stock
- View records
- View reports

STATION OFFICER

- View station records
- Record station usage
- Request consumables

SUPERVISOR

- View records
- Approve selected actions
- View reports

VIEWER

- Read-only access


Do not implement full authentication yet.

Just structure the UI so permissions can be added later.


==================================================
25. DASHBOARD
==================================================

Keep the dashboard simple.

Show only useful information:

Total Consumable Items

Total Stock

Stock Issued

Low Stock

Out of Stock

Then show:

RECENT STOCK MOVEMENTS

and

LOW STOCK ITEMS

Do not turn the dashboard into a complicated analytics page.


==================================================
26. DATA STRUCTURE
==================================================

Prepare mock data files such as:

data/
  consumables.js
  categories.js
  stations.js
  departments.js
  transactions.js
  users.js
  reports.js


Example consumable:

{
  id: "CONS-001",
  name: "YMCK Ribbon",
  category: "Printer Consumables",
  unit: "Roll",
  station: "Head Office",
  balance: 45,
  reorderLevel: 10,
  status: "In Stock"
}


==================================================
27. ROUTES
==================================================

Create the following pages:

/dashboard

/consumables

/consumables/[id]

/consumables/add

/stock

/stock/receive

/stock/issue

/movements

/reports

/import

/categories

/stations

/settings


==================================================
28. MAIN USER FLOW
==================================================

The most important workflow should be:

VIEW RECORDS

→ Search / Filter

→ Select Consumable

→ View Details

→ See Transaction History


For receiving:

RECEIVE STOCK

→ Select Item

→ Enter Quantity

→ Save

→ Stock Balance Updates


For issuing:

ISSUE STOCK

→ Select Item

→ Select Station/Department

→ Enter Quantity

→ Validate Balance

→ Save

→ Stock Balance Updates


For importing:

IMPORT

→ Upload Excel

→ Preview

→ Validate

→ Confirm


==================================================
29. RESPONSIVE DESIGN
==================================================

The system must work on:

- Desktop
- Laptop
- Tablet
- Mobile

Desktop should prioritize the data table.

On smaller screens:

- Convert tables into responsive layouts
- Allow horizontal table scrolling where necessary
- Make filters collapsible
- Convert sidebar into a mobile drawer
- Keep Add Data easily accessible


==================================================
30. VISUAL DETAILS FROM THE SKETCH
==================================================

IMPORTANT:

Preserve the spirit of the provided hand-drawn design.

The sketch shows a very straightforward interface:

LEFT:
DVLA LOGO
Consumable categories

TOP:
CONSUMABLES RECORDS

TOP RIGHT:
Import
Excel Template
Add Data

CENTER:
Records table
with filtering

LEFT/BOTTOM:
Report

Translate this simple concept into a polished professional web application.

Do not completely redesign it into a complicated dashboard.

The sketch should remain recognizable in the final interface.


==================================================
31. FINAL UI GOAL
==================================================

The final application should feel like:

"An official DVLA internal consumables record and stock management system."

It should allow a staff member to quickly answer:

What consumables do we have?

How much do we have?

Where is it?

What department has it?

How much has been received?

How much has been issued?

Who received it?

When was it issued?

Which items are running low?

What has been used over a particular period?

What is the current stock balance?


==================================================
32. FINAL REQUIREMENT
==================================================

Build the complete frontend prototype.

Do not build only the records table.

Implement:

- Dashboard
- Consumables Records
- Consumable Details
- Add Data
- Receive Stock
- Issue Stock
- Stock Balance
- Stock Movement
- Excel Import
- Excel Template
- Reports
- Categories
- Stations
- Settings

Use realistic fictional DVLA data.

Make all navigation functional.

Use mock data and simulated actions.

Keep the application simple and clear.

The main screen should remain close to the provided design.

The system should prioritize:

RECORDS
→ STOCK
→ MOVEMENT
→ DISTRIBUTION
→ REPORTING

Do not add unnecessary features or complicated workflows.

The final result should be clean enough for everyday use by DVLA staff and structured well enough to later connect to a real database and backend.