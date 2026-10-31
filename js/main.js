/* ============================================================================
 *  Логика сайта. Персонализация — в config.js, стили/палитра — в styles.css.
 * ========================================================================== */
(function () {
  "use strict";

  var CFG = window.HALLOWEEN_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Запрет масштабирования (Safari на iOS игнорирует user-scalable=no) —
  // гасим pinch-жесты. Двойной-тап-зум снимается через touch-action: manipulation в CSS.
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
  });

  function $(id) {
    return document.getElementById(id);
  }
  function setText(id, value) {
    var el = $(id);
    if (el && value != null && value !== "") el.textContent = value;
  }
  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  /* ---- Наполнение из конфига ------------------------------------------- */
  var hero = CFG.hero || {};
  var finale = CFG.finale || {};
  setText("intro-hint", (CFG.intro && CFG.intro.hint) || "Коснись тыквы 🎃");
  setText("hero-greeting", hero.greeting);
  setText("hero-title", hero.title);
  setText("hero-subtitle", hero.subtitle);
  setText("scroll-cue-text", hero.scrollCue);
  if (finale.caption) {
    var cap = $("finale-caption");
    cap.textContent = finale.caption;
    cap.hidden = false;
  }
  setText("btn-replay", finale.replay || "Happy Halloween");

  /* ---- Тыква-фонарь: одна разметка (<template>) → интро и финал --------- */
  var pumpkinTpl = $("pumpkin-tpl");
  var introPumpkin = $("intro-pumpkin");
  var finalePumpkin = $("finale-pumpkin");
  [introPumpkin, finalePumpkin].forEach(function (host) {
    if (host && pumpkinTpl) host.appendChild(pumpkinTpl.content.cloneNode(true));
  });
  if (finalePumpkin) finalePumpkin.classList.add("lit");

  /* ---- Паутина в углах -------------------------------------------------- */
  // Радиальные нити из угла (0,0) + спиральные «ловчие» нити между ними,
  // провисающие к центру (контрольная точка ближе к углу).
  function buildWeb() {
    var path = $("web-path");
    if (!path) return;
    var spokes = 7;
    var rings = [38, 74, 112, 152, 196, 242];
    var d = "";
    var ang = [];
    for (var i = 0; i < spokes; i++) ang.push((Math.PI / 2) * (i / (spokes - 1)));
    ang.forEach(function (a) {
      d += "M0 0 L" + (Math.cos(a) * 258).toFixed(1) + " " + (Math.sin(a) * 258).toFixed(1) + " ";
    });
    rings.forEach(function (r) {
      for (var k = 0; k < spokes - 1; k++) {
        var a0 = ang[k];
        var a1 = ang[k + 1];
        var am = (a0 + a1) / 2;
        var rm = r * 0.82;
        d +=
          "M" + (Math.cos(a0) * r).toFixed(1) + " " + (Math.sin(a0) * r).toFixed(1) +
          " Q" + (Math.cos(am) * rm).toFixed(1) + " " + (Math.sin(am) * rm).toFixed(1) +
          " " + (Math.cos(a1) * r).toFixed(1) + " " + (Math.sin(a1) * r).toFixed(1) + " ";
      }
    });
    path.setAttribute("d", d);
  }
  buildWeb();

  // Авто-подгон заголовка по ширине: если шире ~92% экрана — уменьшаем кегль.
  function fitTitle() {
    var el = $("hero-title");
    if (!el) return;
    el.style.fontSize = "";
    var size = parseFloat(getComputedStyle(el).fontSize);
    var limit = window.innerWidth * 0.92;
    var guard = 0;
    while (el.getBoundingClientRect().width > limit && size > 16 && guard++ < 80) {
      size *= 0.96;
      el.style.fontSize = size + "px";
    }
  }
  var fitTimer;
  window.addEventListener("resize", function () {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitTitle, 120);
  });

  /* ---- Конфетти --------------------------------------------------------- */
  function confettiColors() {
    var raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--confetti-colors")
      .trim();
    return raw
      ? raw.split(",").map(function (c) {
          return c.trim();
        })
      : undefined;
  }
  function boom(opts) {
    if (typeof confetti !== "function") return;
    var base = { colors: confettiColors(), disableForReducedMotion: true };
    confetti(Object.assign(base, opts));
  }
  function celebrate() {
    boom({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
    setTimeout(function () {
      boom({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.65 } });
      boom({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.65 } });
    }, 180);
  }
  // Эмодзи-формы для «жуткого» салюта (создаём один раз; призраков и мышей больше).
  var spookyShapes = null;
  function getSpookyShapes() {
    if (spookyShapes === null && typeof confetti === "function" && confetti.shapeFromText) {
      spookyShapes = ["👻", "👻", "🦇", "🦇", "🕷️", "🍬", "🍭", "🎃", "💀"].map(function (t) {
        return confetti.shapeFromText({ text: t, scalar: 2.6 });
      });
    }
    return spookyShapes;
  }
  function centerOf(el, fy) {
    var r = el.getBoundingClientRect();
    return {
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height * (fy || 0.5)) / window.innerHeight,
    };
  }
  // Салют из призраков, мышей и конфет, вылетающих из тыквы.
  function spookyBurst(originEl) {
    if (typeof confetti !== "function") return;
    var opts = {
      particleCount: 24,
      spread: 95,
      startVelocity: 40,
      scalar: 2.6,
      gravity: 0.85,
      ticks: 230,
      flat: true,
      origin: originEl ? centerOf(originEl, 0.6) : { y: 0.5 },
      disableForReducedMotion: true,
    };
    var shapes = getSpookyShapes();
    if (shapes && shapes.length) opts.shapes = shapes;
    confetti(opts);
  }

  /* ---- Интро: зажечь тыкву ---------------------------------------------- */
  var introScreen = $("intro-screen");
  var opened = false;

  function openIntro() {
    if (opened) return;
    opened = true;
    introPumpkin.classList.add("lit");
    introScreen.classList.add("opening");
    spookyBurst(introPumpkin);
    setTimeout(celebrate, 250);
    setTimeout(function () {
      introScreen.classList.add("gone");
      $("site").hidden = false;
      fitTitle();
      requestAnimationFrame(initReveal);
      startFloaties();
      startBats();
    }, 900);
  }

  introPumpkin.addEventListener("click", openIntro);
  introPumpkin.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openIntro();
    }
  });

  // Открыть встряхиванием телефона (если доступно и разрешено).
  if (typeof DeviceMotionEvent !== "undefined") {
    window.addEventListener("devicemotion", function onMotion(e) {
      var a = e.accelerationIncludingGravity;
      if (!a) return;
      var force = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      if (force > 32) {
        window.removeEventListener("devicemotion", onMotion);
        openIntro();
      }
    });
  }

  /* ---- Reveal on scroll (IntersectionObserver) ------------------------- */
  var io;
  function initReveal() {
    var items = document.querySelectorAll(".site .reveal:not(.in)");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("in");
      });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.18 }
      );
    }
    items.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---- Финал: тыква-фонарь ---------------------------------------------- */
  var finaleSection = $("finale");
  function inGame() {
    return finaleSection && finaleSection.classList.contains("playing");
  }
  if (finalePumpkin) {
    finalePumpkin.addEventListener("click", function () {
      if (inGame()) return; // в игре тап обрабатывает движок
      spookyBurst(finalePumpkin);
    });
    finalePumpkin.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!inGame()) spookyBurst(finalePumpkin);
      }
    });
  }

  var replay = $("btn-replay");
  if (replay) replay.addEventListener("click", celebrate);

  /* ---- Ритм-игра над тыквой --------------------------------------------- */
  // Движок — обобщённый (js/rhythm.js), данные песни — window.RHYTHM_BEATMAP.
  var beatmap = window.RHYTHM_BEATMAP;
  var audioEl = $("bg-audio");
  if (
    beatmap &&
    typeof RhythmGame === "function" &&
    finaleSection &&
    finalePumpkin &&
    audioEl &&
    (CFG.music || {}).url
  ) {
    var btnPlay = $("btn-play");
    var rhythmHint = $("rhythm-hint");
    var rhythmBox = $("rhythm");
    var rhythmLane = $("rhythm-lane");
    var rhythmTarget = $("rhythm-target");
    var comboEl = $("rhythm-combo");

    rhythmHint.textContent = finale.playHint || "";
    rhythmHint.hidden = !finale.playHint;
    btnPlay.textContent = finale.play || "Играть в такт";
    btnPlay.hidden = false;

    var flashTarget = function () {
      rhythmTarget.classList.add("flash");
      setTimeout(function () {
        rhythmTarget.classList.remove("flash");
      }, 120);
    };
    // Перезапустить «поп» тыквы (reflow сбрасывает предыдущую анимацию).
    var popPumpkin = function () {
      finalePumpkin.classList.remove("pop");
      void finalePumpkin.offsetWidth;
      finalePumpkin.classList.add("pop");
    };

    var startGame = function () {
      // Музыка уже играет и зациклена — НЕ перематываем, подхватываем с текущей
      // позиции. play() внутри жеста — на случай, если стоит на паузе (iOS).
      audioEl.play().catch(function () {});
      finaleSection.classList.add("playing");
      btnPlay.hidden = true;
      rhythmHint.hidden = true;
      rhythmBox.hidden = false;
      comboEl.textContent = "";

      RhythmGame({
        audio: audioEl,
        mount: rhythmLane,
        tapTargets: [finalePumpkin, rhythmLane],
        beats: beatmap.beats,
        duration: beatmap.duration,
        hitWindow: 0.3,
        leadTime: 2.4,
        reducedMotion: reduceMotion,
        onHit: function (info) {
          flashTarget();
          popPumpkin();
          // Обычное конфетти (легче эмодзи) из лица тыквы.
          boom({ particleCount: 30, spread: 70, startVelocity: 32, origin: centerOf(finalePumpkin, 0.6) });
          comboEl.textContent = "×" + info.combo;
        },
        onMiss: function () {
          comboEl.textContent = "";
        },
        onComplete: function () {
          finaleSection.classList.remove("playing");
          finalePumpkin.classList.remove("pop");
          rhythmBox.hidden = true;
          comboEl.textContent = "";
          celebrate();
          spookyBurst(finalePumpkin);
          rhythmHint.textContent = finale.gameEnd || "";
          rhythmHint.hidden = !finale.gameEnd;
          btnPlay.textContent = finale.replayGame || "Ещё раз";
          btnPlay.hidden = false;
        },
      }).start();
    };

    btnPlay.addEventListener("click", startGame);
  }

  /* ---- Плавающие частицы ------------------------------------------------ */
  var EMOJI = ["👻", "🍬", "🎃", "👻", "🍭", "✨"];
  var floatiesStarted = false;
  function startFloaties() {
    if (floatiesStarted || reduceMotion) return;
    floatiesStarted = true;
    var host = $("floaties");
    if (!host) return;
    var count = window.innerWidth < 480 ? 9 : 14;
    for (var i = 0; i < count; i++) {
      var el = document.createElement("span");
      el.className = "floaty";
      el.textContent = EMOJI[i % EMOJI.length];
      // Держим частицы внутри вьюпорта по X (левый край 3–82vw, дрейф ±4vw),
      // чтобы даже без обрезания родителя они не выходили за экран (iOS).
      el.style.left = rand(3, 82).toFixed(1) + "vw";
      el.style.setProperty("--sz", rand(1.2, 2.4) + "rem");
      el.style.setProperty("--op", rand(0.3, 0.65).toFixed(2));
      el.style.setProperty("--dur", rand(13, 25) + "s");
      el.style.setProperty("--delay", -rand(0, 14) + "s");
      el.style.setProperty("--drift", rand(-4, 4).toFixed(1) + "vw");
      el.style.setProperty("--spin", Math.floor(rand(-25, 25)) + "deg");
      host.appendChild(el);
    }
  }

  /* ---- Летучие мыши через небо ------------------------------------------ */
  var BAT_SVG =
    '<svg viewBox="0 0 100 50"><path d="M50 20 C46 12 42 12 40 17 C34 9 22 5 6 9 C14 13 18 21 16 29 C22 25 28 27 32 33 C36 27 42 29 46 35 L50 41 L54 35 C58 29 64 27 68 33 C72 27 78 25 84 29 C82 21 86 13 94 9 C78 5 66 9 60 17 C58 12 54 12 50 20 Z"/>' +
    '<path d="M45 21 L44 10 L48 15 L52 15 L56 10 L55 21 Q50 27 45 21 Z"/></svg>';
  var batsStarted = false;
  function spawnBat() {
    var host = $("bats");
    if (!host || document.hidden) return;
    var bat = document.createElement("div");
    bat.className = "bat";
    bat.innerHTML = BAT_SVG;
    var y = rand(8, 34);
    bat.style.setProperty("--w", Math.round(rand(30, 56)) + "px");
    bat.style.setProperty("--dur", rand(7, 12).toFixed(1) + "s");
    bat.style.setProperty("--y0", y + "vh");
    bat.style.setProperty("--y1", y + rand(-8, 8) + "vh");
    bat.style.setProperty("--y2", y + rand(-10, 6) + "vh");
    bat.addEventListener("animationend", function (e) {
      if (e.target === bat) bat.remove();
    });
    host.appendChild(bat);
  }
  function startBats() {
    if (batsStarted || reduceMotion) return;
    batsStarted = true;
    spawnBat();
    setTimeout(spawnBat, 700);
    (function loop() {
      setTimeout(function () {
        spawnBat();
        loop();
      }, rand(5000, 10000));
    })();
  }

  /* ---- Паучки на нитках ------------------------------------------------- */
  var SPIDER_SVG =
    '<svg class="spider-body" viewBox="0 0 40 44">' +
    '<path d="M17 22 Q8 14 4 20 M16 25 Q6 22 2 28 M16 28 Q7 30 4 37 M17 31 Q10 36 9 42 M23 22 Q32 14 36 20 M24 25 Q34 22 38 28 M24 28 Q33 30 36 37 M23 31 Q30 36 31 42" fill="none" stroke="#120a20" stroke-width="2" stroke-linecap="round"/>' +
    '<ellipse cx="20" cy="29" rx="7" ry="8.5" fill="#120a20"/><circle cx="20" cy="18" r="5" fill="#120a20"/>' +
    '<circle cx="18" cy="17.5" r="1.3" fill="#ff8a1a"/><circle cx="22" cy="17.5" r="1.3" fill="#ff8a1a"/></svg>';
  var SPIDERS = [
    { x: 7, drop: 24, sz: 38, swing: 4.6 },
    { x: 80, drop: 15, sz: 30, swing: 3.8 },
    { x: 30, drop: 9, sz: 24, swing: 5.2, wideOnly: true },
  ];
  function setupSpiders() {
    var host = $("spiders");
    if (!host) return;
    SPIDERS.forEach(function (s, i) {
      if (s.wideOnly && window.innerWidth < 600) return;
      var el = document.createElement("div");
      el.className = "spider up";
      el.style.setProperty("--x", s.x + "vw");
      el.style.setProperty("--drop", s.drop + "vh");
      el.style.setProperty("--sz", s.sz + "px");
      el.style.setProperty("--swing", s.swing + "s");
      el.innerHTML = '<div class="spider-swing">' + SPIDER_SVG + "</div>";
      host.appendChild(el);

      var lower = function () {
        el.classList.remove("up");
      };
      setTimeout(lower, 600 + i * 900);
      // Тап по паучку — убегает под потолок и через пару секунд спускается снова.
      el.querySelector(".spider-body").addEventListener("click", function (e) {
        e.stopPropagation();
        if (el.classList.contains("up")) return;
        el.classList.add("up");
        setTimeout(lower, rand(2500, 4500));
      });
    });
  }
  setupSpiders();

  /* ---- Музыка (опционально, старт по тапу) ----------------------------- */
  var music = CFG.music || {};
  if (music.url) {
    var audio = $("bg-audio");
    var toggle = $("music-toggle");
    audio.src = music.url;
    toggle.hidden = false;
    toggle.setAttribute("aria-label", music.title || "Музыка");
    var playing = false;
    toggle.addEventListener("click", function () {
      if (playing) {
        audio.pause();
        toggle.classList.remove("playing");
      } else {
        audio.play().catch(function () {});
        toggle.classList.add("playing");
      }
      playing = !playing;
    });
    // Автостарт при открытии интро (в рамках пользовательского жеста — тап по тыкве).
    introPumpkin.addEventListener("click", function once() {
      audio.play().then(function () {
        playing = true;
        toggle.classList.add("playing");
      }).catch(function () {});
      introPumpkin.removeEventListener("click", once);
    });
  }
})();
