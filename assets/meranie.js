/* Meranie GA4 + cookie lišta (autobazar/site/meranie.py, 16. 11. 2026).
   Consent Mode v2: default všetko denied (inline v <head>). gtag.js sa načíta AŽ po „Prijať“.
   Voľba v localStorage "ab_cookies" = "prijate" | "odmietnute". Udalosti len so súhlasom:
   click_telefon {umiestnenie}, odoslany_formular {formular}. Telefón ani obsah formulára sa neposiela. */
(function () {
  "use strict";
  var ja = document.currentScript || document.querySelector("script[data-ga4]");
  var ID = ja && ja.getAttribute("data-ga4");
  if (!ID) return;
  var POZ = ja.getAttribute("data-pozadie") || "#0E1A2B";
  var ZV = ja.getAttribute("data-zvyraznenie") || "#FFD300";
  var KLUC = "ab_cookies";
  var nacitane = false;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") window.gtag = function () { window.dataLayer.push(arguments); };

  function citaj() { try { return localStorage.getItem(KLUC); } catch (e) { return null; } }
  function zapis(v) { try { localStorage.setItem(KLUC, v); } catch (e) {} }

  function nacitaj() {
    if (nacitane) return;
    nacitane = true;
    gtag("consent", "update", { analytics_storage: "granted" });   // reklamné ostávajú denied
    gtag("js", new Date());
    gtag("config", ID);
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ID);
    document.head.appendChild(s);
  }

  function zmazGa() {
    var h = location.hostname.split("."), dom = [""];
    for (var i = 0; i < h.length - 1; i++) dom.push("." + h.slice(i).join("."));
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (n === "_ga" || n.indexOf("_ga_") === 0 || n === "_gid" || n === "_gat") {
        dom.forEach(function (d) {
          document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "");
        });
      }
    });
  }

  /* ---------- lišta ---------- */
  var css = ".ab-ck{position:fixed;left:16px;right:16px;bottom:16px;z-index:200;margin:0 auto;max-width:960px;" +
    "background:" + POZ + ";color:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.28);" +
    "padding:20px 24px;display:flex;align-items:center;gap:24px;font-size:15px;line-height:1.5}" +
    ".ab-ck[hidden]{display:none}" +
    ".ab-ck p{margin:0;flex:1;color:rgba(255,255,255,.88)}.ab-ck p b{color:#fff;display:block;margin-bottom:4px;font-size:16px}" +
    ".ab-ck a{color:" + ZV + ";text-decoration:underline;text-underline-offset:2px}" +
    ".ab-ck-tl{display:flex;gap:12px;flex-shrink:0}" +
    ".ab-ck button{min-width:128px;height:48px;padding:0 20px;border-radius:8px;border:2px solid " + ZV + ";" +
    "background:" + ZV + ";color:" + POZ + ";font-family:inherit;font-size:15px;font-weight:700;line-height:1;cursor:pointer}" +
    ".ab-ck button:hover{filter:brightness(1.08)}.ab-ck button:focus-visible{outline:3px solid #fff;outline-offset:2px}" +
    "@media (max-width:720px){.ab-ck{left:8px;right:8px;bottom:8px;padding:16px;flex-direction:column;align-items:stretch;gap:12px;font-size:14px}" +
    ".ab-ck-tl button{flex:1;min-width:0}}" +
    ".ab-ck-nast{background:none;border:0;padding:0;color:inherit;font:inherit;text-decoration:underline;" +
    "text-underline-offset:2px;cursor:pointer;opacity:.85}.ab-ck-nast:hover{opacity:1}";
  var lista = null;

  function odsadenie() {   // nad plávajúcou spodnou lištou (Zavolať / Mám záujem, lišta auta), nie cez ňu
    if (!lista || lista.hidden) return;
    var dole = 0;
    document.querySelectorAll(".pt-spodok, .det-lista").forEach(function (el) {
      var cs = getComputedStyle(el);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") return;
      var r = el.getBoundingClientRect();
      if (r.height && r.bottom >= window.innerHeight - 2) dole = Math.max(dole, r.height);
    });
    lista.style.bottom = dole ? (dole + 8) + "px" : "";
  }

  function ukaz() {
    if (!lista) {
      var st = document.createElement("style");
      st.textContent = css;
      document.head.appendChild(st);
      lista = document.createElement("div");
      lista.className = "ab-ck";
      lista.setAttribute("role", "region");
      lista.setAttribute("aria-label", "Súhlas s cookies");
      lista.innerHTML = '<p><b>Cookies na tomto webe</b>Analytické cookies (Google Analytics) nám pomáhajú zistiť, ako návštevníci web používajú. ' +
        'Načítajú sa iba s vaším súhlasom, reklamné cookies nepoužívame. Voľbu môžete kedykoľvek zmeniť v pätičke cez „Nastavenia cookies“. ' +
        '<a href="https://policies.google.com/technologies/partner-sites?hl=sk" target="_blank" rel="noopener">Ako Google používa údaje</a></p>' +
        '<div class="ab-ck-tl"><button type="button" data-ck="odmietnute">Odmietnuť</button><button type="button" data-ck="prijate">Prijať</button></div>';
      lista.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-ck]");
        if (!b) return;
        var v = b.getAttribute("data-ck");
        zapis(v);
        lista.hidden = true;
        if (v === "prijate") nacitaj();
        else {
          gtag("consent", "update", { analytics_storage: "denied" });
          zmazGa();
          if (nacitane) location.reload();   // gtag.js už beží -> čistý stav bez merania
        }
      });
      document.body.appendChild(lista);
      window.addEventListener("resize", odsadenie);
    }
    lista.hidden = false;
    odsadenie();
    setTimeout(odsadenie, 400);
  }

  function nastavenia() {   // odkaz v pätičke
    var pata = document.querySelector("footer .paticka-spod") || document.querySelector("footer");
    if (!pata || pata.querySelector(".ab-ck-nast")) return;
    var p = document.createElement("p"), b = document.createElement("button");
    b.type = "button"; b.className = "ab-ck-nast"; b.textContent = "Nastavenia cookies";
    b.addEventListener("click", ukaz);
    p.appendChild(b); pata.appendChild(p);
  }

  /* ---------- udalosti ---------- */
  function umiestnenie(a) {
    if (a.closest(".pt-spodok")) return "mobilna_lista";
    if (a.closest(".det-lista")) return "lista_auta";
    if (a.closest("#menu, .menu")) return "menu";
    if (a.closest("header")) return "hlavicka";
    if (a.closest("footer")) return "paticka";
    var s = a.closest("section[id], [id]");
    return "obsah" + (s && s.id ? "_" + s.id : "");
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (!a || !nacitane) return;
    var cesta = location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0] || "uvod";
    gtag("event", "click_telefon", { umiestnenie: umiestnenie(a), stranka: cesta });
  }, true);
  document.addEventListener("submit", function (e) {   // bubble: najprv bežia handlery formulára (preventDefault)
    var f = e.target;
    if (!nacitane || e.defaultPrevented || !f || !f.getAttribute) return;
    var akcia = f.getAttribute("action") || "";
    if (f.hasAttribute("data-navrh") || (akcia.indexOf("mailto:") !== 0 && !f.hasAttribute("data-meranie"))) return;
    var druh = /vykup|V%C3%BDkup|Výkup/i.test(akcia + " " + f.className) ? "vykup" : "kontakt";
    gtag("event", "odoslany_formular", { formular: druh });
  });

  /* ---------- štart ---------- */
  function start() {
    nastavenia();
    var v = citaj();
    if (v === "prijate") nacitaj();
    else if (v !== "odmietnute") ukaz();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
