/* Šablóna portal: mapa sa načíta až po kliknutí (bez cookies a sledovania pred súhlasom). */
(function () {
  document.querySelectorAll("[data-mapa-src]").forEach(function (m) {
    var b = m.querySelector("button");
    if (!b) return;
    b.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = m.getAttribute("data-mapa-src");
      f.title = "Mapa";
      f.loading = "lazy";
      m.innerHTML = "";
      m.appendChild(f);
    });
  });
})();

/* v2: porovnanie áut (2 až 3), plávajúca lišta, stránka /porovnanie/, počítadlo fotiek v galérii */
(function () {
  var KLUC = "pt-porovnanie:" + (document.querySelector("link[rel=stylesheet][href*='portal.css']") || {}).href;
  var MAX = 3;
  function citaj() { try { return JSON.parse(localStorage.getItem(KLUC) || "[]") || []; } catch (e) { return []; } }
  function pis(z) { try { localStorage.setItem(KLUC, JSON.stringify(z)); } catch (e) {} }
  var zoz = citaj();
  var lista = document.querySelector("[data-porov-lista]");

  function obnov() {
    document.querySelectorAll("[data-porovnaj]").forEach(function (c) {
      var d = JSON.parse(c.getAttribute("data-porovnaj"));
      c.checked = zoz.some(function (x) { return x.id === d.id; });
      c.disabled = !c.checked && zoz.length >= MAX;
      c.closest("label").classList.toggle("on", c.checked);
    });
    if (lista) {
      lista.hidden = zoz.length === 0 || !!document.querySelector("[data-porovnanie]");
      var p = lista.querySelector("[data-porov-pocet]");
      if (p) p.textContent = zoz.length === 1 ? "Vybrané 1 auto, pridajte ešte jedno" : "Vybrané " + zoz.length + " autá";
      var a = lista.querySelector("a");
      if (a) a.classList.toggle("vypnute", zoz.length < 2);
    }
  }
  document.addEventListener("change", function (ev) {
    var c = ev.target;
    if (!c.matches || !c.matches("[data-porovnaj]")) return;
    var d = JSON.parse(c.getAttribute("data-porovnaj"));
    zoz = zoz.filter(function (x) { return x.id !== d.id; });
    if (c.checked && zoz.length < MAX) zoz.push(d);
    pis(zoz); obnov(); kresli();
  });
  var zrus = document.querySelector("[data-porov-zrus]");
  if (zrus) zrus.addEventListener("click", function () { zoz = []; pis(zoz); obnov(); });

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (z) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]; }); }
  function kresli() {
    var box = document.querySelector("[data-porovnanie]");
    var src = document.getElementById("pt-auta");
    if (!box || !src) return;
    var data = {}; try { data = JSON.parse(src.textContent); } catch (e) {}
    var auta = zoz.map(function (x) { return data[x.id] ? Object.assign({ id: x.id }, data[x.id]) : null; }).filter(Boolean);
    var r = box.getAttribute("data-r") || "../";
    if (!auta.length) { box.innerHTML = '<p class="pt-porov-prazdne">Zatiaľ nemáte vybrané žiadne auto. V ponuke zaškrtnite <b>Porovnať</b> pri 2 až 3 autách.</p><a class="btn btn-ak" href="' + r + 'ponuka/">Prejsť na ponuku</a>'; return; }
    var stitky = [];
    auta.forEach(function (a) { a.p.forEach(function (x) { if (stitky.indexOf(x[0]) < 0) stitky.push(x[0]); }); });
    var min = Math.min.apply(null, auta.map(function (a) { return a.cn || Infinity; }));
    var h = '<div class="pt-porov-tab" style="--n:' + auta.length + '"><div class="pt-pr pt-pr-hlava"><div></div>';
    auta.forEach(function (a) {
      h += '<div class="pt-pc"><a href="' + r + 'auto/' + esc(a.id) + '/">' + (a.f ? '<img src="' + r + 'fotky/' + esc(a.f) + '" alt="" width="400" height="300" loading="lazy">' : "") +
        '<b>' + esc(a.n) + '</b></a><p class="pt-pc-cena' + (a.cn === min && auta.length > 1 ? " najnizsia" : "") + '">' + esc(a.c) + '</p>' +
        '<button type="button" class="pt-pc-zrus" data-zrus="' + esc(a.id) + '">Odobrať</button></div>';
    });
    h += "</div>";
    stitky.forEach(function (s) {
      h += '<div class="pt-pr"><div class="pt-ps">' + esc(s) + "</div>";
      auta.forEach(function (a) { var x = a.p.filter(function (y) { return y[0] === s; })[0]; h += '<div class="pt-pc" data-s="' + esc(s) + '">' + (x ? esc(x[1]) : "neuvedené") + "</div>"; });
      h += "</div>";
    });
    h += '<div class="pt-pr"><div class="pt-ps">Výbava</div>';
    auta.forEach(function (a) { h += '<div class="pt-pc" data-s="Výbava">' + (a.v ? a.v + " položiek" : "neuvedená") + "</div>"; });
    h += '</div><div class="pt-pr"><div></div>';
    auta.forEach(function (a) { h += '<div class="pt-pc"><a class="btn btn-ak" href="' + r + 'auto/' + esc(a.id) + '/">Detail auta</a></div>'; });
    box.innerHTML = h + "</div>" + (auta.length < 2 ? '<p class="pt-porov-prazdne">Pridajte ešte aspoň jedno auto. <a href="' + r + 'ponuka/">Späť na ponuku</a></p>' : "");
    box.querySelectorAll("[data-zrus]").forEach(function (b) {
      b.addEventListener("click", function () { var id = b.getAttribute("data-zrus"); zoz = zoz.filter(function (x) { return x.id !== id; }); pis(zoz); obnov(); kresli(); });
    });
  }
  obnov(); kresli();

  /* počítadlo „3 / 12“ v galérii detailu */
  document.querySelectorAll("[data-g]").forEach(function (g) {
    var pocet = g.querySelector("[data-g-pocet]"), fotky = g.querySelectorAll(".g-foto");
    if (!pocet || !fotky.length) return;
    function zap() { for (var i = 0; i < fotky.length; i++) if (fotky[i].classList.contains("on")) { pocet.textContent = (i + 1) + " / " + fotky.length; return; } }
    if ("MutationObserver" in window) new MutationObserver(zap).observe(g, { subtree: true, attributes: true, attributeFilter: ["class"] });
  });
})();
