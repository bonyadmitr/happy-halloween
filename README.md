# 🎃 Счастливого Halloween

Интерактивная открытка к Хэллоуину. Чистые HTML/CSS/JS, без сборки.
iPhone-first: зажги тыкву → ночное кладбище с луной, паутиной, летучими мышами и паучками →
горящая тыква-фонарь с мини ритм-игрой под «This Is Halloween».
Это **PWA**: можно добавить на экран «Домой» и открывать офлайн.

## Посмотреть локально

```bash
python3 -m http.server 8123
# открой http://localhost:8123
```

## Тесты

```bash
npm install   # один раз: Playwright (dev-only)
npm test      # E2E в WebKit (iPhone) + реальном Chrome
```

## Персонализация

Всё в **`js/config.js`**: тексты интро, заголовок, подзаголовок, подписи кнопок ритм-игры
и путь к музыке. Палитра и шрифты — переменные в `:root` (`css/styles.css`).

Сменить песню: положи mp3 в `assets/audio/`, поправь `music.url` в конфиге и путь в
`tools/beatmap/regen.sh`, затем запусти `tools/beatmap/regen.sh` и подними версию кэша в `sw.js`.

## Деплой

Статика — подходит GitHub Pages как есть (Settings → Pages → Branch `main` / root).
Пути относительные, работает и из подпапки. `node_modules`, `tests/`, `tools/` в деплое не нужны.

## Структура

```
index.html            разметка, тыква (<template>), фон-слой, PWA-мета
css/styles.css        стили + палитра в :root
js/config.js          все тексты и музыка
js/main.js            логика: интро, паутина, мыши, паучки, частицы, музыка, игра
js/rhythm.js          движок ритм-игры (портируемый)
js/rhythm-beatmap.js  карта битов (генерится)
js/confetti.js        вшитый canvas-confetti
assets/audio/         this-is-halloween-loop.mp3
assets/icons/         PWA-иконки (npm run icons)
scripts/gen-icons.mjs генератор иконок (dev-only)
tools/beatmap/        извлечение карты битов (librosa, dev-only)
tests/e2e.spec.js     Playwright E2E (dev-only)
```
