# 🏗️ TASK 57: Architecture & Component Design

---

## 📊 SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    Purchase Document                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PurchaseHeaderEdit                                     │
│  ├─ Supplier field click                               │
│  │  └─→ ClientSelectDialog                             │
│  │      ├─ Search clients                              │
│  │      ├─ [+ Create Client]                           │
│  │      └─ Return: supplierId                          │
│  │                                                     │
│  └─ Warehouse field                                    │
│     └─ Simple dropdown (small list)                   │
│                                                         │
│  PurchaseItemsEdit                                      │
│  ├─ [Add Item] button click                            │
│  │  └─→ ProductSelectDialog                            │
│  │      ├─ Search products                             │
│  │      ├─ [+ Create Product]                          │
│  │      └─ Return: product details                     │
│  │          ├─ itemName                                │
│  │          ├─ itemCode                                │
│  │          ├─ unit                                    │
│  │          ├─ vatRate                                 │
│  │          └─ defaultPrice                            │
│  │                                                     │
│  ├─ Item row (rendered):                               │
│  │  │                                                  │
│  │  ├─ Item field click                               │
│  │  │  └─→ ProductSelectDialog (same as above)        │
│  │  │                                                  │
│  │  ├─ Unit field click (optional Task 58)            │
│  │  │  └─→ UnitSelectDialog                           │
│  │  │      └─ Return: unit code                       │
│  │  │                                                  │
│  │  └─ Qty, Price, VAT: inline edit                   │
│  │     └─ Totals recalculate (totalsHelper)          │
│  │                                                     │
│  └─ PurchaseTotals                                     │
│     └─ calculateDocumentTotals() output              │
│
│  [Save] [Post] buttons
│  ├─ Save → Draft status
│  └─ Post → Journal Entry creation
│
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 COMPONENT HIERARCHY

```
LAYER 1: UNIVERSAL COMPONENTS
┌──────────────────────────────────────────┐
│ EntitySelectDialog<T>                    │
├──────────────────────────────────────────┤
│ Generic wrapper for any entity selection │
│                                          │
│ Props:                                   │
│ - open: boolean                          │
│ - title: string                          │
│ - items: T[]                             │
│ - columns: ColumnDef<T>[]                │
│ - onSelect: (item: T) => void            │
│ - searchFields: (keyof T)[]              │
│ - onCreateNew?: () => void               │
│ - loading?: boolean                      │
└──────────────────────────────────────────┘
           ↓
           ├─── EntitySearch.tsx
           ├─── EntityTable.tsx
           ├─── EntityCreateModal.tsx
           └─── Hooks: useSelection, useSearch


LAYER 2: ENTITY-SPECIFIC COMPONENTS
┌──────────────────────────────────────────┐
│ ProductSelectDialog                      │
│ ├─ columns: [Code, Name, Unit, VAT, Price]
│ ├─ searchFields: [name, code, barcode]   │
│ └─ onCreateNew: openProductCreateModal  │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ClientSelectDialog                       │
│ ├─ columns: [Code, Name, VAT#, Country]  │
│ ├─ searchFields: [name, code, vatCode]   │
│ └─ onCreateNew: openClientCreateModal   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ UnitSelectDialog                         │
│ ├─ columns: [Code, Name, Category]       │
│ ├─ searchFields: [name, code]            │
│ └─ onCreateNew: null (fixed list)        │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ AccountSelectDialog                      │
│ ├─ columns: [Code, Name, Type]           │
│ ├─ searchFields: [name, code]            │
│ └─ onCreateNew: null (for GL accounts)   │
└──────────────────────────────────────────┘


LAYER 3: CREATE MODALS (INLINE)
┌──────────────────────────────────────────┐
│ EntityCreateModal<T>                     │
│ (generic wrapper)                        │
└──────────────────────────────────────────┘
           ↓
           ├─── ProductCreateModal
           ├─── ClientCreateModal
           └─── (UnitCreateModal - not needed)


LAYER 4: INTEGRATION
┌──────────────────────────────────────────┐
│ PurchaseHeaderEdit                       │
│ ├─ <ClientSelectDialog />                │
│ └─ onSelect → setSupplierId              │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ PurchaseItemsEdit                        │
│ ├─ [Add Item] → <ProductSelectDialog />  │
│ ├─ Item row click → <ProductSelectDialog />
│ └─ onSelect → item.itemName/itemCode...  │
└──────────────────────────────────────────┘
```

