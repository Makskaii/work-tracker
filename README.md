# Work Tracker Frontend

Frontend приложения Work Tracker на React, TypeScript и Vite.

## Требования

- Node.js 20+
- npm

## Локальный запуск

### 1. Клонировать репозиторий

```bash
git clone <repo_url>
cd work-tracker
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить переменные окружения

Создайте в корне проекта файл `.env.local`:

```env
VITE_API_URL=https://crm.evolution-soft.ru/rest/13/******/
BASE_URL=/devapps/work-tracker/
VITE_BFF_API_URL=http://localhost:3001/
```

API должен быть предварительно запущен локально. Инструкция по его запуску находится в репозитории `work-tracker-api`.

### 4. Запустить приложение

```bash
npm run dev
```

После запуска Vite выведет адрес приложения в терминал. Обычно это `http://localhost:5173`. Если порт уже занят, Vite выберет следующий свободный порт.

## Полезные команды

```bash
npm run dev      # запустить frontend в режиме разработки
npm run build    # линтинг, тесты, проверка типов и production-сборка
npm run lint     # запустить Biome с исправлением форматирования
npm run test     # запустить тесты Vitest
npm run preview  # открыть собранную production-версию локально
```

## Разработка

- В режиме `npm run dev` проверка запуска внутри Bitrix не перенаправляет на Marketplace.
- Biome в VS Code может автоматически сортировать импорты при сохранении. Для других IDE см. [документацию Biome](https://biomejs.dev/).
- Для импортов рекомендуется использовать public API модулей.

