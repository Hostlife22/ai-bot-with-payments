# Разработка и тестирование

[К документации](../README.md#документация) · [Правила участия](../CONTRIBUTING.md)

## Локальный запуск

Используйте Node.js, удовлетворяющий `engines.node` в `package.json`, и отдельного Telegram-бота для разработки. Не запускайте два polling-процесса с одним токеном.

```sh
npm ci
cp .env.example .env
```

Для временных PostgreSQL и Redis с портами только на loopback:

```sh
docker run --rm -d --name ai-bot-dev-postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=bot_dev -p 127.0.0.1:15432:5432 postgres:15-alpine

docker run --rm -d --name ai-bot-dev-redis \
  -p 127.0.0.1:16379:6379 redis:7-alpine

docker exec ai-bot-dev-postgres pg_isready -U postgres -d bot_dev
```

Дождитесь готовности PostgreSQL. В `.env` задайте реальные ключи бота и OpenRouter, свой `ADMIN_ID`, затем:

```dotenv
DATABASE_URL=postgres://postgres:dev_password@127.0.0.1:15432/bot_dev
REDIS_URL=redis://127.0.0.1:16379/0
```

```sh
npm run dev
```

Команда читает `.env` и выполняет исходники через `tsx`; автоматического перезапуска при изменениях нет. Миграции применяются тем же кодом, что и при production-запуске. Временные контейнеры удаляются при остановке; для постоянных данных используйте Compose с томом PostgreSQL.

```sh
docker rm -f ai-bot-dev-postgres ai-bot-dev-redis
```

## Проверки

| Команда | Проверка |
| --- | --- |
| `npm run typecheck` | Исходники и тесты в одном TypeScript-проекте, без генерации файлов. |
| `npm run lint` | Ошибки кода, необработанные Promise и границы архитектуры. |
| `npm run format` | Prettier и сортировка импортов с изменением файлов. |
| `npm run format:check` | Проверка форматирования без изменений. |
| `npm test` | Тесты `node:test` через `tsx`; интеграционные группы включаются окружением. |
| `npm run build` | Чистая компиляция и преобразование алиасов в `.js`-пути. |
| `npm run check` | Все перечисленные проверки, кроме команды форматирования с изменением файлов. |

`tsconfig.json` включает `src/` и `tests/`, явно задаёт `types: ["node"]` и `noEmit`. `tsconfig.build.json` переопределяет настройки для сборки только `src/` в `dist/`. Если редактор не видит `node:crypto` или `node:test`, выполните `npm ci`, выберите TypeScript из workspace и перезапустите `TypeScript: Restart TS Server`.

## Интеграционные тесты

Используйте отдельные сервисы. PostgreSQL-тесты создают случайную схему и удаляют её после выполнения. Redis-тесты удаляют очередь `ai-requests` в указанной БД; это должен быть тестовый Redis.

```sh
docker run --rm -d --name ai-bot-test-pg \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=bot_test \
  -p 127.0.0.1:25432:5432 postgres:15-alpine

docker run --rm -d --name ai-bot-test-redis \
  -p 127.0.0.1:26379:6379 redis:7-alpine

docker exec ai-bot-test-pg pg_isready -U postgres -d bot_test
```

Когда PostgreSQL готов:

```sh
TEST_DATABASE_URL=postgres://postgres:test@127.0.0.1:25432/bot_test \
TEST_REDIS_URL=redis://127.0.0.1:26379/15 npm run check

docker rm -f ai-bot-test-pg ai-bot-test-redis
```

Без `TEST_DATABASE_URL` пропускается группа PostgreSQL, без `TEST_REDIS_URL` — группа Redis. Unit-тесты и эти интеграционные тесты не выполняют реальные платежи и не вызывают внешние AI API. Процент покрытия не задан. Новые тесты называйте `tests/<сценарий>.test.ts`.

## Типы и импорты

```ts
import type { User } from '@contracts/user';
import type { PurchaseIntent } from '@contracts/purchases';
import { createRepository } from '@database/repository';
```

| Алиас | Каталог |
| --- | --- |
| `@bootstrap/*` | `src/bootstrap/*` |
| `@config/*` | `src/config/*` |
| `@contracts/*` | `src/types/*` |
| `@domain/*` | `src/domain/*` |
| `@app/*` | `src/application/*` |
| `@database/*` | `src/infrastructure/database/*` |
| `@providers/*` | `src/infrastructure/ai/*` |
| `@payments/*` | `src/infrastructure/payments/*` |
| `@queues/*` | `src/infrastructure/queues/*` |
| `@telegram/*` | `src/presentation/telegram/*` |
| `@shop/*` | `src/presentation/telegram/shop/*` |
| `@admin/*` | `src/presentation/telegram/admin/*` |
| `@handlers/*` | `src/presentation/telegram/handlers/*` |

Для соседнего файла используйте `./file.js`, для связи модулей — ближайший алиас. Типы выносите в тематический файл, если это модель, контракт или повторно используемая структура. Одноразовые локальные формы результата SQL-запроса допустимы рядом с запросом. Не создавайте общий файл с реэкспортом всех типов.

Алиасы описаны в `paths`; для совместимости с NodeNext цели имеют `.js`. `tsx` разрешает их в исходники, `tsc-alias` после компиляции преобразует в относительные пути. Новый алиас добавляйте одновременно в `tsconfig.json`, порядок импортов Prettier и ограничения ESLint, если он относится к инфраструктуре или Telegram.

## Изменение схемы

Добавьте новый SQL-файл в `migrations/` и его имя в список [migrate.ts](../src/infrastructure/database/migrate.ts). Простого добавления файла в каталог недостаточно: автоматического обнаружения нет. Применённые миграции по имени больше не исполняются, поэтому исправления оформляйте следующей миграцией. Автоматического rollback и отдельной команды `migrate` нет.

Проверьте новую БД, повторный запуск и обновление существующей схемы. Для запросов используйте параметры `$1`, `$2`; выбор SQL-идентификатора допускается только из закрытого набора значений.
