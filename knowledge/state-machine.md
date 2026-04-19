# Solar ERP Document State Machine

Solar ERP documents follow a defined state machine.

The state machine guarantees document integrity and prevents invalid transitions.

---

## Document States

Business documents can exist in the following states:

draft  
posted  
cancelled  

Optional internal states:

accounting_processed  
warehouse_processed  

---

## State Transitions

Allowed transitions:

draft → posted  
draft → cancelled  

posted → cancelled  

posted → reposted (via repost operation)

Invalid transitions are forbidden.

Examples:

posted → draft ❌  
cancelled → posted ❌  

---

## Draft State

Draft documents:

- can be edited
- can be deleted
- do not affect accounting
- do not affect warehouse inventory

Allowed actions:

edit  
copy  
post  
cancel

---

## Posted State

Posted documents are finalized.

Effects:

- document becomes immutable
- accounting entries are generated
- warehouse movements are recorded

Allowed actions:

copy  
cancel  
repost

Direct editing is forbidden.

---

## Cancelled State

Cancelled documents represent reversed transactions.

Effects:

- accounting entries are reversed
- warehouse movements are reversed
- document is locked

No further transitions allowed.

---

## Repost Operation

Reposting is a special transition.

posted → reposted → posted

Steps:

- remove previous accounting entries
- recalculate FIFO layers
- regenerate journal entries

Handled by:

repostingService

---

## Period Lock Interaction

When an accounting period is closed:

- documents cannot transition to posted
- existing posted documents cannot be modified

Period locking is handled by:

lib/accounting/periodLock

---

## State Integrity Rules

The state machine guarantees:

- accounting integrity
- warehouse consistency
- auditability of documents

Invalid transitions must always be rejected.