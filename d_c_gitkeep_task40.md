D=>C (Dashka→Claude) ТЗ: аудит + тестирование модуля Purchases (приход товаров) “под ключ” + ревизия файлов
Роль: консультант-аудитор бухгалтерского учета (но проверка выполняется в коде/флоу продукта).

0) Контекст и цель

Мы уже разделили “создание черновика” и “постинг”. Сейчас нужно проверить весь поток “Приход товаров”:

Список документов закупок (Purchases list)

Создание нового документа через Draft endpoint и редирект

Страница документа (DRAFT редактируется)

PUT сохранение (валидировать, чтобы не было мусора)

POSTING (Task 39): DRAFT → POSTED, создание проводок/склада/FIFO в одной транзакции

После POSTED — документ read-only, список отражает статус и суммы

1) Обязательные проверки (аудит “как бухгалтер”)
1.1 Документ прихода (PurchaseDocument)

Должны быть корректные поля: дата, поставщик, склад, валюта, тип операции.

В DRAFT допускаются пустые поля/нет товаров, но при попытке post — строгая валидация.

Серия/номер не должны конфликтовать (уникальность + автонумерация в draft).

1.2 Строки товаров (items)

В DRAFT можно редактировать.

Перед Posting:

min 1 item

itemName не пустой

quantity > 0

priceWithoutVat ≥ 0

vatRate 0..100 (если есть)

1.3 Бухгалтерия / проводки (после Posting)

Проводка одна на документ: DR Inventory (или выбранный дебет) / CR Payable (или выбранный кредит) на сумму net total.

Запретить Posting при пустых accounts (debitAccountId/creditAccountId).

1.4 Склад / FIFO (после Posting)

StockMovement IN по каждому item.

FIFO lot по каждому item, quantity и unitCost соответствуют item.

2) Технические проверки (как инженер)
2.1 Роуты API (обязательный список)

Проверь существование и поведение:

GET /api/company/[companyId]/purchases

возвращает { data: PurchaseDocument[] }

include items (иначе total не посчитать в UI)

POST /api/company/[companyId]/purchases/draft (Task 38A)

создает минимальный DRAFT, возвращает { data: { id } }

автонумерация серии P

GET /api/company/[companyId]/purchases/[purchaseId] (Task 37A)

возвращает документ + items

PUT /api/company/[companyId]/purchases/[purchaseId] (Task 38B + 38B.A)

обновляет только DRAFT

делает replace items (deleteMany → createMany)

добавь/проверь валидацию (чтобы не сохранить явный мусор)

POST /api/company/[companyId]/purchases/[purchaseId]/post (Task 39)

DRAFT → POSTED

в одной транзакции: validate → assertPeriodOpen → journal → stock IN → FIFO → status POSTED

ошибки возвращает корректными status codes

2.2 UI страницы (обязательный список)

/company/[companyId]/purchases — список

/company/[companyId]/purchases/new — создает draft и редиректит

/company/[companyId]/purchases/[purchaseId] — dual mode (DRAFT edit / POSTED read-only)

3) Что именно нужно сделать (по шагам)
Шаг A — проверить и “вылечить” текущие UI-файлы Purchases

Сверить контракты props между PurchasesPage и PurchaseTable.

Ранее был конфликт (PurchaseTable ожидал selectedIds/onSelectionChange/isLoading), сейчас финальная версия упрощена.

Убедиться, что сборка не падает и TS не ругается.

Проверить защиту от “undefined items”:

В таблице: purchase.items?.length ?? 0 и calcTotal(purchase.items || []) ✅

Добавить кнопку “New Purchase” (если ещё нет) — это опционально, но полезно для UX.

Это не ломает бухгалтерию, но ускоряет тест.

Шаг B — интеграционный тест end-to-end вручную (минимум)

Сделать прогон в браузере:

Открыть список Purchases → должно загрузиться без ошибок.

Нажать “New” (или напрямую /purchases/new) → должен создаться DRAFT → редирект на /purchases/[id].

Заполнить header + 2 items → Save → перезагрузка страницы → данные сохраняются.

Нажать Post → должен стать POSTED, UI становится read-only, статус зелёный в списке.

Проверить в БД (prisma studio/SQL) что появились:

journalEntry (+ lines)

stockMovements IN

stockLots FIFO

purchase.status = POSTED

Шаг C — вывести “чистые версии” ключевых файлов

Нужно зафиксировать в PR/ответе итоговые версии (без мусора/экспериментов):

app/(dashboard)/company/[companyId]/purchases/page.tsx

components/purchases/PurchaseTable.tsx

плюс проверить все файлы, содержащие Purchase* (header/items/totals/edit) и все API routes Purchases.

4) Файлы, которые нужно “поднять и проверить все”

UI:

