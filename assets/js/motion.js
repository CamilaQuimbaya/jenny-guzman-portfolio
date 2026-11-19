/* ============================================================
   Motion engine — parallax entre secciones, reveals, mouse
   parallax del hero, marquee ligado al scroll y botones magnéticos.
   Todo el desplazamiento usa las propiedades `translate` / `scale`
   para no pisar los `transform` de hover y animaciones CSS.
   ============================================================ */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = root.classList.contains('reduce-motion');
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var magnets = [];

  // El contenido lo pinta React (dc-runtime) después de cargar: esperamos.
  function whenReady(cb) {
    var tries = 0;
    (function check() {
      // Ojo: antes de montar, el mismo HTML existe dentro de <x-dc> como plantilla.
      if (!document.querySelector('x-dc') && document.querySelector('#dc-root #contacto [data-scene]') && document.querySelector('#dc-root #expertise article h3')) return cb();
      if (++tries < 600) requestAnimationFrame(check);
    })();
  }

  whenReady(function () {
    var bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);

    setupMobileMenu();
    setupReveals();
    setupSpotlight();
    if (reduce) { onScrollProgressOnly(bar); return; }
    setupMagnetic();
    startLoop(bar);
  });

  /* ---------------- menú móvil ---------------- */
  function setupMobileMenu() {
    var L = {
      es: { links: ['Sobre mí', 'Expertise', 'Enfoque', 'Proyectos', 'Herramientas', 'Testimonios', 'Contacto'], talk: 'Hablemos', open: 'Abrir menú', close: 'Cerrar menú', menu: 'Menú', lang: 'Idioma' },
      en: { links: ['About me', 'Expertise', 'Approach', 'Projects', 'Tools', 'Testimonials', 'Contact'], talk: 'Let’s talk', open: 'Open menu', close: 'Close menu', menu: 'Menu', lang: 'Language' },
    };
    var ids = ['#sobre-mi', '#expertise', '#enfoque', '#proyectos', '#herramientas', '#testimonios', '#contacto'];
    var cur = function () { return root.lang === 'en' ? 'en' : 'es'; };
    var fab = document.createElement('button');
    fab.className = 'm-fab'; fab.type = 'button';
    fab.setAttribute('aria-label', 'Abrir menú'); fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'm-menu');
    fab.innerHTML = '<span></span><span></span>';
    var menu = document.createElement('nav');
    menu.className = 'm-menu'; menu.id = 'm-menu';
    var linkedin = (document.querySelector('.hero-nav a[href*="linkedin"]') || {}).href || 'https://www.linkedin.com/';
    menu.innerHTML = '<span class="m-gfx" aria-hidden="true"></span>' + ids.map(function (id, i) {
      return '<a class="m-link" href="' + id + '" style="transition-delay:' + (180 + i * 60) + 'ms"><i>0' + (i + 1) + '</i><span></span></a>';
    }).join('') + '<div class="m-menu-foot"><a href="' + linkedin + '">LinkedIn</a><a class="cta" href="#contacto"></a></div>' +
      '<div class="m-lang" role="group"><button type="button" data-l="es" lang="es">ES · Español</button><button type="button" data-l="en" lang="en">EN · English</button></div>';
    var paint = function () {
      var d = L[cur()];
      menu.querySelectorAll('.m-link span').forEach(function (s, i) { s.textContent = d.links[i]; });
      menu.querySelector('.cta').textContent = d.talk;
      menu.setAttribute('aria-label', d.menu);
      menu.querySelector('.m-lang').setAttribute('aria-label', d.lang);
      menu.querySelectorAll('.m-lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.l === cur())); });
      fab.setAttribute('aria-label', root.classList.contains('m-open') ? d.close : d.open);
    };
    menu.querySelectorAll('.m-lang button').forEach(function (b) {
      b.addEventListener('click', function () { if (window.__setLang) window.__setLang(b.dataset.l); });
    });
    addEventListener('langchange', function (e) {
      paint();
      if (e.detail && e.detail.animate && !reduce) {
        root.classList.remove('lang-swap'); void root.offsetWidth; root.classList.add('lang-swap');
        clearTimeout(paint.t); paint.t = setTimeout(function () { root.classList.remove('lang-swap'); }, 650);
      }
    });
    document.body.appendChild(menu);
    document.body.appendChild(fab);
    root.classList.add('has-mfab');
    var set = function (open) {
      root.classList.toggle('m-open', open);
      fab.setAttribute('aria-expanded', String(open));
      fab.setAttribute('aria-label', open ? L[cur()].close : L[cur()].open);
      root.style.overflow = open ? 'hidden' : '';
    };
    fab.addEventListener('click', function () { set(!root.classList.contains('m-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    paint();
    addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    addEventListener('resize', function () { if (innerWidth > 760) set(false); });
    // El botón se esconde al bajar (para no tapar el texto) y vuelve al subir
    var lastY = scrollY;
    addEventListener('scroll', function () {
      var y = scrollY;
      if (Math.abs(y - lastY) < 8) return;
      root.classList.toggle('fab-hide', y > lastY && y > 240 && !root.classList.contains('m-open'));
      lastY = y;
    }, { passive: true });
  }

  /* ---------------- reveals ---------------- */
  function setupReveals() {
    var items = [];
    var add = function (el, variant, delay) {
      if (!el || el.__rv) return;
      el.__rv = true;
      el.classList.add('rv');
      if (variant) el.classList.add(variant);
      el.style.setProperty('--d', (delay || 0) + 'ms');
      items.push(el);
    };

    // Bloques de encabezado: se revelan sus hijos de forma escalonada
    document.querySelectorAll('section [data-reveal]').forEach(function (el) {
      var sec = el.closest('section');
      var tag = el.tagName;
      if (tag === 'ARTICLE' || tag === 'FIGURE' || el.parentElement.children.length > 3 && !el.querySelector('h2')) return;
      if (sec.id === 'sobre-mi') {
        add(el, el.querySelector('img') ? 'rv-left' : 'rv-right', el.querySelector('img') ? 0 : 140);
        return;
      }
      if (sec.id === 'contacto') { add(el, el.querySelector('form, h3') ? 'rv-right' : 'rv-left', el.querySelector('form, h3') ? 160 : 0); return; }
      var kids = el.children;
      if (el.querySelector('h2') && kids.length > 0 && kids.length < 6) {
        el.removeAttribute('data-reveal');
        Array.prototype.forEach.call(kids, function (k, i) { add(k, null, i * 110); });
      } else add(el);
    });

    // Rejillas: escalonado por columna
    var grids = [
      ['#expertise article', 'rv-flip', 4],
      ['#proyectos article', null, 1],
      ['#herramientas [data-reveal]', 'rv-pop', 3],
      ['#certificaciones [data-reveal]', 'rv-flip', 4],
      ['#testimonios figure', null, 3],
    ];
    grids.forEach(function (g) {
      document.querySelectorAll(g[0]).forEach(function (el, i) {
        el.removeAttribute('data-reveal');
        add(el, g[1], (i % g[2]) * 95 + (g[2] === 1 ? 0 : Math.floor(i / g[2]) * 40));
      });
    });
    // Elementos sueltos que merecen entrada
    add(document.querySelector('#enfoque [data-scene] > div:nth-child(2)'), null, 120);
    add(document.querySelector('#enfoque [data-scene] > div:nth-child(3)'), 'rv-flip', 200);
    add(document.querySelector('#contacto footer'), null, 0);
    document.querySelectorAll('.mq-row').forEach(function (el, i) { add(el, i ? 'rv-right' : 'rv-left', i * 120); });

    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.remove('rv'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        el.classList.add('rv-in');
        // Al terminar, devolvemos el control a las transiciones de hover originales
        var done = function () { el.classList.remove('rv', 'rv-in', 'rv-left', 'rv-right', 'rv-pop', 'rv-flip'); el.removeEventListener('transitionend', onEnd); };
        var onEnd = function (e) { if (e.target === el && e.propertyName === 'transform') done(); };
        el.addEventListener('transitionend', onEnd);
        setTimeout(done, 2200);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- spotlight que sigue al cursor ---------------- */
  function setupSpotlight() {
    if (!finePointer) return;
    document.querySelectorAll('#expertise article, #proyectos article, #certificaciones [style*="dashed"], #testimonios figure').forEach(function (el) {
      el.classList.add('spot');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------------- botones magnéticos ---------------- */
  function setupMagnetic() {
    if (!finePointer) return;
    var sel = 'a[href="#proyectos"], nav a[href="#contacto"], footer a[href="#contacto"], button[type="submit"], footer a[href="#top"]';
    document.querySelectorAll(sel).forEach(function (el) {
      var m = { el: el, x: 0, y: 0, tx: 0, ty: 0 };
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        m.tx = (e.clientX - (r.left + r.width / 2)) * 0.28;
        m.ty = (e.clientY - (r.top + r.height / 2)) * 0.38;
      });
      el.addEventListener('pointerleave', function () { m.tx = 0; m.ty = 0; });
      magnets.push(m);
    });
  }

  function onScrollProgressOnly(bar) {
    var upd = function () {
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* ---------------- bucle principal ---------------- */
  function startLoop(bar) {
    var hero = document.querySelector('#top');
    var heroCard = hero.querySelector('.hero-card');
    var heroGfx = hero.querySelector('.hero-gfx');
    var scenes = Array.prototype.map.call(document.querySelectorAll('[data-scene]'), function (el) {
      return { el: el, sec: el.closest('section, header'), last: '' };
    });
    var stage = document.querySelector('#enfoque');
    var depthScroll = Array.prototype.map.call(document.querySelectorAll('[data-depth-scroll]'), function (el) {
      return { el: el, f: parseFloat(el.dataset.depthScroll) || 0, sec: el.closest('section, header') };
    });
    var bgLayers = Array.prototype.map.call(document.querySelectorAll('[data-bgpx]'), function (el) {
      return { el: el, f: parseFloat(el.dataset.bgpx) || 0 };
    });
    // Capas con profundidad para el parallax del mouse en el hero
    var depth = Array.prototype.map.call(hero.querySelectorAll('[data-depth]'), function (el) {
      return { el: el, d: parseFloat(el.dataset.depth) || 0, x: 0, y: 0 };
    });
    hero.querySelectorAll('.hero-visual [data-float]').forEach(function (el, i) {
      depth.push({ el: el, d: (i % 2 ? -1 : 1) * (14 + i * 5), x: 0, y: 0 });
    });
    var visual = hero.querySelector('.hero-visual');
    if (visual) depth.push({ el: visual, d: -10, x: 0, y: 0 });
    var copy = hero.querySelector('.hero-copy');
    if (copy) depth.push({ el: copy, d: 6, x: 0, y: 0 });

    var marquees = Array.prototype.map.call(document.querySelectorAll('[data-mq]'), function (row) {
      var track = row.querySelector('.mq-track');
      return { row: row, track: track, dir: +row.dataset.mq, third: track.scrollWidth / 3 };
    });

    var mouse = { x: .5, y: .5 };
    if (finePointer) {
      addEventListener('pointermove', function (e) {
        mouse.x = e.clientX / innerWidth; mouse.y = e.clientY / innerHeight;
        var r = heroCard.getBoundingClientRect();
        heroGfx.style.setProperty('--hx', (e.clientX - r.left) + 'px');
        heroGfx.style.setProperty('--hy', (e.clientY - r.top) + 'px');
      }, { passive: true });
    }

    // Posiciones absolutas sin transformaciones (offsetTop ignora translate/scale),
    // así no hay que leer el layout en cada frame.
    var absTop = function (el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; };
    var boxes = new Map();
    var box = function (el) { var b = boxes.get(el); if (!b) { b = { top: 0, h: 0 }; boxes.set(el, b); } return b; };
    var measureAll = function () {
      boxes.forEach(function (b, el) { b.top = absTop(el); b.h = el.offsetHeight; });
      marquees.forEach(function (m) { m.third = m.track.scrollWidth / 3; });
      docH = document.documentElement.scrollHeight;
    };
    var docH = 0;
    scenes.forEach(function (s) { s.box = box(s.sec); });
    depthScroll.forEach(function (d) { d.box = box(d.sec); });
    marquees.forEach(function (m) { m.box = box(m.row.parentElement); });
    var heroBox = box(hero), stageBox = stage ? box(stage) : null;
    measureAll();
    addEventListener('resize', measureAll);
    addEventListener('load', measureAll);
    if ('ResizeObserver' in window) new ResizeObserver(measureAll).observe(hero.parentElement);
    setInterval(measureAll, 1500);
    var rect = function (b, sy) { return { top: b.top - sy, bottom: b.top + b.h - sy, height: b.h }; };

    var t0 = performance.now();
    var smoothY = scrollY;

    function frame(now) {
      var vh = innerHeight;
      var sy = scrollY;
      var maxScroll = docH - vh;
      // Scroll suavizado para que el parallax se sienta "líquido"
      smoothY = lerp(smoothY, scrollY, 0.14);
      if (Math.abs(smoothY - scrollY) < 0.1) smoothY = scrollY;
      var p = maxScroll > 0 ? scrollY / maxScroll : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      var lag = scrollY - smoothY; // >0 bajando
      var k = innerWidth < 760 ? 0.3 : 1; // en móvil el parallax es más sutil

      // 1) Escenas: entran desde abajo y al salir se quedan atrás (parallax)
      for (var i = 0; i < scenes.length; i++) {
        var s = scenes[i];
        var r = rect(s.box, sy);
        if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) continue;
        var enter = easeOut(clamp((vh - r.top) / (vh * 0.7), 0, 1));
        var exit = clamp((vh * 0.55 - r.bottom) / (vh * 0.55), 0, 1);
        var ty = ((1 - enter) * 90 + exit * 140 + lag * 0.08) * k;
        var sc = 1 - (exit * 0.07 + (1 - enter) * 0.03) * k;
        var v = '0 ' + ty.toFixed(1) + 'px';
        var k = v + sc.toFixed(4);
        if (k !== s.last) { s.el.style.translate = v; s.el.style.scale = sc.toFixed(4); s.last = k; }
      }

      // 2) La sección oscura "sube" como una tarjeta que se expande
      if (stage) {
        var rs = rect(stageBox, sy);
        var e2 = easeOut(clamp((vh - rs.top) / (vh * 0.85), 0, 1));
        stage.style.scale = (1 - 0.1 * k * (1 - e2)).toFixed(4);
        stage.style.translate = '0 ' + ((1 - e2) * 60 * k).toFixed(1) + 'px';
      }

      // 3) Elementos con profundidad ligada al scroll
      for (var j = 0; j < depthScroll.length; j++) {
        var d = depthScroll[j];
        var rr = rect(d.box, sy);
        if (rr.bottom < -200 || rr.top > vh + 200) continue;
        var off = (rr.top + rr.height / 2) - vh / 2;
        d.el.style.translate = '0 ' + clamp(-off * d.f, -60, 160).toFixed(1) + 'px';
      }

      // 4) Fondo fijo: cada mancha se mueve a distinta velocidad
      for (var b = 0; b < bgLayers.length; b++) {
        var L = bgLayers[b];
        L.el.style.translate = ((mouse.x - .5) * L.f * 120).toFixed(1) + 'px ' + (-p * L.f * 1500 + (mouse.y - .5) * L.f * 80).toFixed(1) + 'px';
      }

      // 5) Mouse parallax dentro del hero (solo si está visible)
      var hr = rect(heroBox, sy);
      if (hr.bottom > 0) {
        var mx = mouse.x - .5, my = mouse.y - .5;
        for (var q = 0; q < depth.length; q++) {
          var o = depth[q];
          o.x = lerp(o.x, mx * o.d * 2, 0.08);
          o.y = lerp(o.y, my * o.d * 2, 0.08);
          o.el.style.translate = o.x.toFixed(2) + 'px ' + o.y.toFixed(2) + 'px';
        }
      }

      // 6) Marquee: avanza solo y acelera con el scroll
      var base = (now - t0) * 0.045 + smoothY * 0.45;
      for (var m = 0; m < marquees.length; m++) {
        var M = marquees[m];
        var rm = rect(M.box, sy);
        if (rm.bottom < -100 || rm.top > vh + 100 || !M.third) continue;
        var w = base % M.third;
        var x = M.dir < 0 ? -w : -M.third + w;
        M.track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      }

      // 7) Botones magnéticos
      for (var g = 0; g < magnets.length; g++) {
        var mg = magnets[g];
        mg.x = lerp(mg.x, mg.tx, 0.18); mg.y = lerp(mg.y, mg.ty, 0.18);
        mg.el.style.translate = mg.x.toFixed(2) + 'px ' + mg.y.toFixed(2) + 'px';
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
