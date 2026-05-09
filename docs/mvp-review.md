# MVP Review — Аудит приложения Chess

> Дата: 2025-05-08
> Масштаб: ~9,700 строк кода (6,800 клиент / 2,870 сервер / ~150 shared)
> Файлов: 67 (53 клиентских, 14 серверных)

---

## Обзор текущего состояния

### Что работает
- OAuth авторизация (GitHub, Google, Yandex, Discord) + email/пароль
- Email верификация, сброс пароля
- Игра с AI (Stockfish) с настройкой ELO
- Онлайн-игра по приглашению (WebSocket)
- Post-game анализ с evaluation bar и оценкой ходов
- PGN/FEN импорт с клиентским анализом
- Чат в игре
- Система друзей (запросы, принятие, удаление)
- Тема оформления (цвета, радиус, dark/light mode)
- i18n (EN/RU, 310 ключей, полный паритет)
- 5 тем доски, 4 темы фигур
- Звуки хода, взятия, шаха, мата
- Docker-окружение (dev + prod)

### Что не работает / отсутствует для MVP
- Матчмейкинг — нет способа найти случайного соперника
- Инкремент часов — парсится, но не применяется
- Рейтинг — сломан (см. BUG-6)
- Реконнект — нет восстановления при обрыве WebSocket
- CI/CD — нет автотестов при коммите
- Docker production-билд — сломан (см. BUG-8)
- Смена пароля/email в настройках
- Spectator mode
- Flip board при просмотре партий

---

## Критические баги

### BUG-6: ELO рейтинг не работает корректно
- **Приоритет:** Критический
- **Файлы:** `server/utils/rating.ts:17`, `server/routes/_ws.ts:73`
- **Проблема:** Функция `calculateNewRating` принимает параметр `gamesPlayed` для расчёта K-фактора (K=40 для новичков, K=20 для опытных). Ни один вызов не передаёт этот параметр, поэтому все игроки всегда используют K=40. Рейтинги меняются слишком хаотично.
- **Решение:** Передавать количество сыгранных партий при расчёте рейтинга. Добавить запрос в БД для подсчёта `COUNT(*)` завершённых игр пользователя.

### BUG-7: Draw accept без проверки offer
- **Приоритет:** Критический
- **Файлы:** `server/routes/_ws.ts:412-429`
- **Проблема:** Обработчик `accept_draw` не проверяет, что ничья была предложена (`drawOfferedBy`). Любой игрок может отправить `accept_draw` в любой момент и принудительно завершить партию ничьей.
- **Решение:** Добавить поле `drawOfferedBy: string | null` в `GameRoom`. Устанавливать при `offer_draw`, проверять при `accept_draw`. Сбрасывать после хода или при `decline_draw`.

### BUG-8: Race condition на обработке ходов
- **Приоритет:** Критический
- **Файлы:** `server/routes/_ws.ts:255-364`
- **Проблема:** Обработчик `move` не обёрнут в `withRoomLock`. Два быстрых хода от одного клиента могут обработаться параллельно, что приведёт к двойному ходу.
- **Решение:** Обернуть всю логику move-обработчика в `withRoomLock(roomId, async () => { ... })`.

### BUG-9: Dockerfile использует `npm run dev` вместо `npm run build`
- **Приоритет:** Критический
- **Файлы:** `Dockerfile:9`
- **Проблема:** Строка `RUN npm run dev; test -f .output/server/index.mjs` использует `;` (ошибка игнорируется) и `dev` вместо `build`. Production-билд не создаётся.
- **Решение:** Заменить на `RUN npm run build && test -f .output/server/index.mjs`.

### BUG-10: Инкремент часов не применяется
- **Приоритет:** Высокий
- **Файлы:** `app/composables/useChessClock.ts`, `shared/constants.ts:parseTimeControl`
- **Проблема:** `parseTimeControl` корректно извлекает `increment`, но `useChessClock` не принимает и не применяет его. Игра 5+3 работает как 5+0.
- **Решение:** Добавить параметр `increment` в `useChessClock`, прибавлять `increment * 1000` мс после каждого хода текущего игрока.

---

## Уязвимости безопасности

### SEC-4: Приватный ключ в shm_identity.json не в .gitignore
- **Серьёзность:** CRITICAL
- **Файлы:** `shm_identity.json`, `.gitignore`
- **Проблема:** Файл содержит приватный ключ для SHM мониторинга и не исключён из git.
- **Решение:** Добавить `shm_identity.json` и `shm/` в `.gitignore`. Если файл уже в истории — `git filter-branch` или BFG Repo Cleaner.

