# Solar ERP Event Model

Solar ERP follows an event-driven model.

Business actions generate events that propagate through the system.

Events trigger accounting, inventory and reporting updates.

---

## Core Event Flow

document posted
→ warehouse updated
→ FIFO recalculated
→ journal entries created
→ financial reports updated

This pipeline guarantees that business events are consistently reflected across the system.

---

## Document Posted Event

When a document is posted, the system generates a **document_posted** event.

Effects:

- document becomes immutable
- accounting entries are created
- warehouse movements are generated

Triggered services:

- stockService
- fifoService
- journalService

---

## Warehouse Updated Event

Warehouse movements generate **warehouse_updated** events.

Effects:

- inventory layers are updated
- FIFO cost layers are recalculated

Handled by:

- stockService
- fifoService

---

## FIFO Recalculated Event

When inventory layers change, **fifo_recalculated** event occurs.

Effects:

- cost of goods sold (COGS) is recalculated
- inventory valuation is updated

Handled by:

- fifoService

---

## Journal Created Event

Accounting entries trigger **journal_created** events.

Effects:

- journal entries recorded
- financial totals recalculated

Handled by:

- journalService

---

## Report Updated Event

When accounting data changes, reports must be updated.

Reports include:

- balance sheet
- profit and loss
- trial balance

Reports are derived from journal entries.

---

## Event Integrity

Solar ERP events must preserve system invariants.

Rules:

- accounting must remain balanced
- FIFO layers must remain consistent
- tenant isolation must always be enforced