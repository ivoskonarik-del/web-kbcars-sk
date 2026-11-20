/* Živá ponuka áut z administrácie (site/admin_auta.py, ADMIN-AUTA.md). Bez knižníc.
   1. stiahne ponuku z API (najviac 3,5 s) a auta.json z buildu,
   2. prekreslí karty (úvod, ponuka, podobné), slider, filtre, počty, porovnanie, detail auta,
   3. až potom spustí skripty šablóny (data-po), aby filter, galéria a kalkulačka videli nový obsah.
   Keď API neodpovie, web ostane taký, aký bol postavený. Karty áut, ktoré sa nezmenili, ostávajú zo statického HTML. */
(function () {
  "use strict";
  var S = document.currentScript;
  var API = S.getAttribute("data-api"), SITE = S.getAttribute("data-site"), R = S.getAttribute("data-r") || "";
  var PO = []; try { PO = JSON.parse(S.getAttribute("data-po") || "[]"); } catch (e) {}
  var NB = " ", UROK = 7.9, AKO = 20, MES = 72;
  var K = { ik: {} };

  function spustiSkripty() {
    if (spustiSkripty.hotovo) return; spustiSkripty.hotovo = true;
    document.documentElement.classList.remove("ab-gen");
    PO.forEach(function (src) { var s = document.createElement("script"); s.src = src; s.async = false; document.body.appendChild(s); });
  }

  /* ---------- formáty (= spolocne.py / salon.py) ---------- */
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (z) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[z]; }); }
  function cislo(n) { n = Math.round(+n); return isFinite(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB) : ""; }
  function cena(e) { return e ? cislo(e) + NB + "€" : "Cena na vyžiadanie"; }
  function km(n) { return n == null || n === "" ? "" : cislo(n) + NB + "km"; }
  function vykon(kw) { return kw ? cislo(kw) + NB + "kW (" + cislo(kw * 1.35962) + NB + "k)" : ""; }
  function objem(c) { return c ? cislo(c) + NB + "cm³" : ""; }
  function bezP(t) { return String(t || "").replace(/\s+[-–—]\s+/g, ", ").replace(/[—–]/g, ", "); }
  function splatka(c) { if (!c) return 0; var u = c * (1 - AKO / 100), r = UROK / 1200; return Math.round(u * r / (1 - Math.pow(1 + r, -MES))); }
  var BEZ_SPLATOK = S.hasAttribute("data-bez-splatok");   // 3. 11. (KB Cars): bez kalkulačky a „od X €/mes.“
  function maSplatku(a) { return !BEZ_SPLATOK && (a.cena || 0) >= 2000; }
  function palivoN(a) {
    var p = String(a.palivo || "").toLowerCase(); if (!p) return "";
    if (p.indexOf("hybrid") > -1) return "Hybrid"; if (p.indexOf("elektr") > -1) return "Elektro";
    if (p.indexOf("diesel") > -1 || p.indexOf("nafta") > -1) return "Diesel"; if (p.indexOf("lpg") > -1) return "LPG";
    if (p.indexOf("cng") > -1) return "CNG"; if (p.indexOf("benz") > -1) return "Benzín"; return bezP(a.palivo);
  }
  function prevN(a) { var p = String(a.prevodovka || "").toLowerCase(); return p.indexOf("automat") > -1 ? "Automatická" : p.indexOf("manu") > -1 ? "Manuálna" : ""; }
  function karN(a) {
    var k = String(a.karoseria || "").trim(), l = k.toLowerCase(); if (!k) return "";
    if (l.indexOf("suv") === 0 || l.indexOf("off-road") > -1) return "SUV";
    if (["limuzína", "sedan"].indexOf(l) > -1) return "Sedan";
    if (["van", "mpv/van", "mpv", "minivan", "mpv / van"].indexOf(l) > -1) return "MPV a van";
    if (["dodávka", "valník", "pick-up", "pickup", "skriňa"].indexOf(l) > -1) return "Úžitkové";
    if (["kabriolet", "cabrio", "roadster"].indexOf(l) > -1) return "Kabriolet";
    return bezP(k);
  }
  function titul(a) { return [((a.znacka || "") + " " + (a.model || "")).trim() || a.nazov || "Auto", a.verzia || ""]; }
  function meno(a) { var t = titul(a); return (t[0] + " " + t[1]).trim(); }
  function parametre(a) {
    var o = [["kalendar", "Rok výroby", a.mesiac && a.rok ? a.mesiac + "/" + a.rok : a.rok || ""], ["tachometer", "Najazdené", km(a.km)],
      ["palivo", "Palivo", a.palivo || ""], ["prevodovka", "Prevodovka", a.prevodovka || ""], ["motor", "Výkon", vykon(a.vykon_kw)],
      ["objem", "Objem motora", objem(a.objem)], ["karoseria", "Karoséria", a.karoseria || ""], ["pohon", "Pohon", a.pohon || ""]];
    return o.filter(function (x) { return x[2]; }).map(function (x) { return [x[0], x[1], bezP(String(x[2]))]; });
  }
  function ik(n, v) { var s = K.ik[n] || ""; return v ? s.replace(/width="24" height="24"/, 'width="' + v + '" height="' + v + '"') : s; }
  function iku(n) { return '<svg class="ik" width="16" height="16" aria-hidden="true"><use href="#s-' + n + '"/></svg>'; }
  function foto(f) { return /^https:\/\//.test(f) ? f : R + "fotky/" + f; }

  /* ---------- porovnanie dát: build vs. API (rovnaké normovanie ako worker.js) ---------- */
  function kanon(a) {
    var k = Object.keys(a).filter(function (x) { var v = a[x]; return !(v === null || v === undefined || v === "" || v === false || (Array.isArray(v) && !v.length)); }).sort();
    return JSON.stringify(k.map(function (x) { return [x, a[x]]; }));
  }

  var STAV = { build: {}, statik: {}, zive: {}, vis: [] };
  function rovnake(a) { var b = STAV.build[a.id]; return !!b && kanon(b) === kanon(a); }
  function href(a) { return STAV.statik[a.id] ? R + "auto/" + encodeURIComponent(a.id) + "/" : R + "auto/?id=" + encodeURIComponent(a.id); }

  /* ---------- karta (= portal.karta) ---------- */
  function karta(a, i) {
    var t = titul(a), alt = meno(a), f = a.fotky || [];
    var fh = f.length ? '<img loading="lazy" decoding="async" src="' + esc(foto(f[0])) + '" alt="' + esc(alt) + '" width="800" height="600">' +
      (f.length > 1 ? '<img class="druha" loading="lazy" decoding="async" src="' + esc(foto(f[1])) + '" alt="" width="800" height="600">' : "")
      : '<span class="bez-fotky">' + ik("fotak", 32) + "<span>Fotky doplníme</span></span>";
    var sp = [];
    if (a.rok) sp.push(["kalendar", String(a.rok)]);
    if (a.km != null && a.km !== "") sp.push(["tachometer", km(a.km)]);
    if (palivoN(a)) sp.push(["palivo", palivoN(a)]);
    if (prevN(a)) sp.push(["prevodovka", prevN(a) === "Automatická" ? "Automat" : "Manuál"]);
    else if (a.vykon_kw) sp.push(["motor", cislo(a.vykon_kw) + NB + "kW"]);
    var stara = a.povodna_cena && a.cena && a.povodna_cena > a.cena ? "<s>" + cena(a.povodna_cena) + "</s>" : "";
    var por = JSON.stringify({ id: a.id, n: alt, c: cena(a.cena), f: f[0] || "" });
    var nazov = [t[0], t[1], a.model || ""].join(" ").toLowerCase();
    var el = document.createElement("div");
    el.innerHTML = '<article class="karta pri" data-auto data-poradie="' + i + '" data-znacka="' + esc(a.znacka) + '" data-palivo="' + esc(palivoN(a)) +
      '" data-prevodovka="' + esc(prevN(a).toLowerCase()) + '" data-karoseria="' + esc(karN(a)) + '" data-cena="' + (a.cena || 0) +
      '" data-rok="' + (a.rok || 0) + '" data-km="' + (a.km || 0) + '" data-nazov="' + esc(nazov) + '" data-id="' + esc(a.id) + '">' +
      '<div class="karta-foto">' + fh + '</div><div class="karta-telo"><h3><a href="' + esc(href(a)) + '">' + esc(t[0]) + "</a></h3>" +
      '<p class="karta-var">' + (t[1] ? esc(t[1]) : "&nbsp;") + '</p><ul class="karta-spec">' +
      sp.slice(0, 4).map(function (x) { return "<li>" + iku(x[0]) + "<span>" + esc(x[1]) + "</span></li>"; }).join("") + "</ul>" +
      '<label class="pt-porovnaj"><input type="checkbox" data-porovnaj="' + esc(por) + '"><span>Porovnať</span></label>' +
      '<div class="karta-cena"><strong>' + stara + cena(a.cena) + "</strong>" + (a.odpocet_dph ? '<span class="karta-dph">Možný odpočet DPH</span>' : "") +
      (maSplatku(a) ? '<span class="karta-mes">od ' + cislo(splatka(a.cena)) + NB + "€/mes.</span>" : "") +
      '<a class="pt-detail" href="' + esc(href(a)) + '" tabindex="-1" aria-hidden="true">Detail' + ik("sipka", 16) + "</a></div></div></article>";
    return el.firstChild;
  }
  function idKarty(el) { var a = el.querySelector("h3 a"); var m = a && /auto\/(?:\?id=)?([A-Za-z0-9_%-]+)/.exec(a.getAttribute("href")); return el.getAttribute("data-id") || (m ? decodeURIComponent(m[1]) : null); }

  function prekresliMriezku(g, auta) {
    var stare = {};
    [].forEach.call(g.querySelectorAll("[data-auto]"), function (el) { stare[idKarty(el)] = el; el.parentNode.removeChild(el); });
    var tile = g.querySelector("[data-vypln-tile]");
    auta.forEach(function (a, i) {
      var el = rovnake(a) && stare[a.id] ? stare[a.id] : karta(a, i);
      el.setAttribute("data-poradie", i);
      g.insertBefore(el, tile || null);
    });
  }

  function podobne(a, n) {
    var c = a.cena || 0;
    return STAV.vis.filter(function (x) { return x.id !== a.id; }).map(function (x, i) { return [x, i]; }).sort(function (p, q) {
      var x = p[0], y = q[0];
      return (!(x.fotky || []).length - !(y.fotky || []).length) || ((x.znacka !== a.znacka) - (y.znacka !== a.znacka)) ||
        (Math.abs((x.cena || 0) - c) - Math.abs((y.cena || 0) - c)) || (p[1] - q[1]);
    }).slice(0, n || 4).map(function (p) { return p[0]; });
  }

  /* ---------- počty „35 áut“ ---------- */
  function slovo(n) { return n === 1 ? "auto" : n >= 2 && n <= 4 ? "autá" : "áut"; }
  function pocty(stary, novy) {
    if (stary === novy) return;
    document.querySelectorAll(".nav-pocet").forEach(function (e) { e.textContent = novy; });
    document.querySelectorAll("[data-pocet-aut]").forEach(function (e) { e.textContent = novy; if (e.hasAttribute("data-pocitadlo")) e.setAttribute("data-pocitadlo", novy); });
    document.querySelectorAll("[data-pocet-slovo]").forEach(function (e) { e.textContent = e.textContent.replace(/^(áut|autá|auto)(?![a-zá])/, slovo(novy)); });
    var re = new RegExp("(^|[^0-9])" + stary + "([\\s\\u00a0])(áut|autá|auto)(?![a-zá])", "g");
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, z = [];
    while ((n = w.nextNode())) if (re.test(n.nodeValue)) z.push(n);
    z.forEach(function (n) { n.nodeValue = n.nodeValue.replace(re, function (m, a, b) { return a + novy + b + slovo(novy); }); });
    document.querySelectorAll(".odkaz-sipka").forEach(function (e) { e.innerHTML = e.innerHTML.replace("(" + stary + ")", "(" + novy + ")"); });
  }

  /* ---------- filtre: možnosti podľa živej ponuky ---------- */
  function moznosti() {
    var poc = function (f) { var c = {}; STAV.vis.forEach(function (a) { var v = f(a); if (v) c[v] = (c[v] || 0) + 1; });
      return Object.keys(c).sort(function (x, y) { return c[y] - c[x] || (x < y ? -1 : 1); }).map(function (k) { return [k, c[k]]; }); };
    var m = { znacka: [poc(function (a) { return a.znacka; }), function (v) { return v; }],
      palivo: [poc(palivoN), function (v) { return v; }], karoseria: [poc(karN), function (v) { return v; }],
      prevodovka: [poc(prevN), function (v) { return v.toLowerCase(); }] };
    document.querySelectorAll("select[name=znacka],select[name=palivo],select[name=karoseria],select[name=prevodovka]").forEach(function (s) {
      var d = m[s.name]; if (!d || !s.options.length) return;
      var prva = s.options[0].outerHTML;
      s.innerHTML = prva + d[0].map(function (x) { return '<option value="' + esc(d[1](x[0])) + '">' + esc(x[0]) + " (" + x[1] + ")</option>"; }).join("");
    });
  }

  /* ---------- úvod: slider a autá na financovanie ---------- */
  function slider() {
    var s = document.querySelector("[data-slider]"); if (!s) return;
    var nahl = s.parentNode.querySelector(".nahlady");
    var fig = [].slice.call(s.querySelectorAll("figure.slajd")), na = nahl ? [].slice.call(nahl.querySelectorAll("[data-na]")) : [];
    var ost = 0;
    fig.forEach(function (f, i) {
      var m = /auto\/([^/]+)\//.exec((f.querySelector("a") || {}).getAttribute ? f.querySelector("a").getAttribute("href") : "");
      var a = m && STAV.zive[m[1]];
      if (!a) { f.parentNode.removeChild(f); if (na[i]) na[i].parentNode.removeChild(na[i]); return; }
      if (!rovnake(a)) { var st = f.querySelector("strong"); if (st) st.textContent = cena(a.cena); }
      f.setAttribute("data-slajd", ost); f.classList.toggle("on", ost === 0);
      if (na[i]) { na[i].setAttribute("data-na", ost); na[i].classList.toggle("on", ost === 0); }
      ost++;
    });
    if (!ost) { var v = s.closest(".hero-vizual"); if (v) v.hidden = true; }
  }
  function skryOdkazy() {
    document.querySelectorAll(".fin-auto").forEach(function (el) {
      var m = /auto\/([^/]+)\//.exec(el.getAttribute("href") || ""); if (m && !STAV.zive[m[1]]) el.parentNode.removeChild(el);
    });
  }

  /* ---------- porovnanie ---------- */
  function porovnanie() {
    var src = document.getElementById("pt-auta"); if (!src) return;
    var o = {};
    STAV.vis.forEach(function (a) {
      o[a.id] = { n: meno(a), f: (a.fotky || [])[0] || "", c: cena(a.cena), cn: a.cena || 0,
        p: parametre(a).map(function (x) { return [x[1], x[2]]; }), v: (a.vybava || []).length };
    });
    src.textContent = JSON.stringify(o);
  }

  /* ---------- detail auta ---------- */
  var SKUP = [
    ["Bezpečnosť", ["airbag", "abs", "esp", "asr", "isofix", "asistent", "brzd", "imobiliz", "alarm", "mŕtveho", "tpms", "tlaku", "únavy", "e-call", "tiesňov", "kontrola", "ebd", "dsc", "nočné", "varovanie", "rcta", "mechanické", "ads", "značiek", "pruhu", "zabezpeč", "deaktivácia"]],
    ["Komfort", ["kožen", "klimatiz", "tempomat", "vyhrieva", "sedadl", "sedačk", "opierk", "elektrické", "bezkľúč", "senzor", "lakť", "kúren", "volant", "kufra", "masáž", "odvetráv", "pamäťov", "doťahov", "šíber", "strech", "radenie", "posilňov", "centráln", "diaľkov", "okná", "zrkadl", "kamera", "parkovac", "odpružen", "podvozok", "priehradk"]],
    ["Multimédiá", ["rádio", "bluetooth", "navig", "android", "carplay", "displej", "kokpit", "počítač", "nabíjan", "wifi", "wlan", "tv", "lcd", "cd ", "head-up", "multifunk"]],
    ["Svetlá a exteriér", ["svetl", "led", "xenón", "matrix", "hmlovk", "disky", "nosič", "ťažné", "sklá", "sklo", "fólie", "welcome", "ostrekov", "teplomer", "prezutie"]]];
  function vybavaHtml(a) {
    var v = []; (a.vybava || []).forEach(function (x) { x = String(x).trim(); if (x && v.indexOf(x) < 0) v.push(x); });
    if (!v.length) return "";
    var sk = {};
    v.forEach(function (x) { var t = x.toLowerCase(), m = "Ďalšia výbava";
      for (var i = 0; i < SKUP.length; i++) if (SKUP[i][1].some(function (k) { return t.indexOf(k) > -1; })) { m = SKUP[i][0]; break; }
      (sk[m] = sk[m] || []).push(x); });
    return '<section class="det-sek" id="vybava"><h2>Výbava <span class="det-pocet">' + v.length + ' položiek</span></h2><div class="pt-vybava">' +
      SKUP.map(function (s) { return s[0]; }).concat(["Ďalšia výbava"]).filter(function (m) { return sk[m]; }).map(function (m) {
        return '<div class="pt-vyb-sk"><h3>' + esc(m) + " <span>" + sk[m].length + "</span></h3><ul>" +
          sk[m].map(function (x) { return "<li>" + ik("check", 16) + esc(bezP(x)) + "</li>"; }).join("") + "</ul></div>";
      }).join("") + "</div></section>";
  }
  function popisHtml(a) {
    var bl = String(a.popis || "").replace(/\r/g, "").split(/\n/).map(function (x) { return x.trim(); })
      .filter(function (x) { return x && !/^[-–—=_*#.~\s]+$/.test(x); });
    if (!bl.length) return "";
    return '<section class="det-sek" id="popis"><h2>Popis od predajcu</h2><div class="popis">' + bl.map(function (x) {
      var c = x.split("|").map(function (y) { return y.trim(); }).filter(Boolean);
      return c.length >= 3 ? '<ul class="popis-body">' + c.map(function (y) { return "<li>" + ik("check", 18) + esc(bezP(y)) + "</li>"; }).join("") + "</ul>" : "<p>" + esc(bezP(x)) + "</p>";
    }).join("") + "</div></section>";
  }
  function galeriaHtml(a) {
    var f = a.fotky || [], m = meno(a);
    if (!f.length) return '<div class="galeria"><div class="g-stage g-prazdna">' + ik("fotak", 40) + "<p>Fotky k tomuto autu doplníme. Radi Vám ich pošleme.</p></div></div>";
    var st = f.map(function (x, i) {
      return '<a class="g-foto' + (i ? "" : " on") + '" href="' + esc(foto(x)) + '" data-foto aria-label="Zväčšiť fotku ' + (i + 1) + '"><img ' +
        (i ? 'loading="lazy" decoding="async" ' : 'fetchpriority="high" ') + 'src="' + esc(foto(x)) + '" alt="' + esc(m + ", fotka " + (i + 1)) + '" width="1600" height="1200"></a>';
    }).join("");
    var nav = f.length > 1 ? '<button type="button" class="g-sipka g-vlavo" data-g-krok="-1" aria-label="Predchádzajúca fotka">' + ik("vlavo") + "</button>" +
      '<button type="button" class="g-sipka g-vpravo" data-g-krok="1" aria-label="Ďalšia fotka">' + ik("vpravo") + "</button>" +
      '<span class="pt-g-pocet" data-g-pocet>1 / ' + f.length + "</span>" : "";
    var th = f.length > 1 ? '<div class="g-nahlady">' + f.map(function (x, i) {
      return '<button type="button" class="g-nahlad' + (i ? "" : " on") + '" data-g-na="' + i + '" aria-label="Fotka ' + (i + 1) + '"><img loading="lazy" decoding="async" src="' + esc(foto(x)) + '" alt="" width="320" height="240"></button>';
    }).join("") + "</div>" : "";
    return '<div class="galeria" data-galeria data-g><div class="g-stage">' + st + nav + '<span class="g-zvacsit">' + ik("lupa", 20) + "</span></div>" + th + "</div>";
  }
  function kontaktUrl(a, ucel, sCenou) {
    return R + "kontakt/?auto=" + encodeURIComponent(meno(a) + (sCenou ? ", " + cena(a.cena) : "")) + "&id=" + encodeURIComponent(a.id) + (ucel ? "&ucel=" + ucel : "") + "#formular";
  }
  function kartaCeny(a) {
    var c = cena(a.cena), sp = splatka(a.cena);
    var stara = a.povodna_cena && a.cena && a.povodna_cena > a.cena ? '<p class="det-cena-stara"><s class="cena-stara">' + cena(a.povodna_cena) + '</s><span class="zlava">Zľava ' + cena(a.povodna_cena - a.cena) + "</span></p>" : "";
    var plus = [];
    if (a.leasing || a.uver || K.finSluzba) plus.push("Možnosť leasingu aj úveru");
    if (K.vyk) plus.push("Vaše auto vykúpime na protiúčet");
    if (a.vin) plus.push("VIN zverejnené, históriu si overíte");
    if (K.poist) plus.push("Poistenie vybavíme na mieste");
    var kalk = maSplatku(a) ? '<details class="det-kalk" open><summary>' + ik("percento", 18) + "Spočítať splátku" + ik("dole", 16) + '</summary><div class="kalk kalk-mini" data-kalkulacka>' +
      '<input type="hidden" name="cena" value="' + a.cena + '">' +
      '<div class="kalk-riadok"><label for="d-akontacia">Akontácia</label><output for="d-akontacia">' + AKO + ' %</output><input id="d-akontacia" type="range" name="akontacia" min="0" max="60" step="5" value="' + AKO + '"></div>' +
      '<div class="kalk-riadok"><label for="d-mesiace">Doba splácania</label><output for="d-mesiace">' + MES + ' mes.</output><input id="d-mesiace" type="range" name="mesiace" min="12" max="96" step="12" value="' + MES + '"></div>' +
      '<input type="hidden" name="urok" value="' + UROK + '"><div class="kalk-vysledok"><p><span>Mesačná splátka</span><strong data-splatka>' + cislo(sp) + ' €</strong></p>' +
      '<dl><div><dt>Výška úveru</dt><dd data-uver>' + cena(a.cena * (1 - AKO / 100)) + '</dd></div><div><dt>Akontácia</dt><dd data-ako-suma>' + cena(a.cena * AKO / 100) + "</dd></div></dl></div>" +
      '<p class="kalk-pozn">Orientačný výpočet s úrokom 7,9 % ročne. Presnú ponuku pripravíme podľa financujúcej spoločnosti.</p></div></details>' : "";
    var por = JSON.stringify({ id: a.id, n: meno(a), c: c, f: (a.fotky || [])[0] || "" });
    return '<aside class="det-karta" id="cena"><p class="det-cena">' + c + "</p>" + (a.odpocet_dph ? '<p class="det-dph">Možný odpočet DPH</p>' : "") + stara +
      (maSplatku(a) ? '<p class="det-mes">alebo od <b>' + cislo(sp) + NB + "€</b> mesačne</p>" : "") +
      '<div class="det-btns"><a class="btn btn-ak btn-velky btn-blok" href="' + esc(kontaktUrl(a, "", true)) + '">Mám záujem</a>' +
      '<a class="btn btn-obrys btn-blok" href="' + esc(kontaktUrl(a, "obhliadka")) + '">' + ik("kalendar", 20) + "<span>Dohodnúť obhliadku</span></a>" +
      '<a class="btn btn-obrys btn-blok" href="' + esc(kontaktUrl(a, "jazda")) + '">' + ik("kluc", 20) + "<span>Testovacia jazda</span></a>" +
      (K.tel ? '<a class="btn btn-obrys btn-blok" href="' + esc(K.telHref) + '">' + ik("telefon", 20) + "<span>" + esc(K.tel) + "</span></a>" : "") + "</div>" +
      '<label class="pt-porovnaj pt-porovnaj-det"><input type="checkbox" data-porovnaj="' + esc(por) + '"><span>Pridať do porovnania</span></label>' + kalk +
      (plus.length ? '<ul class="det-plus">' + plus.slice(0, 4).map(function (t) { return "<li>" + ik("check", 18) + esc(t) + "</li>"; }).join("") + "</ul>" : "") + "</aside>";
  }
  function faktyHtml(a) {
    var f = [];
    if (a.rok) f.push(["kalendar", "Rok", String(a.rok)]);
    if (a.km != null && a.km !== "") f.push(["tachometer", "Najazdené", km(a.km)]);
    if (palivoN(a)) f.push(["palivo", "Palivo", palivoN(a)]);
    if (prevN(a)) f.push(["prevodovka", "Prevodovka", prevN(a)]);
    if (a.vykon_kw) f.push(["motor", "Výkon", vykon(a.vykon_kw)]);
    return f.length ? '<ul class="pt-fakty">' + f.map(function (x) { return "<li>" + ik(x[0], 22) + "<span>" + esc(x[1]) + "</span><b>" + esc(x[2]) + "</b></li>"; }).join("") + "</ul>" : "";
  }
  function jsonLd(a) {
    var d = { "@context": "https://schema.org", "@type": "Car", name: meno(a), brand: a.znacka ? { "@type": "Brand", name: a.znacka } : undefined,
      model: a.model, vehicleModelDate: a.rok ? String(a.rok) : undefined, fuelType: a.palivo, vehicleTransmission: a.prevodovka,
      bodyType: a.karoseria, driveWheelConfiguration: a.pohon, vehicleIdentificationNumber: a.vin, description: a.popis ? String(a.popis).slice(0, 500) : undefined,
      mileageFromOdometer: a.km ? { "@type": "QuantitativeValue", value: a.km, unitCode: "KMT" } : undefined,
      image: (a.fotky || []).slice(0, 5).map(function (f) { return new URL(foto(f), document.baseURI).href; }),
      offers: a.cena ? { "@type": "Offer", price: a.cena, priceCurrency: "EUR", availability: "https://schema.org/InStock", url: location.href,
        seller: { "@type": "AutoDealer", name: K.meno } } : undefined };
    [].forEach.call(document.querySelectorAll('script[type="application/ld+json"]'), function (s) { if (/"@type":\s*"Car"/.test(s.textContent)) s.parentNode.removeChild(s); });
    var s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(d); document.head.appendChild(s);
  }
  function detail(a) {
    var t = titul(a), d = document.querySelector(".detail"); if (!d) return;
    var dr = '<li><a href="' + R + '">Úvod</a></li><li><a href="' + R + 'ponuka/">Ponuka</a></li>' +
      (a.znacka ? '<li><a href="' + R + "ponuka/?znacka=" + encodeURIComponent(a.znacka) + '">' + esc(a.znacka) + "</a></li>" : "") +
      '<li aria-current="page">' + esc(a.model || t[0]) + "</li>";
    var ol = d.querySelector(".drobceky"); if (ol) ol.innerHTML = dr;
    var sub = [a.rok ? String(a.rok) : "", a.km != null && a.km !== "" ? km(a.km) : "", palivoN(a), karN(a)].filter(Boolean).join(", ");
    var h = d.querySelector(".det-hlava"); if (h) h.innerHTML = "<h1>" + esc(t[0]) + " <span>" + esc(t[1]) + '</span></h1><p class="det-sub">' + esc(sub) + "</p>" + faktyHtml(a);
    var tab = parametre(a).map(function (x) { return [x[1], x[2]]; });
    if (a.vin) tab.push(["VIN", String(a.vin)]);
    if (a.cena) tab.unshift(["Cena", cena(a.cena)]);
    var l = d.querySelector(".det-lavy");
    if (l) l.innerHTML = galeriaHtml(a) + '<section class="det-sek" id="parametre"><h2>Parametre</h2><table class="pt-tab">' +
      tab.map(function (x) { return "<tr><th scope=row>" + esc(x[0]) + "</th><td>" + esc(x[1]) + "</td></tr>"; }).join("") + "</table></section>" + vybavaHtml(a) + popisHtml(a);
    var p = d.querySelector(".det-pravy"); if (p) p.innerHTML = kartaCeny(a);
    var li = document.querySelector(".det-lista");
    if (li) li.innerHTML = "<div><b>" + cena(a.cena) + "</b>" + (maSplatku(a) ? "<span>od " + cislo(splatka(a.cena)) + NB + "€/mes.</span>" : "") +
      '</div><a class="btn btn-ak" href="' + esc(kontaktUrl(a, "", true)) + '">Mám záujem</a>';
    document.title = meno(a) + (a.rok ? ", " + a.rok : "") + ", " + cena(a.cena) + " | " + K.meno;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", meno(a) + ": " + sub + ". Cena " + cena(a.cena) + ". " + K.meno + ", " + K.adresa + ".");
    jsonLd(a);
  }
  function nieJe() {
    var d = document.querySelector(".detail .wrap"); if (!d) return;
    var hl = d.querySelector(".det-hlava"), gr = d.querySelector(".det-grid");
    if (hl) hl.innerHTML = '<h1>Toto auto už nie je v ponuke</h1><p class="det-sub">Mohlo byť predané alebo stiahnuté z predaja. Pozrite si ďalšie autá.</p>' +
      '<p><a class="btn btn-ak" href="' + R + 'ponuka/">Celá ponuka</a></p>';
    if (gr) gr.parentNode.removeChild(gr);
    var li = document.querySelector(".det-lista"); if (li) li.parentNode.removeChild(li);
    var m = document.createElement("meta"); m.name = "robots"; m.content = "noindex"; document.head.appendChild(m);
  }

  /* ---------- hlavný tok ---------- */
  function aplikuj(zive, build) {
    STAV.build = {}; STAV.statik = {};
    build.forEach(function (a) { STAV.build[a.id] = a; STAV.statik[a.id] = true; });
    STAV.vis = zive.filter(function (a) { return a && a.id && !a.skryte && !a.predane; });
    STAV.zive = {}; STAV.vis.forEach(function (a) { STAV.zive[a.id] = a; });
    var vsetkyBuild = build.length, n = STAV.vis.length;

    var zoznam = document.getElementById("zoznam");
    if (zoznam) prekresliMriezku(zoznam, STAV.vis);
    var uvod = document.querySelector(".ponuka-uvod .mriezka");
    if (uvod) prekresliMriezku(uvod, STAV.vis.slice(0, Math.max(uvod.querySelectorAll("[data-auto]").length, 4)));
    slider(); skryOdkazy(); moznosti(); porovnanie();

    var det = document.querySelector(".detail .det-hlava");
    if (det) {
      var q = new URLSearchParams(location.search).get("id");
      var m = /\/auto\/([^/?#]+)\/?$/.exec(location.pathname);
      var id = q || (m ? decodeURIComponent(m[1]) : null);
      var gen = document.documentElement.classList.contains("ab-gen");
      var a = id && STAV.zive[id];
      if (!a) nieJe();
      else {
        if (gen || !rovnake(a)) detail(a);
        var pg = document.querySelector(".podobne .mriezka");
        if (pg) prekresliMriezku(pg, podobne(a, 4));
        if (gen) {
          var c = document.createElement("link"); c.rel = "canonical"; c.href = location.href; document.head.appendChild(c);
        }
      }
    } else {
      document.querySelectorAll(".podobne .mriezka").forEach(function (g) { prekresliMriezku(g, STAV.vis.slice(0, 4)); });
    }
    pocty(vsetkyBuild, n);
  }

  function ziskaj(url, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
    return fetch(url, { signal: ctrl ? ctrl.signal : undefined, credentials: "omit" })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }

  function start() {
    var bezpecne = setTimeout(spustiSkripty, 6000);
    Promise.all([
      ziskaj(API + "/auta/" + SITE, 3500).catch(function () { return null; }),
      ziskaj(R + "auta.json", 5000).catch(function () { return null; }),
      ziskaj(R + "auta-konf.json", 5000).catch(function () { return {}; }),
    ]).then(function (v) {
      var doc = v[0], build = v[1];
      K = v[2] || K; K.ik = K.ik || {};
      try { // majiteľ hneď po uložení vidí svoju kópiu (KV sa rozšíri do minúty)
        var lok = JSON.parse(localStorage.getItem("auta-zive:" + SITE) || "null");
        if (lok && lok.auta && (!doc || !doc.upravene || lok.upravene > doc.upravene)) doc = lok;
      } catch (e) {}
      if (build) aplikuj((doc && doc.auta) || build, build);
      document.documentElement.setAttribute("data-auta-zive", doc && doc.auta ? "api" : "build");
    }).catch(function (e) { if (window.console) console.warn("auta-zive", e); })
      .then(function () { clearTimeout(bezpecne); spustiSkripty();
        if (!document.documentElement.hasAttribute("data-auta-zive")) document.documentElement.setAttribute("data-auta-zive", "chyba"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