### SEC-5: Реальные OAuth credentials в .env.example
- **Серьёзность:** HIGH
- **Файлы:** `.env.example:6-7`
- **Проблема:** Yandex OAuth client_id и client_secret содержат реальные значения.
- **Решение:** Заменить на пустые placeholder'ы как у GitHub/Google.

### SEC-6: Удаление аккаунта без подтверждения пароля
- **Серьёзность:** HIGH
- **Файлы:** `server/api/users/delete.post.ts`
- **Проблема:** Удаление аккаунта выполняется без повторного ввода пароля. Session hijack или CSRF приводят к безвозвратной потере аккаунта.
- **Решение:** Добавить обязательное поле `password` в body, проверять через `verifyPassword` перед удалением.

### SEC-7: Нет CSRF-защиты
- **Серьезность:** HIGH
- **Файлы:** Все POST-эндпоинты
- **Проблема:** Session-based auth без CSRF-токенов. Злоумышленник может выполнить POST-запросы от имени залогиненного пользователя через форму на другом сайте.
- **Решение:** Настроить `SameSite=Strict` или `SameSite=Lax` для session cookie + добавить CSRF-токен в заголовки (через `nuxt-auth-utils` или вручную).

### SEC-8: Path traversal в avatar serve
- **Серьёзность:** HIGH
- **Файлы:** `server/api/users/avatar-serve/[...key].get.ts`
- **Проблема:** Проверка `key.startsWith('avatars/')` пропускает `avatars/../secrets/file`. Зависит от того, обрабатывает ли `blob.serve` пути внутренне.
- **Решение:** Добавить проверку `!key.includes('..')` и `!key.includes('\0')`, или нормализовать путь через `path.resolve`.

### SEC-9: Username enumeration через регистрацию
- **Серьёзность:** MEDIUM
- **Файлы:** `server/api/auth/register.post.ts:26`
- **Проблема:** Ошибка "Email already registered" / "Username already taken" раскрывает существование аккаунта.
- **Решение:** Использовать generic-сообщение "If registration is possible, confirmation will be sent".

### SEC-10: XSS в email-шаблонах
- **Серьёзность:** MEDIUM
- **Файлы:** `server/api/auth/forgot-password.post.ts:53`, `server/api/auth/send-verification.post.ts:44`
- **Проблема:** `user.username` интерполируется в HTML без экранирования. Username вида `<script>alert(1)</script>` выполнится в email-клиенте.
- **Решение:** Экранировать HTML-спецсимволы в username перед вставкой в шаблон.

### SEC-11: X-Forwarded-For спуфинг
- **Серьёзность:** MEDIUM
- **Файлы:** `server/middleware/rateLimit.ts:13`
- **Проблема:** Доверяет `X-Forwarded-For` без проверки прокси. Обходит rate limiting через подделку заголовка.
- **Решение:** В продакшене — доверять только первому значению после известного proxy-IP, или использовать `req.socket.remoteAddress`.

### SEC-12: Нет авторизации в abort/resign (известно как SEC-1)
- **Серьёзность:** HIGH
- **Файлы:** `server/routes/_ws.ts` (обработчики `abort`, `resign`)
- **Проблема:** Любой peer в комнате может отправить abort/resign, а не только игроки.
- **Решение:** Добавить проверку `room.whitePlayerId !== userId && room.blackPlayerId !== userId`.

---

## Проблемы качества кода

### QUAL-2: Массовое дублирование кода (14 паттернов)

| Что дублируется | Где | Решение |
|---|---|---|
| `pieceIcon()` | `MoveHistory.vue`, `AnalyzedMoveList.vue`, `import.vue`, `analyze/[id].vue` | → `app/utils/chess-ui.ts` |
| `qualityBadge()`, `qualityClass()` | `import.vue`, `analyze/[id].vue` | → `app/utils/chess-ui.ts` |
| `formatEval()` | `import.vue`, `analyze/[id].vue` | → `app/utils/chess-ui.ts` |
| `parseSanMove()`, `getAttackedSquares()` | `import.vue`, `analyze/[id].vue` | → `app/utils/chess-ui.ts` |
| `buildPositions()` | `import.vue`, `game/[id].vue`, `analyze/[id].vue` | → `app/utils/chess-ui.ts` |
| `GameDetail` interface | `game/[id].vue`, `analyze/[id].vue` | → `shared/types/index.ts` |
| Logout handler | `AppHeader.vue`, `MobileDrawer.vue` | → `app/composables/useAuth.ts` |
| Join-by-code | `index.vue`, `GameInviteModal.vue` | → `app/composables/useGameJoin.ts` |
| Load pending requests | `useNotifications.ts`, `websocket.client.ts` | Удалить из плагина |
| Theme settings UI | `settings.vue`, `ThemePicker.vue` | → общий компонент |
| Keyboard navigation | `import.vue`, `useAnalysis.ts` | → `app/composables/useBoardNavigation.ts` |
| Friend actions | `profile/[username].vue`, `friends.vue` | → `app/composables/useFriends.ts` |
| SAN-to-UCI conversion | `engine/eval.post.ts`, `engine/bestmove.post.ts` | → `server/utils/chess.ts` |
| Email retry logic | `forgot-password.post.ts`, `send-verification.post.ts` | → `server/utils/email.ts` |

