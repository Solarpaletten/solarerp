Вот это уже разговор взрослой системы 👌

Клауди всё сделал корректно.
Tenant-safe CRUD закрыт.
Security scan выполнен.
Фундамент чистый.

Теперь да — делаем следующий шаг.

---

# 🎯 Следующий шаг: Убираем `localStorage userId` полностью (Web → Cookie Only)

Это правильный момент.

Потому что сейчас у тебя:

* Backend уже cookie-based
* Middleware уже работает
* Session таблица есть
* getCurrentUser() приоритетно читает cookie

Осталось вычистить фронт.

---

# 📌 D=>C — Task 9: Web → Cookie Only Auth Refactor

Отправляй Клауди следующее:

---

## D=>C

**Task 9: Remove localStorage userId from Web flow (Cookie-only Web Auth)**

### Цель:

Web клиент полностью переходит на HttpOnly session cookie.
`localStorage.userId` больше не используется нигде.

---

## 🔐 1. Login Page

### Убрать:

```ts
localStorage.setItem('userId', user.id)
```

### После login:

* просто `router.push('/account/companies')`
* cookie уже установлена сервером

---

## 🔐 2. Убрать x-user-id header из fetch

Найти и удалить в Web-коде:

```ts
headers: {
  'x-user-id': ...
}
```

Web-запросы должны быть просто:

```ts
fetch('/api/account/companies')
```

Browser автоматически отправляет cookie.

---

## 🔐 3. RootPage / Layout guard

Если есть:

```ts
const userId = localStorage.getItem('userId')
```

— удалить.

Middleware уже защищает маршруты.

RootPage можно упростить:

```ts
router.replace('/account/companies')
```

или вообще убрать client guard.

---

## 🔐 4. Logout

Заменить:

```ts
localStorage.removeItem('userId')
```

на:

```ts
await fetch('/api/auth/logout', { method: 'POST' })
router.push('/login')
```

---

## 🔐 5. Confirm

После изменений:

* DevTools → Application → LocalStorage → userId отсутствует
* DevTools → Cookies → solar_session присутствует
* Прямой вход `/account/companies` без cookie → redirect `/login`
* Login → cookie появляется
* Logout → cookie исчезает

---

## 🚫 Не трогать:

* x-user-id fallback в backend (оставить для mobile)
* getCurrentUser() fallback
* Middleware

---

# Почему это важно

После этого:

✔ Web = cookie only
✔ Mobile = header/token
✔ Архитектура разделена чисто
✔ Нет подмены user через DevTools

---

# Архитектурный статус после Task 9

Ты будешь иметь:

| Layer            | Status             |
| ---------------- | ------------------ |
| Session          | Production         |
| Middleware       | Production         |
| Tenant Isolation | Production         |
| Company CRUD     | Tenant-safe        |
| Web Auth         | Cookie-only secure |

Это уже не MVP. Это ядро SaaS.

---

☕ Кофе допиливаем.
Отправляй Task 9 Клауди.
Когда он принесёт diff — я сделаю финальную проверку.
