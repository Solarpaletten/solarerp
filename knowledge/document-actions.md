# Solar ERP Document Actions

Solar ERP documents support several standard actions.

These actions control the lifecycle of business documents.

---

## Post

The post action finalizes a document.

Effects:

- document status changes from draft → posted
- accounting entries are created
- warehouse movements are generated
- document becomes immutable

Posting logic uses:

- journalService
- stockService
- fifoService

---

## Cancel

Cancel reverses the effect of a posted document.

Effects:

- accounting entries are reversed
- warehouse movements are reversed
- document status becomes cancelled

Cancel operations must preserve accounting balance.

---

## Repost

Repost recalculates accounting and inventory.

Used when:

- document data changes
- FIFO layers must be recalculated
- accounting entries must be regenerated

Effects:

- remove existing journal entries
- recompute FIFO inventory layers
- recreate accounting entries

Handled by:

- repostingService
- fifoService
- journalService

---

## Copy

Copy creates a new draft document based on an existing one.

Rules:

- copied document resets lifecycle state
- copied document receives new document number
- accounting entries are not copied

Used to quickly create similar documents.

---

## Close Period

Closing an accounting period prevents further modifications.

Rules:

- documents cannot be posted into closed periods
- existing documents cannot be modified
- corrections must use adjusting entries

Period closing is handled by:

lib/accounting/periodLock