---

## 📁 FILE STRUCTURE

```
components/
├── select/
│   ├── EntitySelectDialog.tsx          (150 lines)
│   ├── EntitySearch.tsx                (100 lines)
│   ├── EntityTable.tsx                 (120 lines)
│   ├── EntityCreateModal.tsx           (100 lines)
│   │
│   ├── ProductSelectDialog.tsx         (80 lines)
│   ├── ProductCreateModal.tsx          (60 lines)
│   │
│   ├── ClientSelectDialog.tsx          (80 lines)
│   ├── ClientCreateModal.tsx           (60 lines)
│   │
│   ├── UnitSelectDialog.tsx            (60 lines)
│   │
│   └── AccountSelectDialog.tsx         (60 lines)
│
├── purchases/
│   ├── PurchaseHeaderEdit.tsx          (MODIFIED)
│   │   ├─ Add: <ClientSelectDialog />
│   │   └─ Remove: old ClientSelector
│   │
│   └── PurchaseItemsEdit.tsx           (MODIFIED)
│       ├─ Add: <ProductSelectDialog />
│       ├─ Modify [Add Item] button
│       └─ Modify item row click handler
│
lib/
├── accounting/
│   └── totalsHelper.ts                 (NO CHANGES)
│
└── hooks/
    ├── useSelection.ts                 (50 lines)
    ├── useSearch.ts                    (40 lines)
    └── useEntityCreate.ts              (30 lines)
```

---

## 🔧 COMPONENT SPECIFICATIONS

### 1. EntitySelectDialog<T>

**Purpose:** Universal selection dialog for any entity

```typescript
interface EntitySelectDialogProps<T> {
  // Display
  open: boolean;
  onClose: () => void;
  title: string;
  
  // Data
  items: T[];
  loading?: boolean;
  
  // Columns
  columns: ColumnDef<T>[];
  
  // Search
  searchFields: (keyof T)[];
  onSearch: (query: string) => void;
  
  // Actions
  onSelect: (item: T) => void;
  onCreateNew?: () => void;
  
  // Customization
  width?: string;
  height?: string;
  searchPlaceholder?: string;
}

export function EntitySelectDialog<T>({
  open,
  onClose,
  title,
  items,
  columns,
  searchFields,
  onSearch,
  onSelect,
  onCreateNew,
  loading = false,
  width = "600px",
  height = "500px"
}: EntitySelectDialogProps<T>) {
  // Implementation
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ width, height }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <EntitySearch 
          onSearch={onSearch}
          placeholder={searchPlaceholder}
        />
        
        <EntityTable<T>
          items={items}
          columns={columns}
          loading={loading}
          onSelect={onSelect}
        />
        
        {onCreateNew && (
          <DialogFooter>
            <Button 
              onClick={onCreateNew}
              variant="ghost"
            >
              + Create New
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

### 2. EntitySearch

**Purpose:** Search/filter logic

```typescript
interface EntitySearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function EntitySearch({
  onSearch,
  placeholder = "Search...",
  debounceMs = 300
}: EntitySearchProps) {
  const [query, setQuery] = useState("");
  
  const debouncedSearch = useCallback(
    debounce((q: string) => onSearch(q), debounceMs),
    []
  );
  
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        debouncedSearch(e.target.value);
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded"
    />
  );
}
```

---

### 3. EntityTable

**Purpose:** Display items in table format

```typescript
interface EntityTableProps<T> {
  items: T[];
  columns: ColumnDef<T>[];
  loading: boolean;
  onSelect: (item: T) => void;
}

