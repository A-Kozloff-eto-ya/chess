# План рефакторинга и устранения недостатков

> Приоритет: **CRITICAL** > **HIGH** > **MEDIUM** > **LOW**
> Оценка трудозатрат: **S** (1-2 часа), **M** (3-5 часов), **L** (1-2 дня), **XL** (3-5 дней)

---

## 1. Критические проблемы безопасности (CRITICAL)

### ~~1.1 Проверить и удалить секреты из истории коммитов~~ ✅ ИСПРАВЛЕНО
- `.env` никогда не был в истории коммитов (`git log --all -- .env` пуст). `.gitignore` корректен.

### ~~1.2 Удалить `stockfish.exe` из корня проекта~~ ✅ ИСПРАВЛЕНО
- `/stockfish.exe` и `/stockfish` добавлены в `.gitignore`.

### ~~1.3 Убрать fallback session password~~ ✅ ИСПРАВЛЕНО
- `nuxt.config.ts:30` теперь `password: process.env.NUXT_SESSION_PASSWORD ?? ''` — известный fallback удалён.

### ~~1.4 Добавить rate limiting~~ ✅ ИСПРАВЛЕНО
- `server/middleware/rateLimit.ts` реализован с правилами: login/register — 5/мин, engine — 100/мин, games — 20/мин, общий — 120/мин.

### ~~1.5 Валидация параметров Stockfish~~ ✅ ИСПРАВЛЕНО
- Zod-схема добавлена (`movetime`, `elo`, `sanMoves`, `uciMoves`). Лимит 2 одновременных процесса.

---

## 2. Архитектурные проблемы (HIGH)

### ~~2.1 Объединить WebSocket-соединения~~ ✅ ИСПРАВЛЕНО
- **Решение:** Создан `app/composables/useSharedWebSocket.ts` — singleton с `useState` для WS-соединения. `useChessWebSocket` и `useNotifications` используют общее соединение.

### ~~2.2 Внедрить расчёт рейтинга ELO~~ ✅ ИСПРАВЛЕНО
- **Файл:** `server/routes/_ws.ts`
- **Решение:** Добавлена функция `updateRatings()`, вызывается при всех сценариях завершения игры: checkmate/draw (move), resign, accept_draw. Обновляет рейтинг обоих игроков в БД через `calculateNewRating()`.

### ~~2.3 Персистентность игровых комнат~~ ✅ ИСПРАВЛЕНО
- **Решение:** Добавлены колонки `whiteTimeMs`, `blackTimeMs`, `lastMoveAt` в таблицу `games`. Функция `persistRoomState()` в `gameRooms.ts` сохраняет состояние при каждом ходе. Плагин `restoreRooms.ts` восстанавливает active/waiting комнаты из БД при старте. `clockSync` каждые 10с делает snapshot таймеров в БД. Fallback в `_ws.ts` join handler восстанавливает таймеры из БД при первом подключении.

### ~~2.4 Устранить race condition при присоединении к игре~~ ✅ ИСПРАВЛЕНО
- **Решение:** Добавлен `withRoomLock()` mutex в `gameRooms.ts`. Join handler в `_ws.ts` обёрнут в lock — атомарное назначение цвета.

### ~~2.5 Синхронизация шахматных часов~~ ✅ ИСПРАВЛЕНО
- **Решение:** Сервер отправляет whiteTime/blackTime при каждом ходе + `clock_sync` каждые 10с через `server/plugins/clockSync.ts`. Flag detection на сервере — при ходе проверяется просрочка времени (timeout → game_over). Клиент корректирует таймер по `state_update` и `clock_sync`.

---

## 3. Проблемы качества кода (MEDIUM)

### ~~3.1 Устранить повсеместное использование `any`~~ ✅ ИСПРАВЛЕНО
- **Решение:** Все 53+ `any` устранены. Добавлены типы: `FetchError`, `FriendsResponse`, `GameMove`, `EngineBestmoveResponse` в `shared/types/index.ts`; `WsPeer`, `DbGameRow`, `WsMessage` в `_ws.ts`; `FriendRow`, `PendingRow`, `SentRow` в `friends/index.get.ts`; `UserInfo` используется в `peerRegistry.ts`, `gameRooms.ts`. Catch-блоки заменены на `e as FetchError` / `e as unknown`. Drizzle `.then((r: any) => r[0])` заменены на типизированные assertions.

