# ERP Invariants

These are the fundamental invariants of the Solar ERP system.

---

## Double Entry Accounting

All accounting transactions must follow double-entry principles.

Every posting must create:

- one debit entry
- one credit entry

Total debit must always equal total credit.

---

## Posting Rules

Business documents generate accounting entries when posted.

Examples:

- purchase document → inventory + payable
- sales document → receivable + revenue

Posting logic must be implemented inside:

lib/accounting/journalService

---

## Inventory Valuation

Inventory must be valued using FIFO.

Rules:

- warehouse movements update inventory layers
- cost of goods sold must follow FIFO layers
- valuation logic lives inside fifoService

---

## Document Posting Invariants

Documents follow lifecycle stages:

draft → posted → accounting → warehouse

Once a document is posted:

- accounting entries must exist
- warehouse movements must exist
- document cannot change historical totals

---

## Tenant Isolation

Solar ERP is a multi-tenant system.

Rules:

- every entity must include tenantId
- queries must always filter by tenantId
- cross-tenant data access is forbidden

---

## Accounting Period Locking

Accounting periods can be locked.

Rules:

- transactions cannot be modified in locked periods
- reposting must respect accounting period boundaries
- corrections must be done via adjusting entries

Period locking logic is implemented in:

lib/accounting/periodLock

---

## Document Immutability

Posted documents must be immutable.

Rules:

- posted documents cannot change financial totals
- corrections must be done via reversal or adjustment
- audit trail must be preserved

Document mutation after posting is forbidden.