### QUAL-3: God-файлы, требующие декомпозиции

| Файл | Строки | Проблема | Решение |
|---|---|---|---|
| `app/pages/import.vue` | 538 | Движок анализа + навигация + UI | Вынести анализ в `composables/useEngineAnalysis.ts` |
| `app/composables/useChessground.ts` | 481 | Конфиг + ходы + состояние + premove | Разделить на `useChessConfig`, `useChessMoves` |
| `app/composables/useGameSession.ts` | 392 | Вся сессия игры + `any` типы | Типизировать WS-сообщения, разделить на sub-composables |
| `server/routes/_ws.ts` | 626 | 15+ обработчиков | Разделить на отдельные handler-файлы |
| `app/pages/profile/[username].vue` | 410 | Профиль + друзья + редактирование | Вынести friend management |

### QUAL-4: Пустые catch-блоки
- `app/composables/useSettings.ts` — `loadFromServer`, `saveToServer`
- `app/composables/useChessground.ts` — theme loading errors
- `app/composables/useAnalysis.ts`
- `app/components/common/UserSearch.vue`

**Решение:** Как минимум логировать ошибки через `console.warn`. В идеале — показывать пользователю toast.

### QUAL-5: `any` типы
- `useGameSession.ts` — все WebSocket-сообщения типизированы как `any`
- `app/types/notifications.ts:17` — `FriendshipEvent.data: any`
- `app/composables/useSettings.ts:73` — `$fetch<Record<string, any>>`

**Решение:** Использовать `ServerMessage` / `ClientMessage` из `shared/types/index.ts` для типизации WS.

### QUAL-6: Мёртвый код
- `app/composables/useOrientation.ts` — не импортируется нигде
- `app/components/game/LandscapeGameOverlay.vue` — не монтируется
- `server/utils/gameRooms.ts:removeGameRoom()` — не вызывается
- `app/pages/test-theme.vue` — dev-страница, доступна в production без guard
- Закомментированные Tournament/Spectate карточки в `app/pages/index.vue`

**Решение:** Удалить или добавить feature flag + route guard для test-theme.

### QUAL-7: Race conditions в API
| Эндпоинт | Проблема |
|---|---|
| `POST /api/games/join` | Два игрока могут одновременно присоединиться |
| `POST /api/auth/register` | SELECT + INSERT без транзакции |
| `POST /api/auth/reset-password` | Токен может использоваться дважды |
| `PUT /api/users/me` | Username uniqueness check + update без транзакции |
| `POST /api/analysis/[id]` | Два анализа могут стартовать одновременно |

**Решение:** Обернуть в SQL-транзакции (`db.transaction(async (tx) => { ... })`).

---

## Архитектурные проблемы

### ARCH-1: WebSocket singleton на module level
- `useSharedWebSocket.ts` — `shared` переменная и handler maps на module level. Не SSR-safe. Memory leak если компоненты не чистят handlers.
- **Решение:** Добавить heartbeat/ping (каждые 30 сек), cleanup при `destroy()`, лимит на handler count.

### ARCH-2: Game rooms in-memory
- Все игровые комнаты хранятся в памяти (`gameRooms` Map). При рестарте сервера — потеря состояния. Нет cleanup завершённых комнат.
- **Решение (краткосрочное):** Периодический cleanup завершённых комнат (каждые 5 мин).
- **Решение (долгосрочное):** Redis для game state (roadmap 7.1).

### ARCH-3: Stockfish pool не масштабируется
- `POOL_SIZE = 2` захардкожен. Нет respawn при краше процесса. Нет graceful shutdown.
- **Решение:** Конфигурировать через env, добавлять respawn, graceful shutdown в Nitro hook.

