# 🎯 TASK 57: Entity Selection Windows (ERP-Grade UX)

**Status:** SPECIFICATION  
**Complexity:** 700-900 lines  
**Priority:** FOUNDATION  
**Pattern:** SAP / Odoo / Business Central / Site.pro

---

## 📋 EXECUTIVE SUMMARY

Transform Entity Selection from dropdown to professional ERP-style Modal Selection Dialogs.

**Current State (Task 56):**
```
Click field → Autocomplete in cell → Scroll if many items
```

**Target State (Task 57):**
```
Click field → Full Selection Window → Search + Create → Auto-fill document
```

---

## 🏗️ ARCHITECTURE

```
Universal Component:
EntitySelectDialog<T>
├─ EntitySearch (search by name/code/barcode)
├─ EntityTable (list with columns)
├─ CreateModal (create new entity inline)
└─ Auto-fill on selection

Used for:
├─ ProductSelectDialog
├─ ClientSelectDialog
├─ UnitSelectDialog
├─ AccountSelectDialog
└─ WarehouseSelectDialog
```

---

## 1️⃣ PRODUCT SELECTION WINDOW

### Trigger
- "Add Item" button click
- Product field click in table

### UI Structure
```
┌─────────────────────────────────┐
│ Select Product                  │ ×
├─────────────────────────────────┤
│ Search: [________________]      │
├─────────────────────────────────┤
│ Code  │ Name              │ VAT │ Price
├───────┼──────────────────┼─────┼──────┤
│ MAC-1 │ MacBook Pro M5    │ 19% │ 2700 │ ← select
│ MAC-2 │ MacBook Air       │ 19% │ 1800 │
│ CONS  │ Consulting Svc    │ 19% │ 120  │
│ HOST  │ Hosting (monthly) │ 19% │ 99   │
├─────────────────────────────────┤
│ [+ Create Product]              │
├─────────────────────────────────┤
│ [Cancel]  [Select]              │
└─────────────────────────────────┘
```

### Data Returned
```typescript
{
  id: string;
  code: string;
  name: string;
  unit: string;           // pcs, kg, hours, etc.
  vatRate: number;        // 19, 7, 0
  defaultPrice: number;   // for pre-fill
}
```

### On Selection
```
Product selected
  ↓
Close dialog
  ↓
Auto-fill in item row:
  - itemName: product.name
  - itemCode: product.code
  - unit: product.unit
  - vatRate: product.vatRate
  - price: product.defaultPrice (optional)
```

---

## 2️⃣ CREATE PRODUCT FROM WINDOW

### Trigger
```
[+ Create Product] button inside ProductSelectDialog
```

### UI (Modal inside Modal)
```
┌─────────────────────────────────┐
│ Create Product                  │ ×
├─────────────────────────────────┤
│ Name: [_____________________]   │
│ Code: [_____________________]   │
│ Unit: [Dropdown: pcs/kg/hours]  │
│ VAT Rate: [____] %              │
│ Default Price: [____________]   │
│ Category: [________________]    │
├─────────────────────────────────┤
│ [Cancel] [Create & Select]      │
└─────────────────────────────────┘
```

### On Save
```
Create product
  ↓
POST /api/products
  ↓
Product created
  ↓
Return to ProductSelectDialog
  ↓
New product auto-selected
  ↓
Close dialog
  ↓
Item row auto-filled
```

---

## 3️⃣ CLIENT SELECTION WINDOW

### Trigger
- Click "Supplier" field in header

### UI Structure
```
┌──────────────────────────────────────┐
│ Select Client (Supplier)             │ ×
├──────────────────────────────────────┤
│ Search: [________________]           │
├──────────────────────────────────────┤
│ Code     │ Name              │ VAT# │ Country
├──────────┼──────────────────┼──────┼────────┤
│ SUP-001  │ SWAPOIL GmbH      │ DE1  │ DE     │ ← select
│ DEMO-001 │ Demo Supplier Ltd │ UK1  │ UK     │
│ AMAZ-EU  │ Amazon EU SARL    │ LU1  │ LU     │
├──────────────────────────────────────┤
│ [+ Create Client]                    │
├──────────────────────────────────────┤
│ [Cancel] [Select]                    │
└──────────────────────────────────────┘
```

