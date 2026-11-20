/* Spoločné správanie všetkých šablón autobazáru (bez knižníc, bez cookies).
   Šablóna len označí prvky dátovými atribútmi:
   - galéria:     [data-galeria] obsahuje a[data-foto] (href = veľká fotka) -> lightbox so šípkami a ESC
   - ponuka:      form[data-filter] (select/input name=znacka|palivo|prevodovka|karoseria|cena_do|rok_od|km_do|q),
                  select[data-zoradit] (cena-asc|cena-desc|rok-desc|km-asc), položky [data-auto] s data-znacka,
                  data-palivo, data-prevodovka, data-karoseria, data-cena, data-rok, data-km, data-nazov;
                  [data-pocet] ukáže počet; [data-prazdne] sa ukáže, keď nič nesedí. Parametre z URL sa predvyplnia
                  (vyhľadávanie na úvode posiela GET na ponuka/).
   - kalkulačka:  [data-kalkulacka] s input name=cena|akontacia(%)|mesiace|urok(%) a [data-splatka], [data-uver]
   - prepínač:    [data-prepinac] s tlačidlami [data-ciel="id"] -> zobrazí #id, ostatné skryje (záložky)
*/
(function () {
  "use strict";
  var NBSP = " ";
  function fmt(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP); }

  /* ---------- lightbox ---------- */
  var box, img, aktivne = [], idx = 0;
  function zobraz(i) {
    idx = (i + aktivne.length) % aktivne.length;
    img.src = aktivne[idx].getAttribute("href");
    box.querySelector(".lb-pocet").textContent = (idx + 1) + " / " + aktivne.length;
  }
  function otvor(galeria, i) {
    if (!box) {
      box = document.createElement("div");
      box.className = "lb";
      box.innerHTML = '<button class="lb-zavri" aria-label="Zavrieť">×</button>' +
        '<button class="lb-pred" aria-label="Predchádzajúca">‹</button><img alt="">' +
        '<button class="lb-dalsia" aria-label="Ďalšia">›</button><div class="lb-pocet"></div>';
      document.body.appendChild(box);
      img = box.querySelector("img");
      box.querySelector(".lb-zavri").onclick = zavri;
      box.querySelector(".lb-pred").onclick = function () { zobraz(idx - 1); };
      box.querySelector(".lb-dalsia").onclick = function () { zobraz(idx + 1); };
      box.addEventListener("click", function (e) { if (e.target === box) zavri(); });
      document.addEventListener("keydown", function (e) {
        if (!box.classList.contains("on")) return;
        if (e.key === "Escape") zavri();
        if (e.key === "ArrowLeft") zobraz(idx - 1);
        if (e.key === "ArrowRight") zobraz(idx + 1);
      });
    }
    aktivne = Array.prototype.slice.call(galeria.querySelectorAll("a[data-foto]"));
    box.classList.add("on");
    document.documentElement.style.overflow = "hidden";
    zobraz(i);
  }
  function zavri() { box.classList.remove("on"); document.documentElement.style.overflow = ""; }
  document.querySelectorAll("[data-galeria]").forEach(function (g) {
    g.querySelectorAll("a[data-foto]").forEach(function (a, i) {
      a.addEventListener("click", function (e) { e.preventDefault(); otvor(g, i); });
    });
  });

  /* ---------- filter ponuky ---------- */
  document.querySelectorAll("form[data-filter]").forEach(function (f) {
    var zoznam = document.querySelector(f.getAttribute("data-filter")) || document;
    var polozky = Array.prototype.slice.call(zoznam.querySelectorAll("[data-auto]"));
    var rodic = polozky.length ? polozky[0].parentNode : null;
    var poctu = document.querySelectorAll("[data-pocet]");
    var prazdne = document.querySelector("[data-prazdne]");
    var zor = document.querySelector("select[data-zoradit]");
    var q = new URLSearchParams(location.search);
    q.forEach(function (v, k) { if (f.elements[k]) f.elements[k].value = v; });
    function cislo(el, k) { return parseFloat(el.getAttribute("data-" + k)) || 0; }
    /* bez diakritiky a malými: „skoda“ nájde „Škoda“, „automatická“ nájde „7-st. automatická“ */
    function norm(t) { return (t || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
    function obsahuje(el, k, v) { return norm(el.getAttribute("data-" + k)).indexOf(v) >= 0; }
    function prepocitaj() {
      var v = {}, n = 0;
      ["znacka", "palivo", "prevodovka", "karoseria", "cena_do", "rok_od", "km_do", "q"].forEach(function (k) {
        if (f.elements[k]) v[k] = norm(f.elements[k].value);
      });
      polozky.forEach(function (el) {
        var ok = (!v.znacka || norm(el.getAttribute("data-znacka")) === v.znacka) &&
          (!v.palivo || obsahuje(el, "palivo", v.palivo)) &&
          (!v.prevodovka || obsahuje(el, "prevodovka", v.prevodovka)) &&
          (!v.karoseria || obsahuje(el, "karoseria", v.karoseria)) &&
          (!v.cena_do || cislo(el, "cena") <= parseFloat(v.cena_do)) &&
          (!v.rok_od || cislo(el, "rok") >= parseFloat(v.rok_od)) &&
          (!v.km_do || cislo(el, "km") <= parseFloat(v.km_do)) &&
          (!v.q || obsahuje(el, "nazov", v.q));
        el.hidden = !ok;
        if (ok) n++;
      });
      poctu.forEach(function (p) { p.textContent = n; });
      if (prazdne) prazdne.hidden = n > 0;
    }
    function zorad() {
      if (!zor || !rodic) return;
      var s = zor.value, k = s.split("-")[0], smer = s.split("-")[1] === "desc" ? -1 : 1;
      polozky.slice().sort(function (a, b) { return (cislo(a, k) - cislo(b, k)) * smer; })
        .forEach(function (el) { rodic.appendChild(el); });
    }
    f.addEventListener("input", prepocitaj);
    f.addEventListener("submit", function (e) { e.preventDefault(); prepocitaj(); });
    f.addEventListener("reset", function () { setTimeout(prepocitaj, 0); });
    if (zor) zor.addEventListener("change", zorad);
    prepocitaj();
  });

  /* ---------- kalkulačka splátok (anuita) ---------- */
  document.querySelectorAll("[data-kalkulacka]").forEach(function (k) {
    function pocitaj() {
      var cena = parseFloat(k.querySelector("[name=cena]").value) || 0;
      var ako = (parseFloat(k.querySelector("[name=akontacia]").value) || 0) / 100;
      var n = parseInt(k.querySelector("[name=mesiace]").value, 10) || 60;
      var r = (parseFloat((k.querySelector("[name=urok]") || { value: 7.9 }).value) || 0) / 1200;
      var uver = cena * (1 - ako);
      var s = r ? uver * r / (1 - Math.pow(1 + r, -n)) : uver / n;
      k.querySelectorAll("[data-splatka]").forEach(function (el) { el.textContent = fmt(s) + NBSP + "€"; });
      k.querySelectorAll("[data-uver]").forEach(function (el) { el.textContent = fmt(uver) + NBSP + "€"; });
      k.querySelectorAll("[data-ako-suma]").forEach(function (el) { el.textContent = fmt(cena * ako) + NBSP + "€"; });
      k.querySelectorAll("output[for]").forEach(function (o) {
        var i = k.querySelector("#" + o.getAttribute("for"));
        if (i) o.textContent = (i.name === "cena" ? fmt(i.value) : i.value) +
          (i.getAttribute("data-jednotka") || (i.name === "mesiace" ? " mes." : i.name === "cena" ? NBSP + "€" : " %"));
      });
    }
    k.addEventListener("input", pocitaj);
    pocitaj();
  });

  /* ---------- záložky ---------- */
  document.querySelectorAll("[data-prepinac]").forEach(function (p) {
    var tlacidla = p.querySelectorAll("[data-ciel]");
    tlacidla.forEach(function (t) {
      t.addEventListener("click", function () {
        tlacidla.forEach(function (x) {
          var on = x === t;
          x.classList.toggle("on", on);
          x.setAttribute("aria-selected", on);
          var c = document.getElementById(x.getAttribute("data-ciel"));
          if (c) c.hidden = !on;
        });
      });
    });
  });
})();
