# TASK30_REPORT.md — Import German Chart of Accounts (SKR03)

## Scope

- ✅ `POST /api/company/:id/chart-of-accounts/import`
- ✅ CSV parsing (built-in, no dependencies)
- ✅ SKR03 dataset: 289 accounts
- ✅ Duplicate skip by code+companyId
- ✅ Atomic via transaction + createMany + skipDuplicates
- ✅ Tenant isolation
- ✅ No migration, no schema changes
- ✅ No deletes, no updates — pure add-import

## Files

| File | Type | Lines |
|------|------|-------|
| `app/api/company/[companyId]/chart-of-accounts/import/route.ts` | NEW | 163 |
| `data/skr03.csv` | DATA | 290 |

## Apply

```bash
tar -xzf task30-skr03-import.tar.gz -C .
# No migration needed
```

## API

### POST /api/company/:id/chart-of-accounts/import

Two input modes:

**Mode A: JSON body**
```bash
curl -X POST http://localhost:3000/api/company/{id}/chart-of-accounts/import \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{"csv": "code,name,type\n1000,Bank,ASSET\n1200,Forderungen,ASSET"}'
```

**Mode B: Raw CSV**
```bash
curl -X POST http://localhost:3000/api/company/{id}/chart-of-accounts/import \
  -H 'Content-Type: text/csv' \
  -H 'Cookie: session=...' \
  --data-binary @data/skr03.csv
```

### Response
```json
{
  "created": 289,
  "skipped": 0,
  "totalInFile": 289
}
```

## SKR03 Dataset

289 accounts covering:

| Type | Count | Range |
|------|-------|-------|
| ASSET | ~80 | 0010–1590 |
| LIABILITY | ~35 | 0900–1791 |
| EQUITY | ~12 | 0800–9200 |
| INCOME | ~60 | 2700–8980 |
| EXPENSE | ~100 | 2000–4999 |

Key accounts for testing:
- `1000` Kasse (Cash)
- `1020` Bank
- `1200` Forderungen (Accounts Receivable)
- `1600` Verbindlichkeiten (Accounts Payable)
- `1776` Umsatzsteuer 19% (Output VAT)
- `1400` Abziehbare Vorsteuer (Input VAT)
- `8400` Erlöse 19% (Revenue 19%)
- `3300` Wareneingang (Cost of Goods)
- `4120` Gehälter (Salaries)

## Verification

```bash
# 1. Import SKR03
curl -X POST http://localhost:3000/api/company/{id}/chart-of-accounts/import \
  -H 'Content-Type: text/csv' \
  -H 'Cookie: session=...' \
  --data-binary @data/skr03.csv

# → { "created": 289, "skipped": 0, "totalInFile": 289 }

# 2. Idempotent — run again
curl -X POST http://localhost:3000/api/company/{id}/chart-of-accounts/import \
  -H 'Content-Type: text/csv' \
  -H 'Cookie: session=...' \
  --data-binary @data/skr03.csv

# → { "created": 0, "skipped": 289, "totalInFile": 289 }

# 3. Verify accounts
curl http://localhost:3000/api/company/{id}/accounts \
  -H 'Cookie: session=...'

# → 289+ accounts

# 4. Create sale with real SKR03 accounts
curl -X POST http://localhost:3000/api/company/{id}/sales \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{
    "saleDate": "2026-02-28",
    "series": "R", "number": "0001",
    "clientName": "Test GmbH", "warehouseName": "Main",
    "operationType": "SALE", "currencyCode": "EUR",
    "items": [{"itemName": "Service", "quantity": 1, "priceWithoutVat": 1000}],
    "journal": {
      "debitAccountId": "{id_of_1200}",
      "creditAccountId": "{id_of_8400}"
    }
  }'

# 5. Trial balance still balanced
curl 'http://localhost:3000/api/company/{id}/reports/trial-balance?from=2026-01-01&to=2026-12-31' \
  -H 'Cookie: session=...'

# → isBalanced: true
```