### Data Returned
```typescript
{
  id: string;
  code: string;
  name: string;
  displayName: string;
  vatCode: string;
  country: string;
  paymentTerms: string;
  email: string;
  phone: string;
}
```

### On Selection
```
Client selected
  ↓
Close dialog
  ↓
Update header:
  - supplierId: client.id
  - supplierName: client.name
  - supplierCode: client.code
```

---

## 4️⃣ CREATE CLIENT FROM WINDOW

### Trigger
```
[+ Create Client] inside ClientSelectDialog
```

### UI
```
┌──────────────────────────────────┐
│ Create Client                    │ ×
├──────────────────────────────────┤
│ Name: [_____________________]   │
│ Code: [_____________________]   │
│ VAT Number: [_______________]   │
│ Country: [Dropdown]             │
│ Payment Terms: [____________]   │
│ Email: [_____________________] │
│ Phone: [_____________________] │
├──────────────────────────────────┤
│ [Cancel] [Create & Select]       │
└──────────────────────────────────┘
```

---

## 5️⃣ UNIT OF MEASURE SELECTION

### Trigger
- Click Unit column in table

### UI
```
┌─────────────────────┐
│ Select Unit         │ ×
├─────────────────────┤
│ pcs (pieces)        │ ← select
│ kg (kilograms)      │
│ ton (tons)          │
│ liter               │
│ hour                │
│ day                 │
│ month               │
│ box                 │
├─────────────────────┤
│ [Cancel] [Select]   │
└─────────────────────┘
```

### Storage
```
database table: UnitOfMeasure
├─ id: string
├─ code: string (pcs, kg, hours)
├─ name: string
├─ category: string (weight, time, count)
└─ conversionFactor: decimal
```

---

## 6️⃣ ACCOUNT SELECTION WINDOW

### Trigger
- Future: GL account selection in journal entries
- Account dropdown in purchase header

### UI
```
┌──────────────────────────────────┐
│ Select Account (GL)              │ ×
├──────────────────────────────────┤
│ Search: [________________]       │
├──────────────────────────────────┤
│ Code  │ Name                     │ Type
├───────┼────────────────────────┼─────────┤
│ 5000  │ Purchases              │ Expense │
│ 5001  │ Services               │ Expense │
│ 5100  │ Import Duties          │ Expense │
│ 7000  │ Sales Revenue          │ Revenue │
│ 1300  │ Inventory              │ Asset   │
├──────────────────────────────────┤
│ [Cancel] [Select]                │
└──────────────────────────────────┘
```

---

## 7️⃣ SEARCH UX

### Features
```
1. Search by name:
   type: "mac" → MacBook Pro, MacBook Air
   
2. Search by code:
   type: "MAC-1" → MacBook Pro M5
   
3. Search by barcode:
   type: "1234567890" → Item with that barcode
   
4. Partial match:
   type: "swapo" → SWAPOIL GmbH
   
5. Case-insensitive
```

### Implementation
```typescript
// Search logic
const results = items.filter(item =>
  item.name.toLowerCase().includes(query.toLowerCase()) ||
  item.code.toLowerCase().includes(query.toLowerCase()) ||
  item.barcode?.includes(query)
);
```

---

## 8️⃣ DUAL SELECTION MODES

### Mode 1: Quick (Inline Autocomplete)
```
Field: [type "mac" ▼]
       ↓
Dropdown:
├─ MacBook Pro
├─ MacBook Air
└─ (3 more results)

Select one
  ↓
Auto-fill
```

### Mode 2: Full (Selection Window)
```
Field: [click here] 🔍

Open Selection Window
  ↓
Full list + search + create
  ↓
Select + Close
  ↓
Auto-fill
```

### Recommendation
```
Use Mode 2 (Full) for:
- Product selection (many items)
- Client selection (many suppliers)
- Account selection (complex GL)

Use Mode 1 (Quick) for:
- Unit selection (few items)
- Quick frequently-used items
```

