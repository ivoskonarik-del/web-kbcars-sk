/* Správa áut v2 (23. 10. 2026, KB Cars). Bez knižníc, mobile first: majiteľ ju používa na telefóne priamo na ploche.
   Prihlásenie heslom -> token z API (30 dní) v localStorage.
   Dáta: GET/POST <api>/auta/<site> (celá ponuka v poradí, ako je na webe), fotky POST <api>/foto/<site> (zmenšené na 1600 px).
   Každá akcia hneď uloží celú ponuku; skrytie, predané a zmazanie sa dajú vrátiť tlačidlom Späť.
   Rozpísané auto sa priebežne ukladá v prehliadači ako koncept. */
(function () {
  "use strict";
  var B = document.body, API = B.getAttribute("data-api"), SITE = B.getAttribute("data-site");
  var KT = "aa-token:" + SITE, KL = "auta-zive:" + SITE, KK = "aa-koncept:" + SITE;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var esc = function (v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var NB = " ";
  var token = null, auta = [], upravene = null, zBuildu = false, buildIds = {}, uklada = false;
  var filter = "vsetky", hladat = "", radenie = false, otvorene = null;

  /* ---------- číselníky ---------- */
  var ZNACKY = {
    "Škoda": ["Fabia", "Scala", "Octavia", "Octavia Combi", "Superb", "Superb Combi", "Kamiq", "Karoq", "Kodiaq", "Enyaq", "Rapid", "Yeti", "Citigo", "Roomster"],
    "Volkswagen": ["Polo", "Golf", "Golf Variant", "Passat", "Passat Variant", "Arteon", "T-Roc", "T-Cross", "Tiguan", "Touareg", "Touran", "Sharan", "Caddy", "Transporter", "Caravelle", "Multivan", "Crafter", "Amarok", "ID.3", "ID.4"],
    "Audi": ["A1", "A3", "A4", "A4 Avant", "A5", "A6", "A6 Avant", "A6 Allroad", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "e-tron", "TT"],
    "BMW": ["Rad 1", "Rad 2", "Rad 3", "Rad 4", "Rad 5", "Rad 7", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "iX", "i3", "i4"],
    "Mercedes-Benz": ["A", "B", "C", "E", "S", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "ML", "G", "V", "Vito", "Sprinter", "EQA", "EQC", "EQE"],
    "Ford": ["Fiesta", "Focus", "Mondeo", "Kuga", "Puma", "S-Max", "Galaxy", "EcoSport", "Ranger", "Transit", "Transit Custom", "Tourneo"],
    "Opel": ["Corsa", "Astra", "Insignia", "Mokka", "Crossland", "Grandland", "Zafira", "Vivaro", "Movano"],
    "Peugeot": ["208", "308", "508", "2008", "3008", "5008", "Partner", "Rifter", "Expert", "Boxer"],
    "Citroën": ["C3", "C4", "C5", "C5 Aircross", "C4 Spacetourer", "Berlingo", "Jumpy", "Jumper"],
    "Renault": ["Clio", "Megane", "Captur", "Kadjar", "Austral", "Arkana", "Talisman", "Scenic", "Kangoo", "Trafic", "Master"],
    "Dacia": ["Sandero", "Logan", "Duster", "Jogger", "Spring"],
    "Hyundai": ["i10", "i20", "i30", "Kona", "Tucson", "Santa Fe", "Ioniq"],
    "Kia": ["Picanto", "Rio", "Ceed", "ProCeed", "XCeed", "Stonic", "Sportage", "Sorento", "Niro", "EV6"],
    "Toyota": ["Yaris", "Corolla", "C-HR", "RAV4", "Camry", "Land Cruiser", "Hilux", "Proace"],
    "Mazda": ["2", "3", "6", "CX-3", "CX-30", "CX-5", "CX-60", "MX-5"],
    "Nissan": ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf", "Navara"],
    "Volvo": ["V40", "V60", "V90", "S60", "S90", "XC40", "XC60", "XC90"],
    "Seat": ["Ibiza", "Leon", "Arona", "Ateca", "Tarraco", "Alhambra"], "Cupra": ["Leon", "Formentor", "Born", "Ateca"],
    "Honda": ["Jazz", "Civic", "HR-V", "CR-V"], "Suzuki": ["Swift", "Ignis", "Vitara", "S-Cross", "Jimny"],
    "Fiat": ["500", "Panda", "Tipo", "Doblo", "Ducato"], "Alfa Romeo": ["Giulietta", "Giulia", "Stelvio", "Tonale", "Brera"],
    "Jeep": ["Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler"], "Land Rover": ["Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Defender"],
    "Porsche": ["Cayenne", "Macan", "Panamera", "911", "Taycan"], "Tesla": ["Model 3", "Model Y", "Model S", "Model X"],
    "Mitsubishi": ["ASX", "Outlander", "L200", "Space Star"], "Subaru": ["Forester", "Outback", "XV"], "Lexus": ["IS", "ES", "NX", "RX", "UX"],
    "Iveco": ["Daily"], "MINI": ["Cooper", "Countryman", "Clubman"], "Smart": ["Fortwo", "Forfour"]
  };
  var PALIVA = ["Diesel", "Benzín", "Plug-in hybrid", "Hybrid (Elektrina - benzín)", "Hybrid (Elektrina - diesel)", "Elektromotor", "LPG + benzín", "CNG + benzín"];
  var MESIACE = ["január", "február", "marec", "apríl", "máj", "jún", "júl", "august", "september", "október", "november", "december"];
  var STUPNE = ["4", "5", "6", "7", "8", "9", "10", "bezstupňová"];
  // „7-st. automatická“ (formát Autobazar.eu) <-> typ + počet stupňov
  function rozlozPrevodovku(t) {
    t = String(t || "").trim(); var typ = /automat/i.test(t) ? "Automatická" : /manu/i.test(t) ? "Manuálna" : t, m = t.match(/(\d+)\s*-?\s*st/i);
    return { typ: typ, stupne: m ? m[1] : /bezstup/i.test(t) ? "bezstupňová" : "" };
  }
  function zlozPrevodovku(typ, st) {
    if (!typ) return "";
    if (st === "bezstupňová") return typ + " bezstupňová";
    return st ? st + "-st. " + typ.toLowerCase() : typ;
  }
  var PREVODOVKY = ["Manuálna", "Automatická"];
  var KAROSERIE = ["Combi", "Sedan", "Hatchback", "SUV", "MPV", "VAN", "Minibus", "Coupé", "Kabriolet", "Pick-up", "Dodávka", "Valník"];
  var POHONY = ["Predný", "Zadný", "4x4"];
  var VYBAVA = ["Klimatizácia", "Automatická klimatizácia", "Navigačný systém", "Tempomat", "Adaptívny tempomat", "Parkovacie senzory vpredu",
    "Parkovacie senzory vzadu", "Parkovacia kamera", "Kamera 360°", "Vyhrievané sedadlá", "Vyhrievaný volant", "Kožený interiér",
    "Elektrické sedadlá", "Bezkľúčové štartovanie", "Elektrické okná", "Elektrické zrkadlá", "Multifunkčný volant", "Bluetooth handsfree",
    "Android Auto", "Apple CarPlay", "LED svetlá", "Xenónové svetlá", "Hmlovky", "Hliníkové disky", "Ťažné zariadenie", "Strešné nosiče",
    "Panoramatická strecha", "Elektrické kufrové dvere", "Asistent jazdy v pruhu", "Isofix", "Dažďový senzor", "Webasto", "Zimné pneumatiky",
    "Servisná knižka"];

  /* ---------- ikony (jeden ťah 1,75) ---------- */
  var IK = {
    plus: '<path d="M12 5v14M5 12h14"/>', hladat: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    oko: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    upravit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    viac: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    predane: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    kopia: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    hore: '<path d="M12 19V5M5 12l7-7 7 7"/>', top: '<path d="M5 4h14M12 20V9M6 14l6-6 6 6"/>', dole: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    tahat: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
    zmazat: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', web: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    fotak: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', galeria: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    hviezda: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    spat: '<path d="M15 6l-6 6 6 6"/>', check: '<path d="m5 12 5 5 9-10"/>', radit: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>'
  };
  function ik(n, v) { return '<svg class="ik" width="' + (v || 20) + '" height="' + (v || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IK[n] + "</svg>"; }

  /* ---------- token a API ---------- */
  function citajToken() { try { return localStorage.getItem(KT) || sessionStorage.getItem(KT); } catch (e) { return null; } }
  function ulozToken(t) { try { localStorage.setItem(KT, t); } catch (e) {} token = t; }
  function zmazToken() { try { localStorage.removeItem(KT); sessionStorage.removeItem(KT); } catch (e) {} token = null; }
  function api(metoda, cesta, telo, hl) {
    var h = hl || {};
    if (token) h.Authorization = "Bearer " + token;
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 45000);
    return fetch(API + cesta, { method: metoda, headers: h, body: telo, cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        clearTimeout(t);
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) { var ch = new Error(d.chyba || "Niečo sa nepodarilo. Skúste to znova."); ch.status = r.status; throw ch; }
          return d;
        });
      }, function () {
        clearTimeout(t);
        var ch = new Error("Nie ste pripojený na internet alebo server neodpovedá. Skúste to o chvíľu znova."); ch.status = 0; throw ch;
      });
  }

  /* ---------- hlásenia ---------- */
  function toast(t, opt) {
    opt = opt || {};
    var el = $("#toast");
    el.className = "aa-toast" + (opt.chyba ? " aa-toast--chyba" : "");
    el.innerHTML = (opt.chyba ? "" : ik("check", 18)) + "<span>" + esc(t) + "</span>" + (opt.spat ? '<button type="button" class="aa-toast__spat">Späť</button>' : "");
    el.hidden = false;
    if (opt.spat) $(".aa-toast__spat", el).onclick = function () { el.hidden = true; opt.spat(); };
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.hidden = true; }, opt.spat ? 8000 : opt.chyba ? 7000 : 3000);
  }

  /* ---------- formáty ---------- */
  function cislo(n) { return n || n === 0 ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB) : ""; }
  function cena(n) { return n ? cislo(n) + NB + "€" : "Cena na vyžiadanie"; }
  function meno(a) { return ((a.znacka || "") + " " + (a.model || "")).trim() || "Auto bez názvu"; }
  function foto(f) { return /^https:\/\//.test(f) ? f : "../fotky/" + f; }
  function bez(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function naWebe(a) { return !a.skryte && !a.predane; }
  function rucne(a) { return !buildIds[a.id]; }
  function odkazWeb(a) { return buildIds[a.id] ? "../auto/" + encodeURIComponent(a.id) + "/" : "../auto/?id=" + encodeURIComponent(a.id); }
  function noveId() {
    var abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", s = "w", r = new Uint8Array(10);
    crypto.getRandomValues(r);
    for (var i = 0; i < r.length; i++) s += abc[r[i] % abc.length];
    return s;
  }
  function kopia(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- prihlásenie ---------- */
  function ukazLogin(sprava) {
    $("#app").hidden = true; $("#login").hidden = false;
    var ch = $("#login-chyba"); ch.hidden = !sprava; ch.textContent = sprava || "";
    setTimeout(function () { $("#heslo").focus(); }, 50);
  }
  $("#login-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var heslo = $("#heslo").value, tl = $("#login-tl");
    if (!heslo) { ukazLogin("Zadajte heslo."); return; }
    tl.disabled = true; tl.textContent = "Prihlasujem…";
    api("POST", "/login/" + SITE, JSON.stringify({ heslo: heslo, zapamatat: true }), { "Content-Type": "application/json" })
      .then(function (d) { ulozToken(d.token); $("#heslo").value = ""; nacitaj(); },
        function (ch) { ukazLogin(ch.status === 401 ? "Heslo nesedí. Skúste ho napísať znova." : ch.message); })
      .then(function () { tl.disabled = false; tl.textContent = "Prihlásiť sa"; });
  });
  $("#odhlasit").addEventListener("click", function () { if (confirm("Odhlásiť sa z tohto zariadenia?")) { zmazToken(); ukazLogin(""); } });

  /* ---------- načítanie ---------- */
  function nacitaj() {
    $("#login").hidden = true; $("#app").hidden = false;
    $("#obsah").innerHTML = '<div class="aa-nacitavam"><span class="aa-spinner"></span>Načítavam ponuku…</div>';
    var build = fetch("../auta.json", { cache: "no-store" }).then(function (r) { return r.json(); }).catch(function () { return []; });
    Promise.all([api("GET", "/overit/" + SITE), api("GET", "/auta/" + SITE + "?t=" + Date.now()), build]).then(function (v) {
      var doc = v[1], b = v[2] || [];
      buildIds = {}; b.forEach(function (a) { buildIds[a.id] = 1; });
      try {
        var lok = JSON.parse(localStorage.getItem(KL) || "null");
        if (lok && lok.auta && doc.upravene && lok.upravene > doc.upravene) doc = lok;
      } catch (e) {}
      if (doc.auta) { auta = doc.auta; upravene = doc.upravene; zBuildu = false; }
      else { auta = b; upravene = null; zBuildu = true; }
      zoznam();
    }).catch(function (ch) {
      if (ch.status === 401) { zmazToken(); ukazLogin("Prihlásenie vypršalo, prihláste sa znova."); return; }
      $("#obsah").innerHTML = '<div class="aa-prazdne"><p>' + esc(ch.message) + '</p><button class="aa-tl aa-tl--hlavne" type="button" id="znova">Skúsiť znova</button></div>';
      $("#znova").onclick = nacitaj;
    });
  }

  function uloz(nove, sprava, opt) {
    if (uklada) { toast("Chvíľu počkajte, ešte ukladám predchádzajúcu zmenu.", { chyba: true }); return Promise.reject(new Error("uklada")); }
    uklada = true;
    var stare = auta;
    var telo = { auta: nove }; if (upravene) telo.zaklad = upravene;
    return api("POST", "/auta/" + SITE, JSON.stringify(telo), { "Content-Type": "application/json" }).then(function (d) {
      auta = d.auta; upravene = d.upravene; zBuildu = false; uklada = false;
      try { localStorage.setItem(KL, JSON.stringify({ auta: d.auta, upravene: d.upravene })); } catch (e) {}
      toast(sprava || "Uložené", opt && opt.spat ? { spat: function () { uloz(stare, "Vrátené späť").then(zoznam, function () {}); } } : null);
      return d;
    }, function (ch) {
      uklada = false;
      if (ch.status === 401) { zmazToken(); ukazLogin("Prihlásenie vypršalo. Prihláste sa a zmenu urobte znova."); }
      else if (ch.status === 409) toast("Ponuku medzitým zmenil niekto na inom zariadení. Obnovte stránku a zmenu urobte znova.", { chyba: true });
      else toast(ch.message, { chyba: true });
      throw ch;
    });
  }

  /* ================================================================ PREHĽAD ================================================================ */
  var FILTRE = [
    ["vsetky", "Všetky", function () { return true; }],
    ["web", "Na webe", naWebe],
    ["skryte", "Skryté", function (a) { return a.skryte && !a.predane; }],
    ["predane", "Predané", function (a) { return a.predane; }],
    ["rucne", "Pridané ručne", rucne],
    ["portal", "Z Autobazar.eu", function (a) { return !rucne(a); }]
  ];
  function filtrFn() { for (var i = 0; i < FILTRE.length; i++) if (FILTRE[i][0] === filter) return FILTRE[i][2]; return FILTRE[0][2]; }

  function karta(a, i) {
    var f = (a.fotky || [])[0];
    var stav = a.predane ? '<span class="aa-stav aa-stav--predane">Predané</span>' : a.skryte ? '<span class="aa-stav aa-stav--skryte">Skryté</span>' : "";
    var info = [a.rok, a.km != null ? cislo(a.km) + NB + "km" : "", a.palivo].filter(Boolean).map(esc).join('<span class="aa-bodka">·</span>');
    if (radenie) {
      return '<li class="aa-auto aa-auto--radenie" data-i="' + i + '" data-id="' + esc(a.id) + '">' +
        '<button class="aa-tahat" type="button" aria-label="Potiahnite a presuňte">' + ik("tahat", 22) + "</button>" +
        '<span class="aa-auto__mini">' + (f ? '<img src="' + esc(foto(f)) + '" alt="" loading="lazy">' : "") + "</span>" +
        '<span class="aa-auto__nazov"><b>' + esc(meno(a)) + "</b><small>" + cena(a.cena) + "</small></span>" +
        '<span class="aa-radenie-tl"><button type="button" class="aa-ikona" data-top="' + i + '" aria-label="Na začiatok"' + (i ? "" : " disabled") + ">" + ik("top") + "</button>" +
        '<button type="button" class="aa-ikona" data-hore="' + i + '" aria-label="Vyššie"' + (i ? "" : " disabled") + ">" + ik("hore") + "</button>" +
        '<button type="button" class="aa-ikona" data-dole="' + i + '" aria-label="Nižšie"' + (i < auta.length - 1 ? "" : " disabled") + ">" + ik("dole") + "</button></span></li>";
    }
    var o = otvorene === a.id;
    return '<li class="aa-auto' + (naWebe(a) ? "" : " aa-auto--mimo") + '" data-i="' + i + '">' +
      '<button class="aa-auto__foto" type="button" data-uprav="' + i + '" aria-label="Upraviť ' + esc(meno(a)) + '">' +
      (f ? '<img src="' + esc(foto(f)) + '" alt=""' + (i > 3 ? ' loading="lazy"' : "") + ' width="320" height="240">' : '<span class="aa-bez-fotky">' + ik("fotak", 28) + "<span>Bez fotky</span></span>") + stav + "</button>" +
      '<div class="aa-auto__telo">' +
      '<button class="aa-auto__nazov" type="button" data-uprav="' + i + '"><b>' + esc(meno(a)) + "</b>" + (a.verzia ? "<small>" + esc(a.verzia) + "</small>" : "") + "</button>" +
      '<p class="aa-auto__info">' + (info || "&nbsp;") + "</p>" +
      '<div class="aa-auto__cena" data-cena-box="' + i + '"><button type="button" class="aa-cena" data-cena="' + i + '" title="Zmeniť cenu">' + cena(a.cena) + ik("upravit", 16) + "</button></div>" +
      '<div class="aa-auto__akcie">' +
      '<label class="aa-prepinac"><input type="checkbox" data-web="' + i + '"' + (naWebe(a) ? " checked" : "") + (a.predane ? " disabled" : "") + '><span class="aa-prepinac__draha"></span><span class="aa-prepinac__text">' + (a.predane ? "Predané" : naWebe(a) ? "Na webe" : "Skryté") + "</span></label>" +
      '<button class="aa-tl aa-tl--obrys" type="button" data-uprav="' + i + '">' + ik("upravit", 18) + "Upraviť</button>" +
      '<button class="aa-ikona aa-ikona--obrys" type="button" data-viac="' + esc(a.id) + '" aria-expanded="' + o + '" aria-label="Ďalšie možnosti">' + ik("viac") + "</button></div>" +
      (o ? '<div class="aa-auto__viac">' +
        '<button type="button" data-predane="' + i + '">' + ik("predane", 18) + (a.predane ? "Vrátiť do predaja" : "Predané") + "</button>" +
        '<button type="button" data-topovat="' + i + '"' + (i ? "" : " disabled") + ">" + ik("top", 18) + "Topovať (na začiatok)</button>" +
        '<button type="button" data-duplikovat="' + i + '">' + ik("kopia", 18) + "Duplikovať</button>" +
        '<a href="' + odkazWeb(a) + '" target="_blank" rel="noopener">' + ik("web", 18) + "Zobraziť na webe</a>" +
        '<button type="button" class="aa-cervene" data-zmaz="' + i + '">' + ik("zmazat", 18) + "Zmazať</button></div>" : "") +
      "</div></li>";
  }

  function zoznam() {
    var fn = filtrFn(), q = bez(hladat);
    var pocty = FILTRE.map(function (f) { return auta.filter(f[2]).length; });
    var riadky = auta.map(function (a, i) {
      if (radenie) return karta(a, i);
      if (!fn(a)) return "";
      if (q && bez(meno(a) + " " + (a.verzia || "") + " " + (a.rok || "") + " " + (a.vin || "")).indexOf(q) < 0) return "";
      return karta(a, i);
    }).join("");
    var koncept = citajKoncept();
    $("#obsah").innerHTML =
      '<div class="aa-hlava"><h1>' + (radenie ? "Poradie na webe" : "Ponuka áut") + "</h1>" +
      (radenie ? '<p class="aa-tichy">Potiahnite auto za úchyt alebo použite šípky. Poradie sa hneď uloží a takto budú autá aj na webe.</p>'
        : '<p class="aa-suhrn"><b>' + pocty[1] + "</b>&nbsp;na webe" + (pocty[2] ? ' <span class="aa-bodka">·</span> ' + pocty[2] + " skryté" : "") + (pocty[3] ? ' <span class="aa-bodka">·</span> ' + pocty[3] + " predané" : "") +
          (upravene ? '<span class="aa-tichy aa-suhrn__cas">Uložené ' + kedy(upravene) + "</span>" : "") + "</p>") + "</div>" +
      (zBuildu && !radenie ? '<p class="aa-info">Toto sú autá z Vášho súčasného webu. Prvou zmenou ich prevezmete a odvtedy ponuku spravujete len tu.</p>' : "") +
      (koncept && !radenie ? '<div class="aa-info aa-info--koncept"><span>Máte rozpísané auto <b>' + esc(meno(koncept.a)) + '</b>.</span><span class="aa-info__tl"><button class="aa-tl aa-tl--hlavne aa-tl--maly" type="button" id="koncept-pokracuj">Pokračovať</button><button class="aa-tl aa-tl--jemne aa-tl--maly" type="button" id="koncept-zahod">Zahodiť</button></span></div>' : "") +
      (radenie ? "" : '<div class="aa-nastroje"><label class="aa-hladat">' + ik("hladat", 20) + '<input type="search" id="hladat" placeholder="Hľadať značku, model, rok" value="' + esc(hladat) + '" aria-label="Hľadať auto"></label>' +
        '<button class="aa-tl aa-tl--obrys aa-tl--radit" type="button" id="radit">' + ik("radit", 18) + "Zoradiť</button></div>" +
        '<div class="aa-filtre" role="tablist" aria-label="Zobraziť">' + FILTRE.map(function (f, k) {
          return '<button type="button" role="tab" data-filter="' + f[0] + '" aria-selected="' + (filter === f[0]) + '">' + f[1] + "<span>" + pocty[k] + "</span></button>";
        }).join("") + "</div>") +
      '<ul class="aa-zoznam' + (radenie ? " aa-zoznam--radenie" : "") + '" id="zoznam">' + (riadky || '<li class="aa-prazdne"><p>' + (q ? "Takéto auto sme nenašli." : "Tu zatiaľ nie je žiadne auto.") + "</p></li>") + "</ul>" +
      '<div class="aa-spodok">' + (radenie ? '<button class="aa-tl aa-tl--hlavne aa-tl--velke" type="button" id="radit-hotovo">' + ik("check") + "Hotovo</button>"
        : '<button class="aa-tl aa-tl--hlavne aa-tl--velke" type="button" id="pridaj">' + ik("plus", 22) + "Pridať auto</button>") + "</div>";
    viazZoznam();
  }
  function kedy(s) {
    var d = new Date(s); if (isNaN(d)) return "";
    var dnes = new Date(), den = d.toDateString() === dnes.toDateString() ? "dnes" : d.toLocaleDateString("sk-SK");
    return den + " o " + d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
  }

  function zmenAuto(i, fn, sprava, spat) {
    var nove = auta.slice(), a = kopia(nove[i]); fn(a); nove[i] = a;
    return uloz(nove, sprava, { spat: spat }).then(zoznam, zoznam);
  }
  function presun(z, na, sprava) {
    var nove = auta.slice(), x = nove.splice(z, 1)[0]; nove.splice(na, 0, x);
    auta = nove; zoznam();
    return uloz(nove, sprava || "Poradie uložené").then(zoznam, function () { nacitaj(); });
  }

  function viazZoznam() {
    var on = function (attr, fn) { $$("[" + attr + "]").forEach(function (el) { el.addEventListener(el.type === "checkbox" ? "change" : "click", function (ev) { fn(+el.getAttribute(attr), el, ev); }); }); };
    if ($("#pridaj")) $("#pridaj").onclick = function () { formular(null); };
    if ($("#radit")) $("#radit").onclick = function () { radenie = true; otvorene = null; zoznam(); window.scrollTo(0, 0); };
    if ($("#radit-hotovo")) $("#radit-hotovo").onclick = function () { radenie = false; zoznam(); };
    if ($("#hladat")) $("#hladat").oninput = function (ev) {
      hladat = ev.target.value; var p = ev.target.selectionStart; zoznam();
      var h = $("#hladat"); h.focus(); try { h.setSelectionRange(p, p); } catch (e) {}
    };
    if ($("#koncept-pokracuj")) $("#koncept-pokracuj").onclick = function () { var k = citajKoncept(); formular(k.i, k.a); };
    if ($("#koncept-zahod")) $("#koncept-zahod").onclick = function () { zmazKoncept(); zoznam(); };
    $$("[data-filter]").forEach(function (b) { b.onclick = function () { filter = b.getAttribute("data-filter"); zoznam(); }; });
    on("data-uprav", function (i) { formular(i); });
    $$("[data-viac]").forEach(function (b) { b.onclick = function () { var id = b.getAttribute("data-viac"); otvorene = otvorene === id ? null : id; zoznam(); }; });
    on("data-web", function (i, el) {
      var skry = !el.checked;
      zmenAuto(i, function (a) { if (skry) a.skryte = true; else delete a.skryte; },
        skry ? "Auto je skryté, na webe ho nikto neuvidí" : "Auto je znova na webe", skry);
    });
    on("data-predane", function (i) {
      var bolo = auta[i].predane; otvorene = null;
      zmenAuto(i, function (a) { if (bolo) delete a.predane; else { a.predane = true; } },
        bolo ? "Auto je znova v predaji" : "Označené ako predané, z webu zmizlo", !bolo);
    });
    on("data-topovat", function (i) { otvorene = null; presun(i, 0, "Auto je na začiatku ponuky"); });
    on("data-duplikovat", function (i) {
      otvorene = null;
      var a = kopia(auta[i]); a.id = noveId(); delete a.predane; a.skryte = true; a.model = (a.model || "") + "";
      formular(null, a, "Kópia auta: upravte, čo sa líši. Kópia je zatiaľ skrytá, kým ju nezobrazíte.");
    });
    on("data-zmaz", function (i) {
      if (!confirm("Zmazať " + meno(auta[i]) + "?\n\nAuto zmizne z webu aj zo správy áut. Ak ho len predávate, radšej použite Predané.")) return;
      var nove = auta.slice(); nove.splice(i, 1); otvorene = null;
      uloz(nove, "Auto je zmazané", { spat: true }).then(zoznam, zoznam);
    });
    on("data-cena", function (i) {
      var box = $('[data-cena-box="' + i + '"]');
      box.innerHTML = '<form class="aa-cena-form"><label class="aa-cena-pole"><input type="text" inputmode="numeric" value="' + esc(auta[i].cena || "") + '" aria-label="Nová cena v eurách" placeholder="Cena"><span>€</span></label>' +
        '<button class="aa-tl aa-tl--hlavne aa-tl--maly" type="submit">Uložiť</button><button class="aa-ikona" type="button" aria-label="Zrušiť">' + ik("x") + "</button></form>";
      var inp = $("input", box); inp.focus(); inp.select();
      $("button[type=button]", box).onclick = zoznam;
      $("form", box).onsubmit = function (ev) {
        ev.preventDefault();
        var t = inp.value.replace(/[\s €.]/g, "").replace(",", ".");
        var n = t ? Math.round(Number(t)) : null;
        if (t && (!isFinite(n) || n < 0)) { toast("Cenu napíšte len číslom, napríklad 12 990.", { chyba: true }); return; }
        var stara = auta[i].cena;
        zmenAuto(i, function (a) { if (n) a.cena = n; else delete a.cena; }, "Cena zmenená na " + cena(n) + (stara ? " (predtým " + cena(stara) + ")" : ""), true);
      };
    });
    on("data-top", function (i) { presun(i, 0); });
    on("data-hore", function (i) { presun(i, i - 1); });
    on("data-dole", function (i) { presun(i, i + 1); });
    if (radenie) tahanie($("#zoznam"), ".aa-auto", ".aa-tahat", function (z, na) { presun(z, na); });
  }

  /* ---------- presúvanie ťahaním (prst aj myš) ---------- */
  function tahanie(zoz, polozka, uchyt, hotovo) {
    if (!zoz) return;
    zoz.addEventListener("pointerdown", function (ev) {
      var u = ev.target.closest(uchyt); if (!u) return;
      var el = u.closest(polozka); if (!el) return;
      ev.preventDefault();
      var start = [].indexOf.call(zoz.children, el);
      el.classList.add("aa-tahany");
      try { u.setPointerCapture(ev.pointerId); } catch (e) {}
      function pohyb(e) {
        var pod = document.elementFromPoint(e.clientX, e.clientY);
        var ciel = pod && pod.closest(polozka);
        if (ciel && ciel !== el && ciel.parentNode === zoz) {
          var r = ciel.getBoundingClientRect();
          var za = zoz.classList.contains("aa-fotky") ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
          zoz.insertBefore(el, za ? ciel.nextSibling : ciel);
        }
        if (e.clientY < 80) window.scrollBy(0, -12); else if (e.clientY > innerHeight - 100) window.scrollBy(0, 12);
      }
      function koniec() {
        u.removeEventListener("pointermove", pohyb); u.removeEventListener("pointerup", koniec); u.removeEventListener("pointercancel", koniec);
        el.classList.remove("aa-tahany");
        var na = [].indexOf.call(zoz.children, el);
        if (na !== start) hotovo(start, na);
      }
      u.addEventListener("pointermove", pohyb); u.addEventListener("pointerup", koniec); u.addEventListener("pointercancel", koniec);
    });
  }

  /* ================================================================ KONCEPT ================================================================ */
  function citajKoncept() { try { var k = JSON.parse(localStorage.getItem(KK) || "null"); return k && k.a ? k : null; } catch (e) { return null; } }
  function ulozKoncept(i, a) { try { localStorage.setItem(KK, JSON.stringify({ i: i, a: a, cas: Date.now() })); } catch (e) {} }
  function zmazKoncept() { try { localStorage.removeItem(KK); } catch (e) {} }

  /* ================================================================ FORMULÁR ================================================================ */
  function segment(meno, moz, hod) {
    var m = moz.slice(); if (hod && m.indexOf(hod) < 0) m.push(hod);
    return '<div class="aa-segment" role="radiogroup">' + m.map(function (x) {
      return '<label><input type="radio" name="' + meno + '" value="' + esc(x) + '"' + (x === hod ? " checked" : "") + "><span>" + esc(x) + "</span></label>";
    }).join("") + "</div>";
  }
  function pole(meno, stitok, hod, extra, pozn) {
    return '<label class="aa-pole"><span>' + stitok + (pozn ? ' <em>' + pozn + "</em>" : "") + '</span><input name="' + meno + '" value="' + esc(hod == null ? "" : hod) + '"' + (extra || "") + "></label>";
  }

  function formular(i, predvyplnene, sprava) {
    var a = predvyplnene ? kopia(predvyplnene) : i === null ? { id: noveId(), fotky: [] } : kopia(auta[i]);
    var fotky = (a.fotky || []).slice(), zmenene = !!predvyplnene, nahrava = 0;
    var vyb = (a.vybava || []).slice(), vlastna = vyb.filter(function (x) { return VYBAVA.indexOf(x) < 0; });
    var znacky = Object.keys(ZNACKY);
    auta.forEach(function (x) { if (x.znacka && znacky.indexOf(x.znacka) < 0) znacky.push(x.znacka); });
    znacky.sort(function (x, y) { return x.localeCompare(y, "sk"); });
    var roky = []; for (var r = new Date().getFullYear() + 1; r >= 1990; r--) roky.push(r);
    var prev = rozlozPrevodovku(a.prevodovka);
    window.scrollTo(0, 0);
    $("#obsah").innerHTML =
      '<div class="aa-hlava aa-hlava--form"><button class="aa-spat-tl" type="button" id="spat">' + ik("spat") + "Ponuka</button>" +
      "<h1>" + (i === null ? (predvyplnene && !sprava ? "Rozpísané auto" : "Nové auto") : esc(meno(a))) + "</h1>" +
      (sprava ? '<p class="aa-info">' + esc(sprava) + "</p>" : "") + "</div>" +
      '<form class="aa-form" id="form" novalidate><div class="aa-form__hlavny">' +
      '<section class="aa-sekcia"><h2>Fotky</h2><p class="aa-tichy">Prvá fotka je hlavná. Poradie zmeníte potiahnutím.</p>' +
      '<ul class="aa-fotky" id="fotky"></ul>' +
      '<div class="aa-foto-tl"><label class="aa-tl aa-tl--hlavne"><input type="file" id="fotak" accept="image/*" capture="environment" hidden>' + ik("fotak") + "Odfotiť</label>" +
      '<label class="aa-tl aa-tl--obrys"><input type="file" id="galeria" accept="image/*" multiple hidden>' + ik("galeria") + "Vybrať z galérie</label></div>" +
      '<p class="aa-tichy aa-foto-stav" id="foto-stav" aria-live="polite"></p></section>' +

      '<section class="aa-sekcia"><h2>Základné údaje</h2><div class="aa-mriezka">' +
      pole("znacka", "Značka", a.znacka, ' list="zoz-znacky" required maxlength="60" autocomplete="off" placeholder="Začnite písať, napr. Škoda"') +
      pole("model", "Model", a.model, ' list="zoz-modely" required maxlength="80" autocomplete="off" placeholder="napr. Octavia Combi"') +
      pole("cena", "Cena v €", a.cena, ' inputmode="numeric" autocomplete="off" placeholder="napr. 12 990"', "prázdne = na vyžiadanie") +
      '<label class="aa-pole"><span>Rok výroby</span><select name="rok"><option value="">Vyberte</option>' + roky.map(function (x) { return "<option" + (x === +a.rok ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select></label>" +
      '<label class="aa-pole"><span>Mesiac výroby <em>nepovinné</em></span><select name="mesiac"><option value="">Vyberte</option>' + MESIACE.map(function (x, k) { return '<option value="' + (k + 1) + '"' + (k + 1 === +a.mesiac ? " selected" : "") + ">" + (k + 1) + " · " + x + "</option>"; }).join("") + "</select></label>" +
      pole("km", "Najazdené km", a.km, ' inputmode="numeric" autocomplete="off" placeholder="napr. 145 000"') +
      pole("verzia", "Motor a verzia", a.verzia, ' maxlength="160" placeholder="napr. 2.0 TDI Style DSG"', "nepovinné") +
      '</div><label class="aa-check"><input type="checkbox" name="odpocet_dph"' + (a.odpocet_dph ? " checked" : "") + '><span><b>Možný odpočet DPH</b><small>Pri cene na webe sa zobrazí „Možný odpočet DPH“.</small></span></label><datalist id="zoz-znacky">' + znacky.map(function (z) { return '<option value="' + esc(z) + '">'; }).join("") + '</datalist><datalist id="zoz-modely"></datalist>' +
      '<div class="aa-pole"><span>Palivo</span>' + segment("palivo", PALIVA, a.palivo) + "</div>" +
      '<div class="aa-pole"><span>Prevodovka</span>' + segment("prevodovka", PREVODOVKY, prev.typ) + "</div>" +
      '<label class="aa-pole"><span>Počet stupňov prevodovky <em>nepovinné</em></span><select name="stupne"><option value="">Vyberte</option>' + STUPNE.map(function (x) { return '<option value="' + x + '"' + (x === prev.stupne ? " selected" : "") + ">" + (x === "bezstupňová" ? "Bezstupňová (CVT)" : x + "-stupňová") + "</option>"; }).join("") + "</select></label></section>" +

      '<details class="aa-sekcia aa-rozbal"' + (a.vykon_kw || a.karoseria || a.vin ? " open" : "") + "><summary><h2>Ďalšie technické údaje</h2><span class=\"aa-tichy\">nepovinné</span></summary><div class=\"aa-mriezka\">" +
      pole("vykon_kw", "Výkon v kW", a.vykon_kw, ' inputmode="numeric" placeholder="napr. 110"') +
      pole("objem", "Objem motora v cm³", a.objem, ' inputmode="numeric" placeholder="napr. 1968"') +
      pole("vin", "VIN", a.vin, ' maxlength="30" autocapitalize="characters" placeholder="17 znakov z technického preukazu"') + "</div>" +
      '<div class="aa-pole"><span>Karoséria</span>' + segment("karoseria", KAROSERIE, a.karoseria) + "</div>" +
      '<div class="aa-pole"><span>Pohon</span>' + segment("pohon", POHONY, a.pohon) + "</div></details>" +

      '<section class="aa-sekcia"><h2>Výbava <span class="aa-pocitadlo" id="vyb-pocet"></span></h2><div class="aa-cipy">' +
      VYBAVA.map(function (x) { return '<label class="aa-cip"><input type="checkbox" name="vyb" value="' + esc(x) + '"' + (vyb.indexOf(x) > -1 ? " checked" : "") + "><span>" + esc(x) + "</span></label>"; }).join("") + "</div>" +
      '<label class="aa-pole"><span>Ďalšia výbava <em>každú položku na nový riadok</em></span><textarea name="vybava_vlastna" rows="4" placeholder="napr. Harman Kardon&#10;Druhá sada kolies">' + esc(vlastna.join("\n")) + "</textarea></label></section>" +

      '<section class="aa-sekcia"><h2>Popis</h2><label class="aa-pole"><span class="aa-skryte-oko">Popis</span><textarea name="popis" rows="6" maxlength="8000" placeholder="Stav auta, servisná história, počet majiteľov, čo je nové…">' + esc(a.popis || "") + "</textarea></label>" +
      '<label class="aa-check"><input type="checkbox" name="skryte"' + (a.skryte ? " checked" : "") + "><span><b>Zatiaľ nezobrazovať na webe</b><small>Napríklad keď auto ešte pripravujete.</small></span></label></section>" +
      '<p class="aa-chyba aa-chyba--blok" id="form-chyba" role="alert" hidden></p></div>' +

      '<aside class="aa-nahlad"><h2>Takto bude auto na webe</h2><div id="nahlad"></div><p class="aa-tichy aa-koncept-stav" id="koncept-stav"></p></aside>' +
      '<div class="aa-spodok aa-spodok--form"><button class="aa-tl aa-tl--obrys aa-tl--velke" type="button" id="zrus">Zrušiť</button>' +
      '<button class="aa-tl aa-tl--hlavne aa-tl--velke" type="submit" id="ulozit">' + ik("check") + "Uložiť auto</button></div></form>";

    var form = $("#form");
    function modely() {
      var z = form.elements.znacka.value.trim(), k = Object.keys(ZNACKY).filter(function (x) { return bez(x) === bez(z); })[0];
      var m = (ZNACKY[k] || []).slice();
      auta.forEach(function (x) { if (bez(x.znacka) === bez(z) && x.model && m.indexOf(x.model) < 0) m.push(x.model); });
      $("#zoz-modely").innerHTML = m.map(function (x) { return '<option value="' + esc(x) + '">'; }).join("");
      if (k && k !== z) form.elements.znacka.value = k;
    }
    modely();
    form.elements.znacka.addEventListener("change", modely);

    function hodnota(n) { var e = form.elements[n]; if (!e) return ""; if (e.length !== undefined && !e.tagName) { var c = [].filter.call(e, function (x) { return x.checked; })[0]; return c ? c.value : ""; } return String(e.value || "").trim(); }
    function cisloZ(n) { var t = hodnota(n).replace(/[\s €.]/g, "").replace(",", "."); return t ? Number(t) : null; }
    function zbierajVybavu() {
      var v = $$("input[name=vyb]:checked", form).map(function (x) { return x.value; });
      hodnota("vybava_vlastna").split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x) { if (v.indexOf(x) < 0) v.push(x); });
      return v;
    }
    function zbieraj() {
      var n = { id: a.id, znacka: hodnota("znacka"), model: hodnota("model"), verzia: hodnota("verzia"), palivo: hodnota("palivo"),
        prevodovka: zlozPrevodovku(hodnota("prevodovka"), hodnota("stupne")), karoseria: hodnota("karoseria"), pohon: hodnota("pohon"), vin: hodnota("vin").toUpperCase(),
        popis: hodnota("popis"), cena: cisloZ("cena"), rok: cisloZ("rok"), mesiac: cisloZ("mesiac"), km: cisloZ("km"), vykon_kw: cisloZ("vykon_kw"), objem: cisloZ("objem"),
        vybava: zbierajVybavu(), fotky: fotky.slice() };
      ["povodna_cena", "leasing", "uver", "farba", "mesto", "predane"].forEach(function (k) { if (a[k] != null && a[k] !== "") n[k] = a[k]; });
      if (form.elements.skryte.checked) n.skryte = true;
      if (form.elements.odpocet_dph && form.elements.odpocet_dph.checked) n.odpocet_dph = true;
      Object.keys(n).forEach(function (k) { if (n[k] === null || n[k] === "" || (Array.isArray(n[k]) && !n[k].length)) delete n[k]; });
      if (n.mesiac && !n.rok) delete n.mesiac;
      return n;
    }
    function nahlad() {
      if (!$("#nahlad")) return;
      var n = zbieraj(), f = fotky[0];
      var spec = [n.rok, n.km != null ? cislo(n.km) + NB + "km" : "", n.palivo, n.prevodovka ? (/automat/i.test(n.prevodovka) ? "Automat" : "Manuál") : ""].filter(Boolean);
      $("#nahlad").innerHTML = '<div class="aa-nk">' + '<div class="aa-nk__foto">' + (f ? '<img src="' + esc(foto(f)) + '" alt="">' : '<span class="aa-bez-fotky">' + ik("fotak", 28) + "<span>Fotky doplníme</span></span>") + "</div>" +
        '<div class="aa-nk__telo"><b>' + esc(meno(n)) + "</b><small>" + (esc(n.verzia) || "&nbsp;") + "</small>" +
        '<ul>' + spec.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
        '<p class="aa-nk__cena">' + cena(n.cena) + "</p></div></div>" +
        (n.skryte ? '<p class="aa-tichy">Auto je nastavené ako skryté, na webe sa zatiaľ neukáže.</p>' : "");
      var vp = $("#vyb-pocet"); if (vp) vp.textContent = n.vybava ? n.vybava.length : "";
    }
    var koncTimer;
    function zmena() {
      zmenene = true; nahlad();
      clearTimeout(koncTimer);
      koncTimer = setTimeout(function () {
        var n = zbieraj(); if (!n.znacka && !n.model && !fotky.length) return;
        if (!document.body.contains(form)) return;   // formulár už je zavretý (uložené alebo Zrušiť)
        ulozKoncept(i, n); $("#koncept-stav").textContent = "Rozpísané auto sa priebežne ukladá v tomto telefóne.";
      }, 600);
    }
    form.addEventListener("input", zmena);
    form.addEventListener("change", zmena);
    function spat() {
      if (zmenene && !confirm("Odísť bez uloženia? Rozpísané auto Vám ostane ako koncept v zozname.")) return;
      clearTimeout(koncTimer);
      if (zmenene) { var n = zbieraj(); if (n.znacka || n.model || fotky.length) ulozKoncept(i, n); }
      zoznam();
    }
    $("#spat").onclick = spat; $("#zrus").onclick = spat;

    function kresliFotky() {
      if (!$("#fotky")) return;
      $("#fotky").innerHTML = fotky.map(function (f, k) {
        return '<li class="aa-foto" data-k="' + k + '"><img src="' + esc(foto(f)) + '" alt="Fotka ' + (k + 1) + '" draggable="false">' +
          (k === 0 ? '<span class="aa-foto__hlavna">' + ik("hviezda", 14) + "Hlavná</span>" : "") +
          '<button type="button" class="aa-foto__tahat" aria-label="Potiahnite a presuňte fotku">' + ik("tahat", 18) + "</button>" +
          '<span class="aa-foto__tl">' + (k > 0 ? '<button type="button" data-hlavna="' + k + '">' + ik("hviezda", 16) + "Hlavná</button>" : "") +
          '<button type="button" data-prec="' + k + '" aria-label="Odstrániť fotku">' + ik("x", 16) + "</button></span></li>";
      }).join("") || '<li class="aa-fotky__prazdne">' + ik("fotak", 32) + "<span>Zatiaľ bez fotiek. Auto odfoťte priamo tu.</span></li>";
      $$("[data-hlavna]").forEach(function (b) { b.onclick = function () { fotky.unshift(fotky.splice(+b.getAttribute("data-hlavna"), 1)[0]); kresliFotky(); zmena(); }; });
      $$("[data-prec]").forEach(function (b) { b.onclick = function () { fotky.splice(+b.getAttribute("data-prec"), 1); kresliFotky(); zmena(); }; });
      nahlad();
    }
    tahanie($("#fotky"), ".aa-foto", ".aa-foto__tahat", function (z, na) { var x = fotky.splice(z, 1)[0]; fotky.splice(na, 0, x); kresliFotky(); zmena(); });
    kresliFotky();

    function zmensi(f) {
      return new Promise(function (ok, zle) {
        var url = URL.createObjectURL(f), img = new Image();
        img.onload = function () {
          var k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          c.toBlob(function (b) { b ? ok(b) : zle(new Error("Fotku sa nepodarilo spracovať.")); }, "image/jpeg", 0.82);
        };
        img.onerror = function () { URL.revokeObjectURL(url); zle(new Error("Túto fotku sa nepodarilo otvoriť. Skúste inú.")); };
        img.src = url;
      });
    }
    function nahraj(ev) {
      var subory = [].slice.call(ev.target.files || []); ev.target.value = "";
      if (!subory.length) return;
      if (fotky.length + subory.length > 40) { toast("Jedno auto môže mať najviac 40 fotiek.", { chyba: true }); return; }
      var st = $("#foto-stav"), hotovo = 0;
      nahrava++; $("#ulozit").disabled = true;
      st = $("#foto-stav");
      subory.reduce(function (p, f) {
        return p.then(function () {
          st.innerHTML = '<span class="aa-spinner"></span>Nahrávam fotku ' + (hotovo + 1) + " z " + subory.length + "…";
          return zmensi(f).then(function (b) { return api("POST", "/foto/" + SITE, b, { "Content-Type": "image/jpeg" }); })
            .then(function (d) { fotky.push(d.url); hotovo++; kresliFotky(); zmena(); },
              function (ch) { if (ch.status === 401) throw ch; toast("Fotka " + f.name + " sa nenahrala: " + ch.message, { chyba: true }); });
        });
      }, Promise.resolve()).then(function () {
        st.textContent = hotovo ? (hotovo === 1 ? "Fotka je pridaná." : "Pridané fotky: " + hotovo + ".") + " Auto nezabudnite uložiť." : "";
      }, function () { st.textContent = ""; zmazToken(); ukazLogin("Prihlásenie vypršalo, prihláste sa znova."); })
        .then(function () { nahrava--; if ($("#ulozit")) $("#ulozit").disabled = nahrava > 0; });
    }
    $("#fotak").addEventListener("change", nahraj);
    $("#galeria").addEventListener("change", nahraj);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var ch = $("#form-chyba"); ch.hidden = true;
      $$(".aa-pole--chyba", form).forEach(function (x) { x.classList.remove("aa-pole--chyba"); });
      var n = zbieraj(), zle = [];
      if (!n.znacka) zle.push(["znacka", "Napíšte značku auta."]);
      if (!n.model) zle.push(["model", "Napíšte model auta."]);
      [["cena", "Cenu napíšte len číslom, napríklad 12 990."], ["km", "Kilometre napíšte len číslom, napríklad 145 000."],
        ["vykon_kw", "Výkon napíšte len číslom v kW."], ["objem", "Objem motora napíšte len číslom."]].forEach(function (x) {
        if (n[x[0]] !== undefined && (!isFinite(n[x[0]]) || n[x[0]] < 0)) zle.push(x);
      });
      if (zle.length) {
        zle.forEach(function (x) { var e = form.elements[x[0]]; if (e && e.closest) e.closest(".aa-pole").classList.add("aa-pole--chyba"); });
        ch.textContent = zle.map(function (x) { return x[1]; }).join(" ");
        ch.hidden = false;
        var p = form.elements[zle[0][0]]; if (p && p.focus) { p.focus(); p.scrollIntoView({ block: "center" }); }
        return;
      }
      ["cena", "km", "vykon_kw", "objem"].forEach(function (k) { if (n[k] != null) n[k] = Math.round(n[k]); });
      var nove = auta.slice();
      if (i === null) nove.unshift(n); else nove[i] = n;
      var tl = $("#ulozit"); tl.disabled = true; tl.innerHTML = '<span class="aa-spinner"></span>Ukladám…';
      clearTimeout(koncTimer);
      uloz(nove, i === null ? (n.skryte ? "Auto je uložené (zatiaľ skryté)" : "Auto je pridané na web") : "Zmeny sú uložené").then(function () {
        zmazKoncept(); filter = "vsetky"; zoznam();
      }, function () { tl.disabled = false; tl.innerHTML = ik("check") + "Uložiť auto"; });
    });
  }

  window.addEventListener("beforeunload", function (e) { if (uklada) { e.preventDefault(); e.returnValue = ""; } });
  token = citajToken();
  if (token) nacitaj(); else ukazLogin("");
})();