export function EntityTable<T>({
  items,
  columns,
  loading,
  onSelect
}: EntityTableProps<T>) {
  if (loading) return <div>Loading...</div>;
  if (items.length === 0) return <div>No items found</div>;
  
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.accessorKey}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr
            key={idx}
            onClick={() => onSelect(item)}
            className="cursor-pointer hover:bg-blue-50"
          >
            {columns.map((col) => (
              <td key={col.accessorKey}>
                {col.cell ? col.cell(item) : String(item[col.accessorKey])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### 4. ProductSelectDialog

```typescript
interface ProductSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  onCreateNew?: () => void;
}

export function ProductSelectDialog({
  open,
  onClose,
  onSelect,
  onCreateNew
}: ProductSelectDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async (query: string) => {
    setLoading(true);
    const res = await fetch(`/api/products?search=${query}`);
    const data = await res.json();
    setProducts(data.items);
    setLoading(false);
  };
  
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: (product) => product.code
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: (product) => product.name
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: (product) => product.unit
    },
    {
      accessorKey: "vatRate",
      header: "VAT %",
      cell: (product) => `${product.vatRate}%`
    },
    {
      accessorKey: "defaultPrice",
      header: "Price",
      cell: (product) => `${product.defaultPrice.toFixed(2)}`
    }
  ];
  
  return (
    <EntitySelectDialog<Product>
      open={open}
      onClose={onClose}
      title="Select Product"
      items={products}
      columns={columns}
      searchFields={["name", "code"]}
      onSearch={handleSearch}
      onSelect={onSelect}
      onCreateNew={onCreateNew}
      loading={loading}
    />
  );
}
```

---

### 5. ClientSelectDialog

```typescript
interface ClientSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (client: Client) => void;
  onCreateNew?: () => void;
}

export function ClientSelectDialog({
  open,
  onClose,
  onSelect,
  onCreateNew
}: ClientSelectDialogProps) {
  // Similar to ProductSelectDialog
  // Different columns: Code, Name, VAT#, Country, Payment Terms
}
```

---

## 🔄 DATA FLOW

### Adding Item to Purchase

```
User clicks [Add Item]
  ↓
setProductDialogOpen(true)
  ↓
ProductSelectDialog renders
  ↓
User searches "mac"
  ↓
handleSearch() → fetch /api/products?search=mac
  ↓
API returns [MacBook Pro, MacBook Air, ...]
  ↓
setProducts(results)
  ↓
EntityTable renders results
  ↓
User clicks "MacBook Pro"
  ↓
onSelect(macbookProduct)
  ↓
Callback in PurchaseItemsEdit:
  {
    const newItem = {
      itemName: macbookProduct.name,
      itemCode: macbookProduct.code,
      unit: macbookProduct.unit,
      vatRate: macbookProduct.vatRate,
      quantity: 1,
      priceWithoutVat: macbookProduct.defaultPrice
    };
    const updated = [...items, newItem];
    onChange(updated);
    onTotalsChange(calculateDocumentTotals(updated));
  }
  ↓
setProductDialogOpen(false)
  ↓
Dialog closes
  ↓
PurchaseItemsEdit re-renders with new item row
```

---

## 🎨 UI/UX DETAILS

### Dialog Styling
```
Width: 600-800px
Height: 500-600px
Modal: centered on screen
Backdrop: semi-transparent dark
Smooth transitions
Keyboard support: Esc to close
```

### Table Styling
```
Header: bold, background
Rows: alternating background (optional)
Hover: highlight row
Click: select row
Scrollable: vertical scroll for many items
```

### Search Styling
```
Icon: search icon (lucide-react)
Placeholder: "Search by name, code, barcode..."
Clear button: appears when text entered
Debounce: 300ms
```

---

## 🧪 TESTING STRATEGY

### Unit Tests
```
✓ EntitySelectDialog renders
✓ EntitySearch filters correctly
✓ EntityTable displays items
✓ onSelect callback fires
```

### Integration Tests
```
✓ ProductSelectDialog + PurchaseItemsEdit
✓ ClientSelectDialog + PurchaseHeaderEdit
✓ Create inline + auto-select
✓ Search + select + close + auto-fill
```

### E2E Tests
```
✓ User flow: Add Item → Search → Select → Auto-fill
✓ User flow: Create Client → Select → Auto-fill
✓ Multiple selections in same form
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Foundation
- [ ] EntitySelectDialog component
- [ ] EntitySearch component
- [ ] EntityTable component
- [ ] Hooks: useSelection, useSearch
- [ ] Type definitions

### Phase 2: Product Selection
- [ ] ProductSelectDialog
- [ ] ProductCreateModal
- [ ] API: GET /products?search=
- [ ] Integration: PurchaseItemsEdit
- [ ] Test: search + select + auto-fill

### Phase 3: Client Selection
- [ ] ClientSelectDialog
- [ ] ClientCreateModal
- [ ] API: GET /clients?search=
- [ ] Integration: PurchaseHeaderEdit
- [ ] Test: search + select + auto-fill

### Phase 4: Additional Entities
- [ ] UnitSelectDialog
- [ ] AccountSelectDialog
- [ ] Tests for all dialogs
- [ ] Performance optimization

---

**Ready to build?** ✅