---

## 9️⃣ API ENDPOINTS

### Products
```
GET /api/company/[companyId]/products?search=mac&limit=50
Response:
{
  items: [
    { id, code, name, unit, vatRate, defaultPrice }
  ],
  total: 150
}
```

### Clients
```
GET /api/company/[companyId]/clients?search=swapo&limit=50
Response:
{
  items: [
    { id, code, name, displayName, vatCode, country, paymentTerms }
  ],
  total: 300
}
```

### Units
```
GET /api/units
Response:
{
  items: [
    { id, code, name, category, conversionFactor }
  ]
}
```

### Accounts
```
GET /api/company/[companyId]/accounts?type=expense
Response:
{
  items: [
    { id, code, name, type, parentId }
  ]
}
```

---

## 🔟 REACT COMPONENTS

### File Structure
```
components/select/
├── EntitySelectDialog.tsx         (universal wrapper)
├── EntitySearch.tsx               (search logic)
├── EntityTable.tsx                (list display)
├── EntityCreateModal.tsx          (create inline)
├── ProductSelectDialog.tsx        (product-specific)
├── ClientSelectDialog.tsx         (client-specific)
├── UnitSelectDialog.tsx           (unit-specific)
└── AccountSelectDialog.tsx        (account-specific)
```

### Universal Component
```typescript
// EntitySelectDialog.tsx
interface EntitySelectDialogProps<T> {
  open: boolean;
  title: string;
  items: T[];
  columns: Column<T>[];
  onSelect: (item: T) => void;
  onCreateNew?: () => void;
  searchFields: (keyof T)[];
  loading?: boolean;
}

export function EntitySelectDialog<T>({
  open,
  title,
  items,
  columns,
  onSelect,
  onCreateNew,
  searchFields,
  loading
}: EntitySelectDialogProps<T>) {
  // Universal logic for any entity
}
```

---

## 1️⃣1️⃣ PURCHASE ITEMS INTEGRATION

### Current (Task 56)
```
Item field: [autocomplete input]
Code field: [manual input]
Unit: [manual dropdown]
VAT: [manual input]
```

### After Task 57
```
Click "Item" field
  ↓
ProductSelectDialog opens
  ↓
Select product (e.g., MacBook Pro)
  ↓
Auto-fill:
  {
    itemName: "MacBook Pro",
    itemCode: "MAC-1",
    unit: "pcs",
    vatRate: 19,
    price: 2700
  }
  ↓
Item row complete + ready to edit Qty
```

---

## 1️⃣2️⃣ EXAMPLE UX FLOW

### Add Item to Purchase

```
Current state:
[Purchase Form: Supplier selected, items empty]

Action: User clicks [Add Item]

Sequence:
1. Click [Add Item] button
   ↓
2. ProductSelectDialog opens
   ├─ Show list of products (or search results)
   ├─ Search field active
   └─ [+ Create Product] available
   
3. User types "mac"
   ├─ Results filtered
   └─ MacBook Pro visible
   
4. User selects "MacBook Pro"
   ├─ Dialog closes
   └─ Item row populated:
      │ Item: MacBook Pro
      │ Code: MAC-1
      │ Qty: 1 (editable)
      │ Price: 2700 (editable)
      │ VAT: 19% (editable)
      │
      
5. User enters Qty: 5
   ├─ Totals recalculate (totalsHelper)
   └─ Netto: 13,500 | Gross: 16,065

6. User [Add Item] again
   ↓
   ProductSelectDialog opens again for next item
```

---

## 1️⃣3️⃣ PROFESSIONAL ERP UX

### This is how enterprise systems work

**SAP:**
```
Click Product → Selection Window → Search → Create → Auto-fill
```

**Odoo:**
```
Click Product → Modal → Search → Select → Auto-fill
```

**Business Central:**
```
Click Product → Selection Window → Search → Create → Auto-fill
```

**Site.pro:**
```
Click Product → Modal → Table + Search → Create → Auto-fill
```

