# OSV Auth Fix (Task 26.1)

## File: `app/api/company/[companyId]/reports/osv/route.ts`

### Replace:
```ts
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
```

### With:
```ts
    if (error instanceof Response) {
      return error;
    }
```

Note: OSV has no setHours issue — its date params are optional and use `new Date()` directly without end-of-day adjustment.
