➜  solar-erp git:(main) ✗ npx prisma migrate dev --name add_sessions_and_priority
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "solarerp", schema "public" at "207.154.220.86:5433"

Applying migration `20260220004505_add_sessions_and_priority`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260220004505_add_sessions_and_priority/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v5.22.0) to ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client
 in 73ms


➜  solar-erp git:(main) ✗ npx prisma generate
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v5.22.0) to ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 76ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Curious about the SQL queries Prisma ORM generates? Optimize helps you enhance your visibility: https://pris.ly/tip-2-optimize

➜  solar-erp git:(main) ✗ rm -rf next                                      
➜  solar-erp git:(main) ✗ npx prisma generate
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v5.22.0) to ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 84ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate

➜  solar-erp git:(main) ✗ npx prisma db seed                               

Environment variables loaded from .env
Running seed command `ts-node prisma/seed.ts` ...
(node:10542) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/prisma/seed.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
🌱 Seeding Solar ERP database...
✅ Seed completed successfully
--------------------------------
Tenant: Solar Group
User: solar@solar.com (password: admin123)
Company: Solar ERP Demo

🌱  The seed command has been executed.
➜  solar-erp git:(main) ✗ pnpm dev                                         

> solarerp@0.1.0 dev /Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp
> next dev

  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
  - Environments: .env

 ✓ Starting...
npm warn Unknown env config "npm-globalconfig". This will stop working in the next major version of npm.
npm warn Unknown env config "verify-deps-before-run". This will stop working in the next major version of npm.
npm warn Unknown env config "_jsr-registry". This will stop working in the next major version of npm.
 ✓ Ready in 1663ms
 ✓ Compiled /middleware in 125ms (71 modules)
 ○ Compiling / ...
 ✓ Compiled / in 1599ms (461 modules)
 GET / 200 in 1712ms
 GET / 200 in 1661ms
 ✓ Compiled /login in 105ms (507 modules)
 ✓ Compiled /api/auth/login in 116ms (289 modules)
 POST /api/auth/login 200 in 1394ms
 POST /api/auth/login 200 in 1388ms
 POST /api/auth/login 200 in 276ms
 POST /api/auth/login 200 in 263ms
 POST /api/auth/login 401 in 211ms
 POST /api/auth/login 401 in 200ms
 POST /api/auth/login 200 in 286ms
 POST /api/auth/login 200 in 281ms
 POST /api/auth/login 200 in 291ms
 POST /api/auth/login 200 in 287ms
 GET / 200 in 52ms
 GET / 200 in 49ms
 GET /login?from=%2Fcompany%2F1%2Fdashboard 200 in 27ms
 GET /login?from=%2Fcompany%2F1%2Fdashboard 200 in 22ms
 POST /api/auth/login 200 in 411ms
 POST /api/auth/login 200 in 406ms
 ✓ Compiled /company/[companyId]/dashboard in 162ms (549 modules)
 ✓ Compiled /api/account/companies/[companyId] in 48ms (303 modules)
 GET /api/account/companies/1 404 in 797ms
 GET /api/account/companies/1 404 in 794ms
 GET /api/account/companies/1 404 in 293ms
 GET /api/account/companies/1 404 in 290ms
 ✓ Compiled /account/companies in 144ms (583 modules)
 GET /account/companies 200 in 165ms
 GET /account/companies 200 in 162ms
 ✓ Compiled /api/account/companies in 40ms (321 modules)
 GET /api/account/companies 200 in 452ms
 GET /api/account/companies 200 in 449ms
 GET /account/companies 200 in 32ms
 GET /account/companies 200 in 29ms
 GET / 200 in 33ms
 GET / 200 in 24ms
 GET /api/account/companies 200 in 390ms
 GET /api/account/companies 200 in 388ms
 GET /api/account/companies 200 in 307ms
 GET /api/account/companies 200 in 304ms
 GET /login 200 in 30ms
 GET /login 200 in 28ms
 POST /api/auth/login 200 in 433ms
 POST /api/auth/login 200 in 423ms
 GET /api/account/companies 200 in 303ms
 GET /api/account/companies 200 in 299ms
 GET /api/account/companies 200 in 311ms
 GET /api/account/companies 200 in 308ms
 GET /api/account/companies/cmltun9z80004149ccrkzdm5p 200 in 289ms
 GET /api/account/companies/cmltun9z80004149ccrkzdm5p 200 in 287ms
 GET /api/account/companies/cmltun9z80004149ccrkzdm5p 200 in 278ms
 GET /api/account/companies/cmltun9z80004149ccrkzdm5p 200 in 275ms
