// E2E-проверки Halloween-сайта. Гоняются в WebKit (iPhone) и Chrome (Android).
// Покрывают iOS-риски (переполнение по X от летящих мышей/паучков/частиц),
// флоу интро, музыку и ритм-игру.
const { test, expect } = require("@playwright/test");

function trackErrors(page) {
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

// Глушим звук во ВСЕХ тестах: patch play() → muted. Состояние paused не меняется,
// поэтому тесты музыки всё равно видят, что трек «играет».
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const proto = HTMLMediaElement.prototype;
    const origPlay = proto.play;
    proto.play = function () {
      this.muted = true;
      this.volume = 0;
      return origPlay.apply(this, arguments);
    };
  });
});

// force:true — тыква постоянно анимируется (sway), иначе Playwright ждёт «стабильности».
async function openIntro(page) {
  await page.locator("#intro-pumpkin").click({ force: true });
  await expect(page.locator("#site")).toBeVisible();
  await page.waitForTimeout(800);
}

function horizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

test.describe("Интро", () => {
  test("грузится без ошибок консоли, тыква на месте", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await expect(page.locator("#intro-pumpkin .pumpkin-svg")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("открывается только по тапу на тыкву — не по подсказке и не по паучку", async ({ page }) => {
    await page.goto("/");
    await page.locator("#intro-hint").click({ force: true });
    await expect(page.locator("#site")).toBeHidden();
    const spider = page.locator(".spider-body").first();
    await expect(spider).toBeInViewport(); // дождаться, пока спустится на нитке
    await spider.click({ force: true });
    await expect(page.locator("#site")).toBeHidden();
    await page.locator("#intro-pumpkin").click({ force: true });
    await expect(page.locator("#site")).toBeVisible();
  });
});

test.describe("После раскрытия", () => {
  test("нет горизонтального скролла, пока летают мыши и частицы", async ({ page }) => {
    await page.goto("/");
    await openIntro(page);
    await expect.poll(() => page.locator(".bat").count()).toBeGreaterThan(0);
    await page.waitForTimeout(1500); // мыши успевают пролететь часть пути
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });

  test("заголовок влезает по ширине и центрирован", async ({ page }) => {
    await page.goto("/");
    await openIntro(page);
    const m = await page.evaluate(() => {
      const r = document.getElementById("hero-title").getBoundingClientRect();
      return { vw: window.innerWidth, width: r.width, centerOffset: (r.left + r.right) / 2 - window.innerWidth / 2 };
    });
    expect(m.width).toBeLessThanOrEqual(m.vw * 0.96);
    expect(Math.abs(m.centerOffset)).toBeLessThanOrEqual(1.5);
  });

  test("частицы и паучки не выходят за вьюпорт по X", async ({ page }) => {
    await page.goto("/");
    await openIntro(page);
    const b = await page.evaluate(() => {
      let maxRight = 0,
        minLeft = 1e9;
      document.querySelectorAll(".floaty, .spider-body").forEach((f) => {
        const r = f.getBoundingClientRect();
        maxRight = Math.max(maxRight, r.right);
        minLeft = Math.min(minLeft, r.left);
      });
      return { maxRight, minLeft, vw: window.innerWidth };
    });
    expect(b.maxRight).toBeLessThanOrEqual(b.vw + 1);
    expect(b.minLeft).toBeGreaterThanOrEqual(-1);
  });

  test("тап по паучку прячет его под потолок, потом он спускается", async ({ page }) => {
    await page.goto("/");
    const spider = page.locator(".spider").first();
    await expect(spider.locator(".spider-body")).toBeInViewport();
    await spider.locator(".spider-body").click({ force: true });
    await expect(spider).toHaveClass(/\bup\b/);
    await expect(spider).not.toHaveClass(/\bup\b/, { timeout: 6000 });
  });

  test("тыква в финале по центру", async ({ page }) => {
    await page.goto("/");
    await openIntro(page);
    await page.locator("#finale").scrollIntoViewIfNeeded();
    const offset = await page.evaluate(() => {
      const r = document.querySelector("#finale-pumpkin .pumpkin-svg").getBoundingClientRect();
      return (r.left + r.right) / 2 - window.innerWidth / 2;
    });
    expect(Math.abs(offset)).toBeLessThanOrEqual(1.5);
  });

  test("двойной тап по тыкве не выделяет текст", async ({ page }) => {
    await page.goto("/");
    await openIntro(page);
    await page.locator("#finale-pumpkin").dblclick({ force: true });
    const sel = await page.evaluate(() => window.getSelection().toString());
    expect(sel).toBe("");
  });
});

test.describe("PWA", () => {
  test("манифест слинкован и валиден, пути относительные", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "manifest.json");
    const res = await request.get("/manifest.json");
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m.icons.length).toBeGreaterThanOrEqual(2);
    expect(m.start_url).toBe("./");
    expect(m.scope).toBe("./");
    for (const ic of m.icons) expect(ic.src.startsWith("/")).toBe(false);
  });

  test("иконки и все ассеты из предкэша SW отдаются (нет 404)", async ({ page, request }) => {
    await page.goto("/");
    const apple = await page.getAttribute('link[rel="apple-touch-icon"]', "href");
    const sw = await (await request.get("/sw.js")).text();
    const list = sw.match(/const ASSETS = \[([\s\S]*?)\]/)[1];
    const assets = [...list.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    for (const src of [apple, ...assets]) {
      const r = await request.get("/" + src.replace(/^\.\//, ""));
      expect(r.status(), src).toBe(200);
    }
  });

  test("service worker на localhost отключён (dev)", async ({ page }) => {
    await page.goto("/");
    await expect
      .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length))
      .toBe(0);
  });
});

