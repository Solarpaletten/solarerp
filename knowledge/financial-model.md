# Solar ERP Financial Model

This document describes the financial model used by Solar ERP.

Solar ERP follows classical accounting principles used in modern ERP systems.

---

## Accounts

Solar ERP uses a chart of accounts.

Accounts are used to classify financial transactions.

Typical account groups:

- assets
- liabilities
- equity
- revenue
- expenses

Examples:

inventory → asset account  
accounts receivable → asset account  
accounts payable → liability account  
revenue → income account  
cost of goods sold → expense account

---

## Inventory Asset

Inventory is treated as a financial asset.

Rules:

- inventory increases when goods are purchased
- inventory decreases when goods are sold
- inventory value is calculated using FIFO

Inventory valuation is handled by:

lib/accounting/fifoService

---

## Cost of Goods Sold (COGS)

COGS represents the cost of inventory sold.

Rules:

- COGS is calculated from FIFO inventory layers
- every sales document must generate COGS

Example accounting entry:

debit → cost of goods sold  
credit → inventory

---

## Revenue Recognition

Revenue is recognized when goods are sold.

Example accounting entry:

debit → accounts receivable  
credit → revenue

Revenue must be matched with COGS.

This ensures correct profit calculation.

---

## Financial Statements

Solar ERP generates financial reports based on journal entries.

Main reports:

- balance sheet
- profit and loss
- trial balance

Reports are derived from:

journal entries