app/(dashboard)/company/[companyId]/purchases/page.tsx

app/(dashboard)/company/[companyId]/purchases/new/page.tsx

app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx

components/purchases/PurchaseTable.tsx

components/purchases/PurchaseHeader.tsx

components/purchases/PurchaseHeaderEdit.tsx

components/purchases/PurchaseItemsTable.tsx

components/purchases/PurchaseItemsEdit.tsx

components/purchases/PurchaseTotals.tsx

API:

app/api/company/[companyId]/purchases/route.ts

app/api/company/[companyId]/purchases/draft/route.ts

app/api/company/[companyId]/purchases/[purchaseId]/route.ts

app/api/company/[companyId]/purchases/[purchaseId]/post/route.ts

5) Acceptance Criteria (что считаем “готово”)

✅ /purchases/new не падает, создает DRAFT и редиректит

✅ DRAFT документ сохраняется через PUT (header + items)

✅ PUT имеет базовую валидацию (не даем сохранить явный трэш)

✅ Posting работает атомарно: либо всё создалось, либо ничего

✅ POSTED документ read-only

✅ Таблица Purchases отображает статус и корректно считает totals

✅ Нет 500 “Unexpected end of JSON input” на draft-сценарии

✅ Никаких TS ошибок по props/типам

6) “Весь файл” — актуальные версии (фиксируем)

Ниже даю полные версии двух файлов, которые ты просил вывести и зафиксировать.

app/(dashboard)/company/[companyId]/purchases/page.tsx
// app/(dashboard)/company/[companyId]/purchases/page.tsx
// ═══════════════════════════════════════════════════
// Task 38 39: Purchases Module Page
// ═══════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PurchaseTable from '@/components/purchases/PurchaseTable';
import { Loader2 } from 'lucide-react';

interface Purchase {
  id: string;
  series: string;
  number: string;
  purchaseDate: string;
  supplierName: string;
  currencyCode: string;
  status: string | null;
  totalAmount?: number;
}

export default function PurchasesPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPurchases() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/company/${companyId}/purchases`);

        if (!res.ok) {
          throw new Error('Failed to load purchases');
        }

        const json = await res.json();

        // 🔐 SAFETY: always extract array from json.data
        const safeArray = Array.isArray(json.data) ? json.data : [];

        setPurchases(safeArray);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    if (companyId) {
      loadPurchases();
    }
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-300" size={24} />
        <span className="ml-2 text-sm text-gray-400">Loading purchases...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PurchaseTable purchases={purchases} companyId={companyId} />
    </div>
  );
}
components/purchases/PurchaseTable.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';

interface PurchaseItem {
  id: string;
  itemName: string;
  quantity: string | number;
  priceWithoutVat: string | number;
}

interface PurchaseDocument {
  id: string;
  series: string;
  number: string;
  purchaseDate: string;
  supplierName: string;
  warehouseName: string;
  operationType: string;
  currencyCode: string;
  status: string | null;
  items: PurchaseItem[];
}

interface PurchaseTableProps {
  purchases: PurchaseDocument[];
  companyId: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function calcTotal(items: PurchaseItem[]): string {
  const total = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat),
    0
  );

  return total.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-50 text-gray-600 border-gray-200',
  POSTED: 'bg-green-50 text-green-600 border-green-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  LOCKED: 'bg-blue-50 text-blue-600 border-blue-200',
};

export default function PurchaseTable({ purchases, companyId }: PurchaseTableProps) {
  const router = useRouter();
  const safePurchases = Array.isArray(purchases) ? purchases : [];

  if (safePurchases.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Package className="mx-auto mb-3 text-gray-300" size={40} />
        <p className="text-gray-500 text-sm mb-1">No purchase documents yet</p>
        <p className="text-gray-400 text-xs">Create your first purchase to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Doc #
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Warehouse
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total (net)
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {safePurchases.map((purchase) => {
              const status = purchase.status || 'DRAFT';
              const statusStyle =
                STATUS_STYLES[status] || 'bg-gray-50 text-gray-500 border-gray-200';

              return (
                <tr
                  key={purchase.id}
                  onClick={() => router.push(`/company/${companyId}/purchases/${purchase.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-900">
                    {purchase.series}-{purchase.number}
                  </td>

                  <td className="px-3 py-2.5 text-gray-600 text-xs">
                    {formatDate(purchase.purchaseDate)}
                  </td>

                  <td className="px-3 py-2.5 text-gray-800 font-medium text-xs">
                    {purchase.supplierName}
                  </td>

                  <td className="px-3 py-2.5 text-gray-500 text-xs">
                    {purchase.warehouseName}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-900 tabular-nums">
                    €{calcTotal(purchase.items || [])}
                  </td>

                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${statusStyle}`}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}