test.describe("Музыка", () => {
  test("трек играет после тапа по тыкве, кнопка ставит на паузу", async ({ page }) => {
    await page.goto("/");
    await openIntro(page);
    const paused = () => page.evaluate(() => document.getElementById("bg-audio").paused);
    await expect(page.locator("#music-toggle")).toBeVisible();
    await expect.poll(paused).toBe(false);
    expect(await page.evaluate(() => document.getElementById("bg-audio").loop)).toBe(true);
    await page.locator("#music-toggle").click({ force: true });
    await expect.poll(paused).toBe(true);
    await page.locator("#music-toggle").click({ force: true });
    await expect.poll(paused).toBe(false);
  });
});

test.describe("Ритм-игра", () => {
  async function startRhythm(page) {
    await openIntro(page);
    await expect.poll(() => page.evaluate(() => document.getElementById("bg-audio").paused)).toBe(false);
    await page.locator("#finale").scrollIntoViewIfNeeded();
    const btn = page.locator("#btn-play");
    await expect(btn).toBeVisible();
    await btn.click({ force: true });
    await expect(page.locator("#rhythm")).toBeVisible();
  }

  test("карта битов соответствует лупу", async ({ page }) => {
    await page.goto("/");
    const r = await page.evaluate(async () => {
      const bm = window.RHYTHM_BEATMAP;
      const a = new Audio(bm.src);
      await new Promise((res) => a.addEventListener("loadedmetadata", res, { once: true }));
      const sorted = bm.beats.every((t, i) => i === 0 || t > bm.beats[i - 1]);
      const inRange = bm.beats.every((t) => t >= 0 && t < bm.duration);
      return { sorted, inRange, drift: Math.abs(a.duration - bm.duration), n: bm.beats.length };
    });
    expect(r.sorted && r.inRange).toBe(true);
    expect(r.n).toBeGreaterThan(20);
    expect(r.drift).toBeLessThan(0.1); // сменили mp3 без regen.sh → тут упадёт
  });

  test("кнопка «Играть» включает режим игры и пускает ноты", async ({ page }) => {
    await page.goto("/");
    await startRhythm(page);
    expect(await page.evaluate(() => document.getElementById("finale").classList.contains("playing"))).toBe(true);
    await expect
      .poll(() => page.evaluate(() => document.querySelectorAll("#rhythm-lane .rhythm-note").length), {
        timeout: 4000,
      })
      .toBeGreaterThan(0);
  });

  test("тап по тыкве в такт растит комбо", async ({ page }) => {
    await page.goto("/");
    await startRhythm(page);
    const combo = await page.evaluate(async () => {
      const pumpkin = document.getElementById("finale-pumpkin");
      const lane = document.getElementById("rhythm-lane");
      const comboEl = document.getElementById("rhythm-combo");
      let maxText = "";
      const end = performance.now() + 5000;
      while (performance.now() < end) {
        for (const n of lane.querySelectorAll(".rhythm-note:not(.hit):not(.miss)")) {
          const L = parseFloat(n.style.left);
          if (L >= 9 && L <= 15) {
            pumpkin.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            break;
          }
        }
        if (comboEl.textContent) maxText = comboEl.textContent;
        await new Promise((r) => setTimeout(r, 25));
      }
      return maxText;
    });
    expect(combo).toMatch(/×\d+/);
  });

  test("нет горизонтального переполнения при видимой полосе", async ({ page }) => {
    await page.goto("/");
    await startRhythm(page);
    await page.waitForTimeout(1500);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});
