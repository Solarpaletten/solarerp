# Solar ERP Domain Map

Solar ERP is structured as a set of interconnected business domains.

Each domain represents a functional area of the ERP system.

Domains communicate through documents, events and services.

---

## Core Domain

Core domain manages system identity and tenant isolation.

Components:

- companies
- users
- authentication
- onboarding

Responsibilities:

- tenant management
- user access control
- company initialization

Services:

lib/auth  
lib/company  
lib/onboarding

---

## Master Data Domain

Master data stores business entities used by documents.

Entities:

- clients
- products
- employees
- chart-of-accounts
- vat-rates
- operation-types
- warehouses

Responsibilities:

- maintain business reference data
- validate entities used in documents

---

## Document Domain

Documents represent business transactions.

Document types:

- purchases
- sales
- warehouse adjustments
- manual journal entries

Responsibilities:

- control document lifecycle
- generate accounting entries
- generate warehouse movements

Services:

documentEngine  
repostingService

---

## Warehouse Domain

Warehouse domain manages physical inventory.

Components:

- warehouses
- warehouse movements
- warehouse balances

Responsibilities:

- track stock levels
- create inventory movements
- maintain FIFO inventory layers

Services:

stockService  
fifoService

---

## Accounting Domain

Accounting domain records financial transactions.

Components:

- journal entries
- accounting periods
- chart of accounts
- financial totals

Responsibilities:

- enforce double entry accounting
- record financial transactions
- calculate financial balances

Services:

journalService  
periodLock

---

## Reporting Domain

Reporting domain generates financial statements.

Reports:

- balance sheet
- profit and loss
- trial balance
- inventory reports

Responsibilities:

- aggregate journal data
- present financial information

Reports derive data from:

journal entries  
inventory valuation

---

## Domain Interaction

Domains interact through documents and events.

Example purchase flow:

purchase document  
→ warehouse movement  
→ FIFO valuation  
→ accounting entry  
→ financial reports

This interaction guarantees system consistency.