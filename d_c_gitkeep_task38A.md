Отлично.
Значит сейчас файла **new/page.tsx нет** — делаем правильно и архитектурно чисто.

Ниже даю ТЗ Claude — Task 38A
(Создание Draft + Redirect)

---

# 🧠 TASK 38A — New Purchase Draft Redirect Page

## 📁 Файл:

```
app/(dashboard)/company/[companyId]/purchases/new/page.tsx
```

---

# 🎯 Цель

При открытии `/purchases/new`:

1. Создать draft через POST
2. Получить `purchase.id`
3. Сделать `router.replace` на:

   ```
   /company/[companyId]/purchases/[purchaseId]
   ```
4. Показать loader пока создаётся

---

# 📋 Требования

### 1️⃣ Client Component

```ts
'use client';
```

---

### 2️⃣ Получить:

```ts
const router = useRouter();
const params = useParams();
const companyId = params.companyId as string;
```

---

### 3️⃣ useEffect → createDraft()

* POST `/api/company/${companyId}/purchases`
* method: POST
* без body
* без headers

---

### 4️⃣ Обработка ответа

Если:

```ts
json?.data?.id
```

→ `router.replace(...)`

Если нет:

→ console.error
→ показать error state

---

### 5️⃣ Loader UI

Пока создаётся:

Центрированный loader:

```tsx
<div className="p-6 flex items-center justify-center min-h-[300px]">
  <Loader2 className="animate-spin text-gray-300" size={24} />
</div>
```

---

# 💻 Ожидаемая финальная реализация

Claude должен написать примерно вот это:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NewPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createDraft() {
      try {
        const res = await fetch(`/api/company/${companyId}/purchases`, {
          method: 'POST',
        });

        if (!res.ok) {
          throw new Error('Failed to create draft');
        }

        const json = await res.json();

        if (!json?.data?.id) {
          throw new Error('Invalid response structure');
        }

        router.replace(
          `/company/${companyId}/purchases/${json.data.id}`
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    createDraft();
  }, [companyId, router]);

  if (error) {
    return (
      <div className="p-6 text-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <Loader2 className="animate-spin text-gray-300" size={24} />
    </div>
  );
}
```

---

# 🚀 После этого

Workflow станет:

```
/purchases → "+"
→ /purchases/new
→ POST draft
→ redirect
→ /purchases/{id}
→ 37A + 37B + 37C
```

---

Если хочешь — дальше можем сразу идти в:

Task 38B — Editable Draft Form
(и превращаем read-view в editable режим DRAFT)

Готов?
