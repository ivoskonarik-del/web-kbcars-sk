/* Šablóna salon: správanie navyše k autobazar.js (bez knižníc, bez scroll listenerov).
   - [data-dnes]: dnešné otváracie hodiny v hornej lište
   - [data-menu]: mobilné menu; [data-filtre]: vysúvací panel filtrov na mobile
   - form[data-hladanie]: vyhľadávanie na úvode (počet žije cez autobazar.js, odoslanie ide na ponuka/)
   - [data-tvar="auto|autá|áut"]: slovo v správnom tvare podľa [data-pocet]
   - [data-slider]: hero slider (prelínanie, náhľady, šípky, pauza pri hoveri a mimo obrazovky)
   - [data-g]: galéria detailu (šípky, náhľady, swipe), lightbox rieši autobazar.js
   - [data-podium]: pódium s výrezmi áut v hero (prechod zboku, náhľady, šípky, swipe)
   - [data-vypln]: dlaždica doplní posledný riadok mriežky
   - [data-pocitadlo]: počítadlá, .pri: prílet pri skrolovaní (obsah nikdy neskrytý)
   - form[data-predvypln]: kontakt predvyplní auto z ?auto=, form[data-navrh]: návrh, neodosiela
*/
(function () {
  "use strict";
  var NBSP = " ";
  var tichy = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function fmt(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP); }
  function vsetky(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- dnešné hodiny ---------- */
  vsetky("[data-dnes]").forEach(function (el) {
    try {
      var h = JSON.parse(el.getAttribute("data-dnes"));
      var d = (new Date().getDay() + 6) % 7;
      var t = h[d];
      if (!t) return;
      el.querySelector("[data-dnes-text]").textContent =
        t === "Zatvorené" ? "Dnes zatvorené" : t === "Nonstop" ? "Dnes otvorené nonstop" : "Dnes " + t;
    } catch (e) { /* nechaj serverový text */ }
  });
  vsetky("[data-dnes-zoz]").forEach(function (ul) {
    var d = (new Date().getDay() + 6) % 7;
    var dni = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
    var kr = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
    vsetky("li", ul).forEach(function (li) {
      var s = li.firstElementChild.textContent;
      var m = s.split(" až ");
      var ok = m.length === 2 ? (kr.indexOf(m[0]) <= d && d <= kr.indexOf(m[1])) : dni.indexOf(s) === d;
      if (ok) li.classList.add("dnes");
    });
  });

  /* ---------- mobilné menu ---------- */
  vsetky("[data-menu]").forEach(function (b) {
    b.addEventListener("click", function () {
      var on = document.body.classList.toggle("menu-on");
      b.setAttribute("aria-expanded", on);
    });
  });

  /* ---------- panel filtrov (mobil) ---------- */
  var zaves = document.querySelector(".filtre-zaves");
  function filtre(on) {
    var lista = document.getElementById("wh-navrh"), panel = document.getElementById("filtre");
    if (panel) panel.style.bottom = on && lista ? lista.offsetHeight + "px" : "";
    document.body.classList.toggle("filtre-on", on);
    if (zaves) zaves.hidden = !on;
    document.documentElement.style.overflow = on ? "hidden" : "";
  }
  vsetky("[data-filtre]").forEach(function (b) {
    b.addEventListener("click", function () { filtre(!document.body.classList.contains("filtre-on")); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("filtre-on")) filtre(false);
  });

  /* ---------- tvar slova podľa počtu + počet aktívnych filtrov ---------- */
  function tvary() {
    vsetky("[data-tvar]").forEach(function (el) {
      var t = el.getAttribute("data-tvar").split("|");
      var box = el.closest("form, p, div") || document;
      var p = box.querySelector("[data-pocet]") || document.querySelector("[data-pocet]");
      var n = parseInt(p && p.textContent, 10) || 0;
      el.textContent = n === 1 ? t[0] : (n >= 2 && n <= 4) ? t[1] : t[2];
    });
    vsetky("[data-aktivne]").forEach(function (el) {
      var f = document.getElementById("filter");
      if (!f) return;
      var n = 0;
      ["q", "znacka", "palivo", "prevodovka", "karoseria", "cena_do", "rok_od", "km_do"].forEach(function (k) {
        if (f.elements[k] && f.elements[k].value) n++;
      });
      el.textContent = n;
      el.hidden = !n;
    });
  }
  vsetky("form[data-filter]").forEach(function (f) {
    f.addEventListener("input", tvary);
    f.addEventListener("change", tvary);
    f.addEventListener("reset", function () { setTimeout(tvary, 0); });
  });
  tvary();

  /* ---------- vyhľadávanie na úvode: odoslať na ponuka/ len s vyplnenými poľami ---------- */
  vsetky("form[data-hladanie]").forEach(function (f) {
    f.addEventListener("submit", function () {
      var q = [];
      vsetky("input[name], select[name]", f).forEach(function (el) {
        if (el.value) q.push(encodeURIComponent(el.name) + "=" + encodeURIComponent(el.value));
      });
      location.href = f.getAttribute("action") + (q.length ? "?" + q.join("&") : "");
    });
  });

  /* ---------- hero slider ---------- */
  vsetky("[data-slider]").forEach(function (s) {
    var slajdy = vsetky(".slajd", s);
    if (slajdy.length < 2) return;
    var nahlady = vsetky("[data-na]", s.parentNode);
    var i = 0, timer = null, viditelny = true, nad = false;
    function ukaz(n) {
      i = (n + slajdy.length) % slajdy.length;
      slajdy.forEach(function (el, k) { el.classList.toggle("on", k === i); });
      nahlady.forEach(function (el, k) { el.classList.toggle("on", k === i); });
      var img = slajdy[i].querySelector("img");
      if (img && img.loading === "lazy") img.loading = "eager";
    }
    function start() {
      stop();
      if (tichy || !viditelny || nad || document.hidden) return;
      timer = setInterval(function () { ukaz(i + 1); }, 5200);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    vsetky("[data-krok]", s).forEach(function (b) {
      b.addEventListener("click", function () { ukaz(i + parseInt(b.getAttribute("data-krok"), 10)); start(); });
    });
    nahlady.forEach(function (b) {
      b.addEventListener("click", function () { ukaz(parseInt(b.getAttribute("data-na"), 10)); start(); });
    });
    s.parentNode.addEventListener("mouseenter", function () { nad = true; stop(); });
    s.parentNode.addEventListener("mouseleave", function () { nad = false; start(); });
    document.addEventListener("visibilitychange", start);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (z) { viditelny = z[0].isIntersecting; start(); }).observe(s);
    }
    swipe(s, function (smer) { ukaz(i + smer); start(); });
    start();
  });

  /* ---------- swipe (dotyk) ---------- */
  function swipe(el, fn) {
    var x0 = null, y0 = null, potlac = false;
    el.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        potlac = true;
        fn(dx < 0 ? 1 : -1);
        setTimeout(function () { potlac = false; }, 400);
      }
    });
    el.addEventListener("click", function (e) {
      if (potlac) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  /* ---------- galéria detailu ---------- */
  vsetky("[data-g]").forEach(function (g) {
    var fotky = vsetky(".g-foto", g), nahlady = vsetky("[data-g-na]", g), i = 0;
    if (fotky.length < 2) return;
    function ukaz(n) {
      i = (n + fotky.length) % fotky.length;
      fotky.forEach(function (el, k) { el.classList.toggle("on", k === i); });
      nahlady.forEach(function (el, k) { el.classList.toggle("on", k === i); });
      var img = fotky[i].querySelector("img");
      if (img && img.loading === "lazy") img.loading = "eager";
      var t = nahlady[i];
      if (t && t.parentNode.scrollWidth > t.parentNode.clientWidth) {
        t.parentNode.scrollTo({ left: t.offsetLeft - t.parentNode.clientWidth / 2 + t.clientWidth / 2, behavior: "auto" });
      }
    }
    vsetky("[data-g-krok]", g).forEach(function (b) {
      b.addEventListener("click", function () { ukaz(i + parseInt(b.getAttribute("data-g-krok"), 10)); });
    });
    nahlady.forEach(function (b) { b.addEventListener("click", function () { ukaz(parseInt(b.getAttribute("data-g-na"), 10)); }); });
    swipe(g.querySelector(".g-stage"), function (smer) { ukaz(i + smer); });
    g.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") ukaz(i - 1);
      if (e.key === "ArrowRight") ukaz(i + 1);
    });
  });

  /* ---------- výbava: rozbaliť ---------- */
  vsetky("[data-vybava-btn]").forEach(function (b) {
    var zoz = b.parentNode.querySelector("[data-vybava]"), povodny = b.textContent;
    b.addEventListener("click", function () {
      var zbalena = zoz.classList.toggle("vybava-zbalena");
      b.textContent = zbalena ? povodny : b.getAttribute("data-text-zbal");
    });
  });

  /* ---------- kalkulačka: zobrazenie ceny pri posuvníku ---------- */
  vsetky("[data-kalkulacka]").forEach(function (k) {
    var c = k.querySelector("input[name=cena][type=range]"), o = k.querySelector("[data-cena-text]");
    if (!c || !o) return;
    function p() { o.textContent = fmt(parseFloat(c.value) || 0) + NBSP + "€"; }
    c.addEventListener("input", p);
    p();
  });

  /* ---------- kontakt: predvyplnenie auta ---------- */
  vsetky("form[data-predvypln]").forEach(function (f) {
    var q = new URLSearchParams(location.search), auto = q.get("auto");
    if (!auto) return;
    if (f.elements.auto) f.elements.auto.value = auto;
    var s = f.elements.sprava;
    if (s && !s.value) {
      s.value = q.get("ucel") === "jazda"
        ? "Dobrý deň, rád by som si dohodol testovaciu jazdu: " + auto + (q.get("id") ? " (ID " + q.get("id") + ")" : "") + ". Vyhovuje mi termín: "
        : "Dobrý deň, mám záujem o " + auto + (q.get("id") ? " (ID " + q.get("id") + ")" : "") + ". Prosím o spätný kontakt.";
    }
  });

  /* ---------- návrh: formuláre ešte neodosielajú ---------- */
  vsetky("form[data-navrh]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var m = f.querySelector(".navrh-msg");
      if (m) m.hidden = false;
    });
  });

  /* ---------- počítadlá ---------- */
  var poc = vsetky("[data-pocitadlo]");
  function pocitaj(el) {
    var ciel = parseInt(el.getAttribute("data-pocitadlo"), 10) || 0, t0 = null, trvanie = 900;
    if (tichy || ciel < 2) { el.textContent = ciel; return; }
    function krok(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / trvanie);
      el.textContent = Math.round(ciel * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(krok);
    }
    el.textContent = "0";
    requestAnimationFrame(krok);
  }
  /* ---------- počítadlá (keď sú aspoň do polovice na obrazovke) ---------- */
  if ("IntersectionObserver" in window && !tichy) {
    var iop = new IntersectionObserver(function (zaz) {
      zaz.forEach(function (z) { if (z.isIntersecting) { iop.unobserve(z.target); pocitaj(z.target); } });
    }, { threshold: 0.5 });
    poc.forEach(function (el) { iop.observe(el); });
  }

  /* ---------- prílet pri skrolovaní: nikdy neskrýva obsah vopred ----------
     Prvky na obrazovke pri načítaní sa nehýbu. Prvky pod okrajom dostanú .prilet o 160 px skôr, než vojdú
     do obrazovky (animácia beží mimo nej). Po 1,5 s sa už nič nespúšťa, obsah je celý čas viditeľný. */
  var pri = vsetky(".pri");
  function hotovo() { this.classList.remove("prilet", "pri"); }
  if ("IntersectionObserver" in window && !tichy) {
    var io = new IntersectionObserver(function (zaz) {
      zaz.forEach(function (z) {
        if (!z.isIntersecting) return;
        io.unobserve(z.target);
        var rod = z.target.parentNode, i = Array.prototype.indexOf.call(rod.children, z.target) % 4;
        z.target.style.setProperty("--d", (i * 60) + "ms");
        z.target.classList.add("prilet");
        /* po dobehnutí animáciu zrušiť: Chromium inak nechá mimo obrazovky „zamrznutý“ medzistav (priesvitná karta) */
        z.target.addEventListener("animationend", hotovo, { once: true });
        setTimeout(hotovo.bind(z.target), 1400);
      });
    }, { rootMargin: "0px 0px 160px 0px" });
    var vh = window.innerHeight;
    pri.forEach(function (el) {
      if (el.getBoundingClientRect().top > vh + 160) io.observe(el);
    });
    setTimeout(function () { io.disconnect(); }, 1500);
  }

  /* ---------- pódium v hero: autá prichádzajú zboku ---------- */
  vsetky("[data-podium]").forEach(function (s) {
    var sl = vsetky(".sc-slajd", s), th = vsetky("[data-na]", s.parentNode);
    if (sl.length < 2) return;
    var i = 0, timer = null, viditelny = true, nad = false;
    function ukaz(n, smer) {
      var nove = (n + sl.length) % sl.length;
      if (nove === i) return;
      smer = smer || (nove > i ? 1 : -1);
      s.style.setProperty("--smer", smer);
      var stary = sl[i], novy = sl[nove];
      novy.classList.add("prichod");
      void novy.offsetWidth;
      novy.classList.remove("prichod");
      stary.classList.remove("on");
      stary.classList.add("von");
      stary.setAttribute("aria-hidden", "true");
      setTimeout(function () { stary.classList.remove("von"); }, 950);
      novy.classList.add("on");
      novy.removeAttribute("aria-hidden");
      vsetky("a", stary).forEach(function (a) { a.tabIndex = -1; });
      vsetky(".sc-meno a, .sc-cena", novy).forEach(function (a) { a.tabIndex = 0; });
      vsetky("img[loading=lazy]", novy).forEach(function (im) { im.loading = "eager"; });
      th.forEach(function (t, k) { t.classList.toggle("on", k === nove); });
      i = nove;
    }
    function start() {
      stop();
      if (tichy || !viditelny || nad || document.hidden) return;
      timer = setInterval(function () { ukaz(i + 1, 1); }, 6000);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    vsetky("[data-krok]", s).forEach(function (b) {
      b.addEventListener("click", function () { var k = parseInt(b.getAttribute("data-krok"), 10); ukaz(i + k, k); start(); });
    });
    th.forEach(function (b) {
      b.addEventListener("click", function () { ukaz(parseInt(b.getAttribute("data-na"), 10)); start(); });
    });
    /* ďalšie výrezy prednačítať, keď je pokoj (plynulý prvý prechod) */
    setTimeout(function () { vsetky("img[loading=lazy]", s).forEach(function (im) { im.loading = "eager"; }); }, 1200);
    s.parentNode.addEventListener("mouseenter", function () { nad = true; stop(); });
    s.parentNode.addEventListener("mouseleave", function () { nad = false; start(); });
    s.addEventListener("focusin", function () { nad = true; stop(); });
    document.addEventListener("visibilitychange", start);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (z) { viditelny = z[0].isIntersecting; start(); }).observe(s);
    }
    swipe(s, function (smer) { ukaz(i + smer, smer); start(); });
    s.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { ukaz(i - 1, -1); start(); }
      if (e.key === "ArrowRight") { ukaz(i + 1, 1); start(); }
    });
    start();
  });

  /* ---------- stránkovanie ponuky: prvých N zhôd, „Zobraziť ďalšie“ pridá ďalších N ----------
     Bez JS sú viditeľné všetky autá. Skryté karty majú display:none, ich fotky sa nenačítajú. */
  var strankovane = vsetky("[data-strana]");
  strankovane.forEach(function (g) {
    var krok = parseInt(g.getAttribute("data-strana"), 10) || 24;
    g._limit = krok;
    var box = g.parentNode.querySelector("[data-viac]");
    if (box) box.querySelector("[data-viac-btn]").addEventListener("click", function () {
      var prva = zhody(g)[g._limit];
      g._limit += krok;
      strankuj();
      vypln();
      if (prva) { var a = prva.querySelector("h3 a"); if (a) a.focus({ preventScroll: true }); }
    });
  });
  function zhody(g) { return vsetky("[data-auto]", g).filter(function (k) { return !k.hidden; }); }
  function strankuj() {
    strankovane.forEach(function (g) {
      var z = zhody(g), box = g.parentNode.querySelector("[data-viac]");
      z.forEach(function (k, i) { k.classList.toggle("za-limitom", i >= g._limit); });
      var zobr = Math.min(z.length, g._limit);
      g.setAttribute("data-dalsie", z.length > g._limit ? "1" : "0");
      if (!box) return;
      box.hidden = z.length <= g._limit;
      box.querySelector("[data-viac-zobr]").textContent = zobr;
      box.querySelector("[data-viac-spolu]").textContent = z.length;
      box.querySelector("[data-viac-pruh]").style.width = (z.length ? zobr / z.length * 100 : 0) + "%";
    });
  }
  function novyFilter() {
    strankovane.forEach(function (g) { g._limit = parseInt(g.getAttribute("data-strana"), 10) || 24; });
    strankuj();
  }
  strankuj();

  /* ---------- výplň posledného riadku mriežky (nikdy osamelá karta) ---------- */
  function vypln() {
    vsetky("[data-vypln]").forEach(function (g) {
      var t = g.querySelector("[data-vypln-tile]");
      if (!t) return;
      var karty = vsetky("[data-auto]", g).filter(function (k) { return !k.hidden && k.offsetParent !== null; });
      g.appendChild(t);
      var stlpce = getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
      var zvysok = karty.length % stlpce;
      if (g.getAttribute("data-dalsie") === "1") { t.hidden = true; }
      else if (!karty.length || stlpce < 2) { t.hidden = !karty.length || g.getAttribute("data-vypln") !== "plna" || stlpce > 1; }
      else if (zvysok === 0) { t.hidden = g.getAttribute("data-vypln") !== "plna"; t.style.setProperty("--span", stlpce); }
      else { t.hidden = false; t.style.setProperty("--span", stlpce - zvysok); }
    });
  }
  vypln();
  window.addEventListener("resize", function () { clearTimeout(vypln.t); vypln.t = setTimeout(vypln, 120); });
  vsetky("form[data-filter]").forEach(function (f) {
    f.addEventListener("input", function () { setTimeout(function () { novyFilter(); vypln(); }, 0); });
    f.addEventListener("reset", function () { setTimeout(function () { novyFilter(); vypln(); }, 20); });
  });
  vsetky("select[data-zoradit]").forEach(function (z) { z.addEventListener("change", function () { setTimeout(function () { strankuj(); vypln(); }, 0); }); });
})();
