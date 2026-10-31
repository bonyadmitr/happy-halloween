// ============================================================================
//  Генератор PWA-иконок — разовый запуск: `npm run icons`.
//  Берёт тыкву-фонарь прямо из index.html (<template id="pumpkin-tpl"> + общие
//  градиенты .svg-defs) — одна разметка тыквы на сайт и иконки. Рендерит на
//  ночном фоне в PNG через Playwright (реальный Chrome). PNG коммитятся.
// ============================================================================
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, readFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "assets", "icons");

// Палитра сайта (css/styles.css :root). Держать в синхроне при смене темы.
const SKY_TOP = "#2c1650"; // --night-2
const SKY_BOT = "#1b1030"; // --night
const GLOW = "#ff7a1a"; // --pumpkin

const html = await readFile(join(ROOT, "index.html"), "utf8");
const defs = html.match(/<svg class="svg-defs"[\s\S]*?<\/svg>/)?.[0];
const pumpkin = html.match(/<template id="pumpkin-tpl">([\s\S]*?)<\/template>/)?.[1];
if (!defs || !pumpkin) throw new Error("Не нашёл тыкву/градиенты в index.html");

// rounded — скруглять углы плитки ("any"); frac — доля стороны под тыкву
// (для maskable меньше, чтобы влезть в safe-zone Android-маски).
function page({ size, rounded, frac }) {
  const r = rounded ? Math.round(size * 0.22) : 0;
  const w = Math.round(size * frac);
  return `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;background:transparent}
  #tile{width:${size}px;height:${size}px;border-radius:${r}px;display:grid;place-items:center;
    background:radial-gradient(circle at 50% 58%, ${GLOW}55 0%, transparent 55%),
      linear-gradient(180deg, ${SKY_TOP}, ${SKY_BOT});}
  .pumpkin-svg{width:${w}px;height:auto;margin-top:${Math.round(size * 0.02)}px;
    filter:drop-shadow(0 0 ${Math.round(size * 0.05)}px rgba(255,170,60,.7))}
</style>
${defs}<div id="tile">${pumpkin}</div>`;
}

const TARGETS = [
  { file: "icon-192.png", size: 192, rounded: true, frac: 0.7 },
  { file: "icon-512.png", size: 512, rounded: true, frac: 0.7 },
  { file: "icon-maskable-512.png", size: 512, rounded: false, frac: 0.56 },
  { file: "apple-touch-icon-180.png", size: 180, rounded: false, frac: 0.7 },
];

const browser = await chromium.launch({ channel: "chrome" });
const tab = await browser.newPage();
await mkdir(OUT, { recursive: true });

for (const t of TARGETS) {
  await tab.setViewportSize({ width: t.size, height: t.size });
  await tab.setContent(page(t), { waitUntil: "load" });
  await tab.locator("#tile").screenshot({ path: join(OUT, t.file), omitBackground: t.rounded });
  console.log(`✓ ${t.file} (${t.size}×${t.size})`);
}

await browser.close();
console.log("Готово: assets/icons/");