### ~~3.2 Извлечь дублированный код~~ ✅ ИСПРАВЛЕНО
- **Решение:** Создан `shared/constants.ts` (`parseTimeControl`, `DEFAULT_TIME_CONTROL`), `app/composables/useChessClock.ts` (`formatTime`, `startTimer`, `stopTimer`, `resetClock`). Обе страницы `play/[id].vue` и `play-ai.vue` используют общий composable.

### ~~3.3 Разделить страницу `play/[id].vue` на composables~~ ✅ ИСПРАВЛЕНО
- **Решение:** Страница 331→127 строк. Логика в `useGameSession.ts` (222 строки) и `useChessClock.ts` (61 строка). Страница — только шаблон + действия resign/draw.

### ~~3.4 Удалить debug `console.log`~~ ✅ ИСПРАВЛЕНО
- **Файл:** `app/composables/useChessWebSocket.ts`
- **Решение:** 8 `console.log` заменены на условные `if (dev)` логгеры, 1 `console.error` в onerror удалён

### ~~3.5 Обработать empty `catch {}` блоки~~ ✅ ИСПРАВЛЕНО
- **Решение:** Все 12 empty catch блоков обработаны: серверные — `console.error` с контекстом, клиентские — `console.error` с префиксом модуля, peer.send — комментарий `/* peer already closed */`

---

## 4. Оптимизация движка (HIGH)

### ~~4.1 Stockfish process pool~~ ✅ ИСПРАВЛЕНО
- **Решение:** `bestmove.post.ts` переведён на `submitToPool()` из `server/utils/stockfishPool.ts`. Пул держит 2 постоянных процесса Stockfish с очередью до 10 задач. Убран `spawn` на каждый запрос и ручной подсчёт `activeProcesses`.

---

## 5. Тестирование (MEDIUM)

### ~~5.1 Настройка тестового фреймворка~~ ✅ ИСПРАВЛЕНО
- **Решение:** Установлен vitest 4.x, добавлен `vitest.config.ts`, скрипты `test` / `test:watch` в `package.json`.

### ~~5.2 Unit-тесты ключевых модулей~~ ✅ ИСПРАВЛЕНО
- **Решение:** 46 тестов в 4 файлах:
  - `server/utils/rating.test.ts` — ELO расчёт (K-факторы, границы, симметрия)
  - `server/utils/chess.test.ts` — валидация ходов, game over, PGN, FEN
  - `shared/constants.test.ts` — parseTimeControl, дефолты
  - `server/api/schemas.test.ts` — Zod-схемы: engine, move, join, login, register

---

## 6. Accessibility (LOW)

### ~~6.1 Улучшить accessibility~~ ✅ ИСПРАВЛЕНО
- **Решение:**
  - Skip-to-content link в default layout
  - `role="main"` + `id="main-content"` на `<main>`
  - `aria-label` на навигации, кнопках меню, поиске, уведомлениях
  - `role="timer"` + `aria-label` на шахматных часах (play, play-ai)
  - `role="alert"` на game over блоках
  - `role="status"` на индикаторе хода, AI thinking, move count
  - `role="list"` + `role="listitem"` в MoveHistory

---

## Порядок выполнения (рекомендуемый)

| Этап | Задачи | Срок | Статус |
|------|--------|------|--------|
| ~~1~~ | ~~1.1-1.5 (Безопасность)~~ | ~~1 неделя~~ | ✅ Done |
| ~~2~~ | ~~3.6, 3.4, 4.2, 4.4 (Быстрые фиксы)~~ | ~~2-3 дня~~ | ✅ Done |
| ~~3~~ | ~~2.2, 3.1, 3.2 (Типизация + ELO)~~ | ~~1 неделя~~ | ✅ Done |
| ~~4~~ | ~~2.1, 3.7, 4.3 (WS + уведомления)~~ | ~~1-2 недели~~ | ✅ Done |
| ~~5~~ | ~~2.4, 2.5, 3.3, 3.5 (Архитектура игры)~~ | ~~2 недели~~ | ✅ Done |
| ~~6~~ | ~~2.3 (Персистентность комнат)~~ | ~~1-2 недели~~ | ✅ Done |
| ~~7~~ | ~~4.1 (Stockfish pool)~~ | ~~1-2 недели~~ | ✅ Done |
| ~~8~~ | ~~5.1-5.2 (Тестирование)~~ | ~~1-2 недели~~ | ✅ Done |
| ~~9~~ | ~~6.1 (Accessibility)~~ | ~~3-5 дней~~ | ✅ Done |