**1C:**
```
Click Product → Selection Window → Search → Create → Auto-fill
```

**Solar ERP (Task 57):**
```
Click Product → EntitySelectDialog → Search → Create → Auto-fill
✓ Same pattern
```

---

## 1️⃣4️⃣ CODE ESTIMATE

### Components to Create
```
EntitySelectDialog          ~150 lines
EntitySearch               ~100 lines
EntityTable                ~120 lines
EntityCreateModal          ~100 lines
ProductSelectDialog        ~80 lines
ClientSelectDialog         ~80 lines
UnitSelectDialog           ~60 lines
AccountSelectDialog        ~60 lines
Hooks (useSelection)       ~50 lines
─────────────────────────────────────
Total                      ~800 lines
```

### API Routes to Create
```
GET /products?search=     (use existing or enhance)
POST /products           (create)
GET /clients?search=     (use existing or enhance)
POST /clients            (create)
GET /units               (new)
GET /accounts?search=    (new)
POST /accounts           (new - optional for Task 57)
```

---

## 1️⃣5️⃣ IMPLEMENTATION ROADMAP

### Phase 1: Foundation
```
✓ EntitySelectDialog (universal wrapper)
✓ EntitySearch (search logic)
✓ EntityTable (display)
✓ Hook: useSelection
```

### Phase 2: Product Selection
```
✓ ProductSelectDialog
✓ ProductCreateModal (inline)
✓ API: GET /products?search=
✓ Integration with PurchaseItemsEdit
```

### Phase 3: Client Selection
```
✓ ClientSelectDialog
✓ ClientCreateModal (inline)
✓ API: GET /clients?search=
✓ Integration with PurchaseHeaderEdit
```

### Phase 4: Other Entities
```
✓ UnitSelectDialog
✓ AccountSelectDialog
✓ WarehouseSelectDialog
✓ (Optional: CategorySelectDialog)
```

---

## 1️⃣6️⃣ VALIDATION & ERROR HANDLING

```typescript
// Product selection validation
if (!selectedProduct) {
  throw new Error("Product must be selected");
}

if (!selectedProduct.defaultPrice) {
  showWarning("Product has no default price");
}

// Client selection validation
if (!selectedClient) {
  throw new Error("Client must be selected");
}

if (!selectedClient.vatCode) {
  showWarning("Client has no VAT code");
}
```

---

## 1️⃣7️⃣ PERFORMANCE

```
Product list: 1000+ items
├─ Use virtualization (react-window)
├─ Limit initial load to 50
├─ Search server-side
└─ Debounce search input

Client list: 5000+ items
├─ Pagination
├─ Server-side search mandatory
└─ Cache frequently used
```

---

## 1️⃣8️⃣ NEXT: TASK 58 (EDITABLE GRID)

After Task 57 Selection Windows are working:

```
TASK 58: ERP Editable Grid

Current (Task 56):
├─ Add Item → fill fields → Save
├─ Edit item → manual process

After Task 58:
├─ Click any cell → inline edit
├─ Double-click → edit mode
├─ Qty changes → totals update in real-time
├─ Price changes → auto-calculate discounts
├─ Professional SAP/Odoo style

This makes Solar ERP 5x more powerful UX
```

---

## 📊 SUCCESS CRITERIA

✅ ProductSelectDialog works for all products  
✅ Can create product inline and auto-select  
✅ ClientSelectDialog works for all clients  
✅ Can create client inline and auto-select  
✅ UnitSelectDialog shows all units  
✅ AccountSelectDialog shows all GL accounts  
✅ Search works by name, code, barcode  
✅ Performance handles 1000+ items  
✅ Auto-fill works correctly  
✅ Type-safe (100% TypeScript)  
✅ Mobile-friendly UI  

---

## 🎯 THIS MAKES SOLAR ERP

```
From:  Prototype ERP with basic CRUD
To:    Professional ERP UI
       
Same level as:
- SAP
- Odoo
- Business Central
- Site.pro
- 1C
```

---

**Ready to implement Task 57?** ✅

