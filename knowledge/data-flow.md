# Solar ERP Data Flow

Solar ERP processes business events through a layered pipeline:

document
→ warehouse movement
→ inventory valuation
→ accounting entry
→ financial reports

This document describes how business events propagate through the ERP system.

---

## Purchase Flow

purchase document
→ warehouse movement
→ inventory layers update
→ FIFO cost layer creation
→ accounting journal entry

Responsible services:

- stockService
- fifoService
- journalService

---

## Sales Flow

sales document
→ revenue recognition
→ FIFO inventory reduction
→ cost of goods sold (COGS)
→ accounting journal entry

Responsible services:

- fifoService
- journalService

---

## Reposting Flow

document update
→ remove previous accounting entries
→ recalculate FIFO layers
→ recreate accounting journal entries

Responsible services:

- repostingService
- fifoService
- journalService

---

## Adjustment Flow

manual adjustment
→ warehouse movement correction
→ FIFO layers recalculation
→ accounting adjustment entry

Responsible services:

- stockService
- fifoService
- journalService

---

## Manual Accounting Flow

manual journal entry
→ validate accounts
→ create journal entry
→ update financial reports

Responsible services:

- journalService