### ARCH-4: Нет notification persistence
- Уведомления (friend requests, game invites) только live через WebSocket. Если пользователь офлайн — пропускает.
- **Решение:** Сохранять уведомления в БД, отдавать при `/api/friends` (уже частично работает для friend requests). Добавить таблицу `notifications`.

### ARCH-5: DB schema слабые места
- `emailVerified` — `text()` вместо `boolean()` (хранит 'true'/'false')
- `moves` — `text()` JSON вместо `jsonb()` (нет queryability)
- `analysis` — `text()` JSON вместо `jsonb()`
- Нет `updated_at` ни на одной таблице
- Нет FK constraints для большинства таблиц (только `game_analyses` CASCADE)

---

## Недостающие фичи для MVP

### Критические (MVP-blockers)

| # | Фича | Описание | Оценка |
|---|---|---|---|
| F-1 | **Матчмейкинг** | Очередь ожидания + автосоздание игры при 2+ игроках с выбранным time control | XL |
| F-2 | **Инкремент часов** | Применять increment после каждого хода | S |
| F-3 | **Починка рейтинга** | Передавать gamesPlayed в calculateNewRating | S |
| F-4 | **Реконнект** | При подключении проверять активные комнаты, восстанавливать состояние | L |
| F-5 | **CI/CD** | GitHub Actions: lint → test → build → deploy | M |
| F-6 | **Docker build** | Починить Dockerfile + миграции в entrypoint | S |

### Высокий приоритет

| # | Фича | Описание | Оценка |
|---|---|---|---|
| F-7 | **Смена пароля/email** | Новые API endpoints + UI в settings | M |
| F-8 | **Блокировка пользователей** | Block/report endpoint + UI | M |
| F-9 | **Flip board** | Кнопка смены ориентации в game/analyze/import | S |
| F-10 | **PGN экспорт для AI-игр** | Скачать PGN после игры с AI | S |
| F-11 | **50-move rule** | Автообнаружение ничьей на сервере | M |
| F-12 | **SSL/TLS** | Nginx reverse proxy или Caddy для production | M |
| F-13 | **Health check** | `GET /api/health` для мониторинга | S |

### Средний приоритет

| # | Фича | Описание | Оценка |
|---|---|---|---|
| F-14 | **Spectator mode** | Список активных игр, просмотр хода партии | L |
| F-15 | **ECO / название дебюта** | Показывать название дебюта при игре/анализе | M |
| F-16 | **Таймаут часов** | Использовать `requestAnimationFrame` или 50ms интервал | S |
| F-17 | **Лобби / список игр** | Страница с текущими играми для зрителей | M |
| F-18 | **Звук нелегального хода** | Вызывать `sounds.illegal()` при неверном ходе | S |
| F-19 | **PWA** | manifest.json + service worker | M |
| F-20 | **Валидация avatar URL** | Принимать только относительные пути | S |
| F-21 | **Пароль: минимальная сложность** | Заглавная + цифра + спецсимвол | S |

---

## План реализации

### Фаза 1: Критические фиксы (1-2 дня)

> Цель: починить сломанное, закрыть критические уязвимости.

| # | Задача | Файлы | Время |
|---|---|---|---|
| 1.1 | Починить ELO рейтинг — передавать gamesPlayed | `server/routes/_ws.ts`, `server/utils/rating.ts` | 30 мин |
| 1.2 | Починить Draw exploit — добавить drawOfferedBy в GameRoom | `server/routes/_ws.ts`, `server/utils/gameRooms.ts` | 1 час |
| 1.3 | Обернуть move handler в withRoomLock | `server/routes/_ws.ts` | 30 мин |
| 1.4 | Починить Dockerfile — build вместо dev | `Dockerfile` | 10 мин |
| 1.5 | Добавить shm_identity.json в .gitignore | `.gitignore` | 5 мин |
| 1.6 | Очистить .env.example от реальных credentials | `.env.example` | 5 мин |
| 1.7 | Добавить проверку игрока в abort/resign (SEC-1/SEC-12) | `server/routes/_ws.ts` | 30 мин |
| 1.8 | Path traversal fix в avatar serve (SEC-8) | `avatar-serve/[...key].get.ts` | 15 мин |

### Фаза 2: Рефакторинг — извлечение общего кода (2-3 дня)

> Цель: устранить дублирование, уменьшить god-файлы.

