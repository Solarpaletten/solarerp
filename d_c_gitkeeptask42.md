Принято.
Даю чёткое **D=>C ТЗ для Claude**. Без воды. Enterprise-уровень.

---

# D=>C — Task 42

# Migration v2: Enterprise Client Model

## 🎯 Цель

Перевести текущую модель `Client` на Enterprise v2 уровень:

* расширенный тип клиента
* строгая финансовая модель
* подготовка к multi-currency
* подготовка к debtor ledger
* сохранение backward compatibility
* безопасная миграция существующих данных

---

# 1️⃣ Обязательные изменения в schema.prisma

## 1.1 Добавить enum ClientType

```prisma
enum ClientType {
  COMPANY
  SOLE_TRADER
  INDIVIDUAL
  GOVERNMENT
  NON_PROFIT
}
```

---

## 1.2 Обновить модель Client

### Изменить:

* удалить `isJuridical Boolean`
* добавить `type ClientType`
* добавить `isActive Boolean @default(true)`
* изменить `creditLimit Decimal?` → `Decimal? @db.Decimal(18,2)`
* добавить `creditLimitCurrency String?`
* добавить unique и индексы

---

### Новая модель должна выглядеть так:

```prisma
model Client {
  id        String @id @default(cuid())
  companyId String

  // Identity
  name        String
  shortName   String?
  code        String?
  type        ClientType
  isActive    Boolean @default(true)

  // Legal & Tax
  vatCode             String?
  businessLicenseCode String?
  residentTaxCode     String?
  location            ClientLocation

  // Contact
  email       String?
  phoneNumber String?
  faxNumber   String?
  contactInfo String?
  notes       String?

  // Financial
  payWithinDays       Int?
  creditLimit         Decimal? @db.Decimal(18,2)
  creditLimitCurrency String?
  automaticDebtRemind Boolean  @default(false)

  // Individual
  birthday DateTime?

  // Registration
  registrationCountryCode String?
  registrationCity        String?
  registrationAddress     String?
  registrationZipCode     String?

  // Correspondence
  correspondenceCountryCode String?
  correspondenceCity        String?
  correspondenceAddress     String?
  correspondenceZipCode     String?

  // Banking
  bankAccount   String?
  bankName      String?
  bankCode      String?
  bankSwiftCode String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, code])
  @@index([companyId])
  @@index([companyId, vatCode])
  @@map("clients")
}
```

---

# 2️⃣ Data Migration Logic (КРИТИЧНО)

Claude обязан:

1. Сохранить существующие данные
2. Для всех существующих клиентов:

   * если `isJuridical = true` → `type = COMPANY`
   * если `isJuridical = false` → `type = INDIVIDUAL`
3. Установить:

   * `isActive = true`
   * `creditLimitCurrency = "EUR"` (если null)

---

# 3️⃣ Prisma Migration Steps

Claude должен:

```bash
npx prisma migrate dev --name client_enterprise_v2
```

Проверить:

* нет потери данных
* нет null constraint violations
* нет конфликтов unique

---

# 4️⃣ Обновить Client API

Обязательно:

* POST /api/company/[companyId]/clients
* PUT /api/company/[companyId]/clients/[clientId]

Должны:

* принимать `type`
* валидировать `ClientType`
* валидировать Decimal поля
* валидировать unique code per company

---

# 5️⃣ НЕ ДЕЛАТЬ пока:

❌ Не менять SaleDocument
❌ Не менять PurchaseDocument
❌ Не внедрять clientId FK

Это будет Task 43 (Ledger Linking).

---

# 6️⃣ Acceptance Criteria

Claude обязан подтвердить:

* [ ] Миграция выполнена
* [ ] Старые данные сохранены
* [ ] Новые поля доступны через API
* [ ] Unique работает
* [ ] VAT индекс работает
* [ ] Build проходит
* [ ] Seed работает

---

# 7️⃣ Отчёт от Claude должен содержать:

1. Diff schema (до/после)
2. Migration SQL
3. Проверку существующих клиентов
4. Подтверждение backward compatibility
5. Обновлённый Client API код

---

# 🎯 Архитектурный результат

После Task 42:

Solar ERP переходит:

MVP Clients → Enterprise Client Ledger Ready Model

---

Готов к передаче Claude.

Когда он пришлёт отчёт — я проведу аудит его работы.

Мы строим систему правильно.
