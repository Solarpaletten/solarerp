# Solar ERP Document Model

Solar ERP is a document-driven system.

Business processes are implemented through documents.

Documents control accounting, warehouse movements and financial reporting.

---

## Document Types

Solar ERP supports several document types.

Main document categories:

- purchase documents
- sales documents
- warehouse documents
- manual journal entries

Examples:

purchase → increases inventory and creates payable  
sale → creates revenue and cost of goods sold

---

## Document Lifecycle

Documents follow a lifecycle.

draft → posted → accounting → warehouse

Stages:

draft  
- document can be edited  
- no accounting impact  

posted  
- document becomes immutable  
- accounting entries are created  

accounting  
- journal entries are generated  

warehouse  
- inventory movements are recorded

---

## Document Actions

Documents support standard ERP actions.

Available actions:

- draft
- post
- cancel
- copy
- repost

These actions are handled by the document engine.

---

## Document Integrity Rules

Solar ERP enforces strict document integrity.

Rules:

- posted documents cannot change financial totals
- corrections must use reposting or adjustments
- accounting entries must always remain balanced

These rules guarantee auditability.