| # | Задача | Результат | Время |
|---|---|---|---|
| 2.1 | Создать `app/utils/chess-ui.ts` | pieceIcon, qualityBadge, formatEval, parseSanMove, getAttackedSquares, buildPositions | 2 часа |
| 2.2 | Создать `app/composables/useAuth.ts` | Общий logout handler | 30 мин |
| 2.3 | Создать `app/composables/useGameJoin.ts` | Общий join-by-code | 30 мин |
| 2.4 | Создать `app/composables/useFriends.ts` | Общие friend actions | 1 час |
| 2.5 | Создать `app/composables/useEngineAnalysis.ts` | Анализ из import.vue | 3 часа |
| 2.6 | Создать `app/composables/useBoardNavigation.ts` | Keyboard navigation | 1 час |
| 2.7 | Перенести GameDetail в shared/types | Общий интерфейс | 15 мин |
| 2.8 | SAN-to-UCI в server/utils/chess.ts | Общий helper | 30 мин |
| 2.9 | Email retry в server/utils/email.ts | Общий retry + template helper | 1 час |
| 2.10 | Объединить default + game layouts | Один layout с props | 30 мин |
| 2.11 | Обновить все импорты | Заменить дублированный код на shared utils | 2 часа |
| 2.12 | Удалить мёртвый код | useOrientation, test-theme guard, закомментированные блоки | 30 мин |

### Фаза 3: Безопасность (1-2 дня)

> Цель: закрыть HIGH/MEDIUM уязвимости.

| # | Задача | Время |
|---|---|---|
| 3.1 | CSRF-защита — SameSite cookie + заголовки | 1 час |
| 3.2 | Пароль при удалении аккаунта | 30 мин |
| 3.3 | Escape HTML в email-шаблонах | 30 мин |
| 3.4 | Generic-сообщение при регистрации | 30 мин |
| 3.5 | Rate limit на forgot-password (SEC-3) | 15 мин |
| 3.6 | Валидация avatar URL — только относительные пути | 30 мин |
| 3.7 | Username change cooldown (24 часа) | 1 час |
| 3.8 | Email verification: POST вместо GET | 1 час |
| 3.9 | X-Forwarded-For: доверять только известному proxy | 30 мин |

### Фаза 4: MVP-фичи (3-5 дней)

> Цель: довести до уровня минимально жизнеспособного продукта.

| # | Задача | Время |
|---|---|---|
| 4.1 | Инкремент часов | 2 часа |
| 4.2 | Матчмейкинг — WS-очередь + автосоздание игры | 1 день |
| 4.3 | Реконнект при обрыве WS | 4 часа |
| 4.4 | Смена пароля/email в настройках | 3 часа |
| 4.5 | Flip board кнопка | 1 час |
| 4.6 | PGN экспорт для AI-игр | 1 час |
| 4.7 | 50-move rule на сервере | 2 часа |
| 4.8 | Health check endpoint | 30 мин |
| 4.9 | Миграции в Docker entrypoint | 30 мин |
| 4.10 | Cleanup завершённых game rooms | 1 час |

### Фаза 5: Инфраструктура и качество (2-3 дня)

> Цель: production-ready окружение.

| # | Задача | Время |
|---|---|---|
| 5.1 | CI/CD — GitHub Actions pipeline | 3 часа |
| 5.2 | Структурированное логирование | 2 часа |
| 5.3 | SSL/TLS — Nginx или Caddy конфиг | 2 часа |
| 5.4 | Миграция DB schema: emailVerified → boolean, moves/analysis → jsonb | 1 час |
| 5.5 | Транзакции для критичных API endpoints | 3 часа |
| 5.6 | Расширение тестового покрытия | 4 часа |
| 5.7 | Удалить example файлы из public/ | 10 мин |
| 5.8 | Обновить README.md под реальный проект | 1 час |

---

## Итого: трудозатраты

| Фаза | Описание | Время | Приоритет |
|---|---|---|---|
| 1 | Критические фиксы | 1-2 дня | 🔴 Немедленно |
| 2 | Рефакторинг | 2-3 дня | 🟠 После фазы 1 |
| 3 | Безопасность | 1-2 дня | 🟠 После фазы 1 |
| 4 | MVP-фичи | 3-5 дней | 🟡 После фаз 2-3 |
| 5 | Инфраструктура | 2-3 дня | 🟡 Параллельно с фазой 4 |
| | **Итого** | **~10-15 дней** | |

Фазы 2 и 3 можно выполнять параллельно. Фаза 4 частично параллельна с фазой 5.
