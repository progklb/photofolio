/* Compass & Trail — site script. No dependencies. */
(() => {
  'use strict';

  const S = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const src = (slug, id, size = 's') => `img/${slug}/${id}-${size}.webp`;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  const sets = { portfolio: S.gallery };
  S.projects.forEach((p) => (sets[p.slug] = p));
  const imgOf = (slug, id) => sets[slug].images.find((i) => i.id === id);

  /* ---------------------------------------------------------------------- */
  /* Helpers                                                                */
  /* ---------------------------------------------------------------------- */

  function splitLetters(node, baseDelay = 0) {
    const text = node.textContent;
    node.textContent = '';
    node.setAttribute('aria-label', text);
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      if (baseDelay) s.style.setProperty('--base', baseDelay + 'ms');
      s.textContent = ch === ' ' ? ' ' : ch;
      node.appendChild(s);
    });
  }

  // Seeded RNG so contour maps look the same on every visit.
  function rng(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // Procedural topographic contour lines.
  function topo(svg, { seed = 3, w = 1600, h = 1000, hills = 3, rings = 10 } = {}) {
    const r = rng(seed);
    let out = '';
    let n = 0;
    for (let c = 0; c < hills; c++) {
      const cx = w * (0.1 + r() * 0.8);
      const cy = h * (0.1 + r() * 0.8);
      const harm = Array.from({ length: 4 }, (_, k) => ({ a: (0.05 + r() * 0.12) / (k + 1), f: k + 2, p: r() * Math.PI * 2 }));
      const step = 34 + r() * 26;
      for (let i = 0; i < rings; i++) {
        const base = 26 + i * step;
        let d = '';
        for (let t = 0; t <= 96; t++) {
          const th = (t / 96) * Math.PI * 2;
          let k = 1;
          harm.forEach((hm) => (k += hm.a * Math.sin(hm.f * th + hm.p + i * 0.22)));
          const rad = base * k;
          d += (t ? 'L' : 'M') + (cx + Math.cos(th) * rad * 1.25).toFixed(1) + ' ' + (cy + Math.sin(th) * rad).toFixed(1);
        }
        out += `<path pathLength="1" class="${i % 4 === 3 ? 'major' : ''}" style="--i:${n++}" d="${d}Z"/>`;
      }
    }
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.classList.add('topo');
    svg.innerHTML = out;
    return svg;
  }

  // One observer adds .is-in when something scrolls into view (works inside the panel too).
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      if (e.target.classList.contains('topo')) e.target.classList.add('drawn');
      io.unobserve(e.target);
    }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
  );
  const watch = (n) => (reduce ? n.classList.add('is-in', 'drawn') : io.observe(n));

  function tileHTML(slug, img, i, n) {
    const cap = img.caption ? esc(img.caption) : `${esc(sets[slug].title)} — frame ${i + 1}`;
    return `<a class="tile reveal" href="#${slug === 'portfolio' ? '/g/' : '/p/' + slug + '/'}${img.id}" data-key="${slug}/${img.id}" data-cursor="View" style="--d:${(i % 4) * 70}ms">
      <div class="ph" data-n="${pad(i + 1, 3)} / ${pad(n, 3)}" style="aspect-ratio:${img.w}/${img.h}">
        <img src="${src(slug, img.id)}" width="${img.w}" height="${img.h}" loading="lazy" decoding="async" alt="${cap}">
      </div></a>`;
  }
  function hookTiles(container) {
    $$('.tile', container).forEach(watch);
    $$('img', container).forEach((im) => {
      if (im.complete && im.naturalWidth) im.classList.add('loaded');
      else im.addEventListener('load', () => im.classList.add('loaded'), { once: true });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Static content                                                          */
  /* ---------------------------------------------------------------------- */

  $$('.name').forEach((n) => (n.textContent = S.name));
  $('.year').textContent = new Date().getFullYear();
  $('.hero-tagline').textContent = S.tagline;
  $('.gallery-blurb').textContent = S.gallery.blurb[0] || '';

  // Social links (icons are the original PNGs used as CSS masks so they take on theme colour)
  const notes = { YouTube: 'Films', Instagram: '@compass_and_trail', Threads: '@compass_and_trail', 'Gear list': 'What’s in my pack' };
  $('.social-links').innerHTML = S.social.map((s) =>
    `<li><a href="${s.url}" target="_blank" rel="noopener"><i class="ico" style="-webkit-mask-image:url(${s.icon});mask-image:url(${s.icon})"></i>${esc(s.label)}<small>${notes[s.label] || ''}</small><span class="arrow" aria-hidden="true">↗</span></a></li>`).join('');
  $('.menu-social').innerHTML = S.social.map((s) =>
    `<li><a href="${s.url}" target="_blank" rel="noopener"><i class="ico" style="-webkit-mask-image:url(${s.icon});mask-image:url(${s.icon})"></i>${esc(s.label)}</a></li>`).join('');

  // Stats
  const totalPhotos = S.gallery.images.length + S.projects.reduce((a, p) => a + p.images.length, 0);
  const days = S.projects.reduce((a, p) => a + (p.facts || []).reduce((b, f) => b + (parseInt(/(\d+)\s*days?/.exec(f)?.[1], 10) || 0), 0), 0);
  const statEls = $$('.stats dd');
  [totalPhotos, S.projects.length, days].forEach((v, i) => (statEls[i].dataset.count = v));

  // Intro words light up as you scroll past
  const intro = $('[data-words]');
  intro.innerHTML = intro.textContent.split(/\s+/).map((w) =>
    `<span class="w${/trail|trip|remembering/i.test(w) ? ' em' : ''}">${esc(w)}</span>`).join(' ');
  const words = $$('.w', intro);

  // Cards
  const cardsEl = $('.cards');
  cardsEl.innerHTML = S.projects.map((p, i) => {
    const n = p.images.length;
    const others = p.images.filter((im) => im.id !== p.cover);
    const a = others[Math.floor(others.length / 3)] || others[0];
    const b = others[Math.floor((others.length * 2) / 3)] || others[1] || a;
    return `<a class="card" href="#/p/${p.slug}" data-slug="${p.slug}" data-cursor="Open">
      <div class="card-stack">
        <div class="fan a"><img src="${src(p.slug, a.id)}" alt="" loading="lazy"></div>
        <div class="fan b"><img src="${src(p.slug, b.id)}" alt="" loading="lazy"></div>
        <div class="main"><img src="${src(p.slug, p.cover)}" alt="" loading="lazy"></div>
        <span class="card-num">${pad(i + 1)}</span>
        <span class="card-count">${pad(n)} frames</span>
      </div>
      <div class="card-meta">
        <span class="card-kind">${esc(p.kind)}${p.region ? ' · ' + esc(p.region) : ''}</span>
        <h3 class="card-title">${esc(p.short).replace(/ (\S+)$/, ' <span class="nw">$1')}&nbsp;<span class="arrow">→</span>${/ /.test(p.short) ? '</span>' : ''}</h3>
        <div class="card-facts">${(p.facts || []).map((f) => `<span>${esc(f)}</span>`).join('')}</div>
      </div>
    </a>`;
  }).join('');
  $$('.card').forEach((c) => {
    watch(c);
    if (fine) {
      c.addEventListener('mouseenter', () => c.classList.add('fanned'));
      c.addEventListener('mouseleave', () => c.classList.remove('fanned'));
    }
  });
  // On touch screens the card nearest the middle of the screen fans out by itself.
  if (!fine) {
    const fanIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('fanned', e.isIntersecting)), { rootMargin: '-38% 0px -38% 0px' });
    $$('.card').forEach((c) => fanIO.observe(c));
  }

  // Menu
  $('.menu-projects').innerHTML = S.projects.map((p, i) =>
    `<li><a href="#/p/${p.slug}" data-slug="${p.slug}" style="--i:${i}"><small>${pad(i + 1)}</small>${esc(p.short)}<span class="kind">${esc(p.kind)}</span></a></li>`).join('');

  // Marquee: a sample of frames from every project
  const pool = [];
  S.projects.concat([S.gallery]).forEach((p) => p.images.forEach((im, i) => { if (i % 4 === 1) pool.push([p.slug, im.id]); }));
  const mr = rng(42);
  const shuffled = pool.map((x) => [mr(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const rowA = shuffled.filter((_, i) => i % 2 === 0).slice(0, 14);
  const rowB = shuffled.filter((_, i) => i % 2 === 1).slice(0, 14);
  const tracks = $$('.marquee-track');
  [rowA, rowB].forEach((row, r) => {
    const html = row.map(([s, id]) => `<img src="${src(s, id)}" alt="" loading="lazy">`).join('');
    tracks[r].innerHTML = html + html;
  });

  // Gallery
  const tilesEl = $('.tiles');
  let galleryOrder = S.gallery.images.slice();
  const renderGallery = () => {
    tilesEl.innerHTML = galleryOrder.map((im, i) => tileHTML('portfolio', im, i, galleryOrder.length)).join('');
    hookTiles(tilesEl);
  };
  renderGallery();

  // FLIP helper for layout/shuffle changes
  function flip(container, mutate) {
    const items = $$('.tile', container);
    const vh = innerHeight;
    const first = new Map(items.map((n) => [n.dataset.key, n.getBoundingClientRect()]));
    mutate();
    $$('.tile', container).forEach((n, i) => {
      n.classList.add('is-in');
      const a = first.get(n.dataset.key);
      const b = n.getBoundingClientRect();
      if (!a || (b.bottom < -200 || b.top > vh + 200) && (a.bottom < -200 || a.top > vh + 200)) return;
      n.animate(
        [{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})` }, { transform: 'none' }],
        { duration: reduce ? 1 : 800, easing: 'cubic-bezier(.22,1,.36,1)', delay: reduce ? 0 : (i % 12) * 12 }
      );
    });
  }
  $$('[data-layout]').forEach((b) => b.addEventListener('click', () => {
    if (tilesEl.classList.contains(b.dataset.layout)) return;
    $$('[data-layout]').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
    flip(tilesEl, () => { tilesEl.classList.remove('masonry', 'grid'); tilesEl.classList.add(b.dataset.layout); });
  }));
  $('[data-shuffle]').addEventListener('click', () => {
    flip(tilesEl, () => {
      for (let i = galleryOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [galleryOrder[i], galleryOrder[j]] = [galleryOrder[j], galleryOrder[i]];
      }
      const byKey = new Map($$('.tile', tilesEl).map((n) => [n.dataset.key, n]));
      galleryOrder.forEach((im, i) => {
        const n = byKey.get('portfolio/' + im.id);
        n.querySelector('.ph').dataset.n = `${pad(i + 1, 3)} / ${pad(galleryOrder.length, 3)}`;
        tilesEl.appendChild(n);
      });
    });
  });

  // Section titles split into letters
  $$('.section-title .split, .basecamp-title .split').forEach((n) => { splitLetters(n); watch(n); });

  // Topo maps
  topo($('.hero-topo svg'), { seed: 11, hills: 3, rings: 11 });
  topo($('.menu-topo svg'), { seed: 29, hills: 4, rings: 9 });
  watch(topo($('.basecamp-topo svg'), { seed: 5, hills: 2, rings: 12 }));

  /* ---------------------------------------------------------------------- */
  /* Hero slideshow                                                          */
  /* ---------------------------------------------------------------------- */
  const slidesEl = $('.hero-slides');
  const ticksEl = $('.hero-ticks');
  const label = $('.hero-slide-label');
  const SLIDE_MS = 6500;
  slidesEl.innerHTML = S.hero.map(([s, id], i) => `<img ${i === 0 ? 'src' : 'data-src'}="${src(s, id, 'l')}" alt="" ${i ? '' : 'fetchpriority="high"'}>`).join('');
  ticksEl.innerHTML = S.hero.map((_, i) => `<button aria-label="Show slide ${i + 1}" style="--dur:${SLIDE_MS}ms"></button>`).join('');
  const slides = $$('img', slidesEl);
  const ticks = $$('button', ticksEl);
  let slide = -1;
  let slideTimer;
  const ensure = (i) => { const im = slides[i]; if (im && im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } };
  function showSlide(i) {
    slide = (i + slides.length) % slides.length;
    ensure(slide);
    ensure((slide + 1) % slides.length);
    slides.forEach((im, k) => im.classList.toggle('on', k === slide));
    ticks.forEach((t, k) => { t.classList.toggle('done', k < slide); t.classList.remove('on'); });
    void ticksEl.offsetWidth;
    if (!reduce) ticks[slide].classList.add('on');
    else ticks[slide].classList.add('done');
    const [s, id] = S.hero[slide];
    const set = sets[s];
    label.textContent = `${pad(slide + 1)} — ${set.short || set.title}`;
    label.href = s === 'portfolio' ? `#/g/${id}` : `#/p/${s}`;
    clearTimeout(slideTimer);
    if (!reduce) slideTimer = setTimeout(() => showSlide(slide + 1), SLIDE_MS);
  }
  ticks.forEach((t, i) => t.addEventListener('click', () => showSlide(i)));
  label.addEventListener('click', () => { pendingFrom = slides[slide]; });

  /* ---------------------------------------------------------------------- */
  /* Loader                                                                  */
  /* ---------------------------------------------------------------------- */
  (function loader() {
    const ticksG = $('.loader-compass .ticks');
    ticksG.innerHTML = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      const r1 = i % 6 === 0 ? 34 : 38;
      return `<line x1="${50 + Math.cos(a) * r1}" y1="${50 + Math.sin(a) * r1}" x2="${50 + Math.cos(a) * 42}" y2="${50 + Math.sin(a) * 42}"/>`;
    }).join('');
    const countEl = $('.loader-count span');
    const first = slides[0];
    const fontReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const imgReady = first.complete ? Promise.resolve() : new Promise((res) => { first.onload = first.onerror = res; });
    let shown = 0;
    let target = 30;
    const tick = () => {
      shown += (target - shown) * 0.12;
      countEl.textContent = Math.round(shown);
      if (shown < 99.5) requestAnimationFrame(tick);
      else countEl.textContent = '100';
    };
    requestAnimationFrame(tick);
    fontReady.then(() => (target = Math.max(target, 60)));
    const done = () => {
      target = 100;
      setTimeout(() => {
        $('.loader').classList.add('done');
        document.body.classList.add('is-ready');
        $$('.hero-title .split').forEach((n) => n.classList.add('is-in'));
        $('.hero-topo svg').classList.add('drawn');
        showSlide(0);
        route();
      }, reduce ? 0 : 450);
    };
    Promise.race([Promise.all([imgReady, fontReady]), new Promise((r) => setTimeout(r, 3500))]).then(done);
  })();
  $$('.hero-title .split').forEach((n, k) => splitLetters(n, 300 + k * 260));

  /* ---------------------------------------------------------------------- */
  /* Scroll-driven bits: header, compass, trail, intro words, hero parallax  */
  /* ---------------------------------------------------------------------- */
  const header = $('.site-header');
  const rose = $('.brand-rose');
  const degEl = $('.heading-deg');
  const dirEl = $('.heading-dir');
  const heroSlides = slidesEl;
  const heroTopo = $('.hero-topo');
  const trail = $('.trail');
  const trailPath = $('.trail-path');
  const trailReveal = $('.trail-reveal');
  const walker = $('.trail-walker');
  const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  let lastY = scrollY;
  let trailLen = 0;
  let mouseX = 0;
  let mouseY = 0;
  let ticking = false;

  function buildTrail() {
    const main = $('#main');
    const w = main.clientWidth;
    const h = main.offsetHeight;
    trail.setAttribute('viewBox', `0 0 ${w} ${h}`);
    trail.style.height = h + 'px';
    const narrow = w < 720;
    const pts = [];
    const start = innerHeight * 0.92;
    for (let y = start, k = 0; y < h - 80; y += narrow ? 420 : 560, k++) {
      const swing = narrow ? [0.94, 0.06] : [0.9, 0.08, 0.5, 0.94, 0.03];
      pts.push([w * swing[k % swing.length], y]);
    }
    pts.push([w * 0.5, h - 40]);
    // Catmull-Rom → cubic Bézier for a soft wandering line
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
    }
    trailPath.setAttribute('d', d);
    trailReveal.setAttribute('d', d);
    trailLen = trailPath.getTotalLength();
    // keep dash size constant in px regardless of path length
    trailPath.style.strokeDasharray = `${6 / trailLen} ${10 / trailLen}`;
  }

  function onScroll() {
    ticking = false;
    const y = scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const prog = y / max;

    header.classList.toggle('scrolled', y > 40);
    header.classList.toggle('hide', y > lastY && y > innerHeight * 0.8 && !root.classList.contains('menu-open'));

    const deg = Math.round(prog * 360) % 360;
    rose.style.transform = `rotate(${-prog * 360}deg)`;
    degEl.textContent = pad(deg, 3) + '°';
    dirEl.textContent = DIRS[Math.round(deg / 22.5) % 16];

    // Hero parallax
    if (y < innerHeight * 1.2 && !reduce) {
      heroSlides.style.transform = `translate3d(0, ${y * 0.35}px, 0)`;
      heroTopo.style.transform = `translate3d(${mouseX * -18}px, ${y * 0.15 + mouseY * -12}px, 0) rotate(${y * 0.01}deg)`;
    }

    // Trail draw
    if (trailLen) {
      const main = $('#main');
      const top = main.getBoundingClientRect().top + y;
      const head = y + innerHeight * 0.62 - top;
      const t = Math.min(1, Math.max(0, head / main.offsetHeight));
      // Map document depth to path length roughly by y-position search
      const L = findLengthAtY(head);
      trailReveal.style.strokeDashoffset = 1 - L / trailLen;
      const p = trailPath.getPointAtLength(L);
      walker.setAttribute('transform', `translate(${p.x} ${p.y})`);
      walker.style.opacity = t > 0.001 && L > 2 ? 1 : 0;
    }

    // Intro words
    const r = intro.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
    const lit = Math.round(k * words.length);
    words.forEach((w, i) => w.classList.toggle('lit', i < lit));

    // Marquee speeds up with scroll velocity
    const v = Math.abs(y - lastY);
    marqueeBoost = Math.min(8, Math.max(marqueeBoost, 1 + v / 10));
    lastY = y;
  }
  // binary search the path for the point at a given y (path is monotonic in y)
  function findLengthAtY(y) {
    let lo = 0;
    let hi = trailLen;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (trailPath.getPointAtLength(mid).y < y) lo = mid; else hi = mid;
    }
    return lo;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  let marqueeBoost = 1;
  let marqueeRate = 1;
  const marqueeAnims = () => tracks.flatMap((t) => t.getAnimations());
  (function marqueeLoop() {
    if (!reduce) {
      marqueeBoost += (1 - marqueeBoost) * 0.04;
      marqueeRate += (marqueeBoost - marqueeRate) * 0.15;
      marqueeAnims().forEach((a) => (a.playbackRate = marqueeRate));
    }
    requestAnimationFrame(marqueeLoop);
  })();

  addEventListener('mousemove', (e) => {
    mouseX = e.clientX / innerWidth - 0.5;
    mouseY = e.clientY / innerHeight - 0.5;
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  let resizeT;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { buildTrail(); onScroll(); if (LB.open) layoutLB(false); }, 150);
  });
  // Rebuild the trail when lazy images change page height
  new ResizeObserver(() => { clearTimeout(resizeT); resizeT = setTimeout(() => { buildTrail(); onScroll(); }, 200); }).observe($('#main'));

  // Count-up stats
  const statIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    statIO.unobserve(e.target);
    const end = +e.target.dataset.count;
    const t0 = performance.now();
    const dur = reduce ? 1 : 1600;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      e.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  statEls.forEach((n) => statIO.observe(n));

  /* ---------------------------------------------------------------------- */
  /* Smooth jumps between sections                                           */
  /* ---------------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goto]');
    if (!g) return;
    e.preventDefault();
    const wasOpen = root.classList.contains('menu-open');
    if (wasOpen) toggleMenu(false);
    if (location.hash && location.hash !== '#/') { history.replaceState(null, '', '#/'); route(); }
    const target = document.getElementById(g.dataset.goto);
    setTimeout(() => window.scrollTo({ top: target.offsetTop - (g.dataset.goto === 'top' ? 0 : 20), behavior: reduce ? 'auto' : 'smooth' }), wasOpen ? 450 : 0);
  });

  /* ---------------------------------------------------------------------- */
  /* Menu                                                                    */
  /* ---------------------------------------------------------------------- */
  const menuBtn = $('.menu-btn');
  const menu = $('.menu');
  const preview = $('.menu-preview');
  function toggleMenu(open = !root.classList.contains('menu-open')) {
    root.classList.toggle('menu-open', open);
    root.classList.toggle('lock', open || panelOpen || LB.open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.querySelector('.menu-btn-label').textContent = open ? 'Close' : 'Menu';
    menu.setAttribute('aria-hidden', !open);
    if (open) { $('.menu-topo svg').classList.add('drawn'); }
    else { preview.classList.remove('on'); }
  }
  menuBtn.addEventListener('click', () => toggleMenu());
  $$('.menu-projects a').forEach((a) => {
    a.addEventListener('click', () => toggleMenu(false));
    if (!fine) return;
    a.addEventListener('mouseenter', () => {
      const p = sets[a.dataset.slug];
      preview.src = src(p.slug, p.cover);
      preview.classList.add('on');
    });
    a.addEventListener('mouseleave', () => preview.classList.remove('on'));
  });
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;
  menu.addEventListener('mousemove', (e) => { tx = e.clientX + 170; ty = e.clientY; });
  (function previewLoop() {
    requestAnimationFrame(previewLoop);
    if (!root.classList.contains('menu-open')) return;
    px += (tx - px) * 0.14;
    py += (ty - py) * 0.14;
    const rot = Math.max(-10, Math.min(10, (tx - px) * 0.05));
    preview.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%) rotate(${rot - 3}deg)`;
  })();

  /* ---------------------------------------------------------------------- */
  /* Custom cursor                                                           */
  /* ---------------------------------------------------------------------- */
  if (fine) {
    const cur = $('.cursor');
    const lab = $('.cursor-label');
    cur.classList.add('hidden'); // until the mouse actually moves
    let cx = innerWidth / 2;
    let cy = innerHeight / 2;
    let x = cx;
    let y = cy;
    addEventListener('mousemove', (e) => { cx = e.clientX; cy = e.clientY; cur.classList.remove('hidden'); }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.add('hidden'));
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-cursor]');
      const show = t && !LB.open;
      cur.classList.toggle('label', !!show);
      if (show) lab.textContent = t.dataset.cursor;
    });
    (function loop() {
      x += (cx - x) * 0.2;
      y += (cy - y) * 0.2;
      cur.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------------------------------------------------------------- */
  /* Project panel                                                           */
  /* ---------------------------------------------------------------------- */
  const panel = $('.panel');
  const panelScroll = $('.panel-scroll');
  const panelBar = $('.panel-bar');
  let panelOpen = null;
  let panelPushed = false;
  let pendingFrom = null;

  function ytId(url) { return /[?&]v=([\w-]+)/.exec(url)?.[1]; }

  function renderPanel(p) {
    const idx = S.projects.indexOf(p);
    const next = S.projects[(idx + 1) % S.projects.length];
    const facts = [['Type', p.kind], ['Frames', pad(p.images.length)]];
    if (p.region) facts.push(['Where', p.region]);
    if (p.facts?.length) facts.push(['Notes', p.facts.join(' · ')]);
    const blurb = p.blurb.length
      ? `<div class="p-blurb">${p.blurb.map((t) => `<p>${esc(t)}</p>`).join('')}</div>`
      : `<div class="p-blurb empty"><p>${esc(p.images.length)} frames. No words needed &mdash; tap any photo to step through the set.</p></div>`;
    const yt = p.video ? ytId(p.video) : null;
    const video = yt
      ? `<button class="video" data-yt="${yt}" aria-label="Play the ${esc(p.short)} film"><img src="${src(p.slug, p.images[0].id, 'l')}" alt="" loading="lazy"><span class="play"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></span><span class="vlabel">Watch the film ▸ YouTube</span></button>`
      : '';
    const words = p.title.split(' ').map((w) => `<span class="word"><span class="split">${esc(w)}</span></span>`).join(' ');
    return `<div class="pc">
      <header class="p-hero">
        <div class="p-hero-media"><img src="${src(p.slug, p.cover, 'l')}" alt=""></div>
        <div class="ph-topo"><svg></svg></div>
        <div class="p-hero-text">
          <p class="eyebrow">${pad(idx + 1)} / ${pad(S.projects.length)} &nbsp;·&nbsp; ${esc(p.kind)}</p>
          <h2 class="p-title">${words}</h2>
          ${p.region && !p.title.includes(p.region) ? `<p class="p-region">${esc(p.region)}</p>` : ''}
        </div>
      </header>
      <section class="p-info">
        <dl class="p-facts reveal">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <div class="reveal" style="--d:120ms">${blurb}${video}</div>
      </section>
      <div class="tiles masonry p-tiles">${p.images.map((im, i) => tileHTML(p.slug, im, i, p.images.length)).join('')}</div>
      <a class="next-link" href="#/p/${next.slug}" data-next data-cursor="Next">
        <img src="${src(next.slug, next.cover)}" alt="" loading="lazy">
        <span class="nl-text"><span class="eyebrow">Next expedition — ${pad(S.projects.indexOf(next) + 1)}</span><span class="nl-title">${esc(next.short)} <i>→</i></span></span>
      </a>
    </div>`;
  }

  function openPanel(slug) {
    const p = sets[slug];
    if (panelOpen === slug) return;
    const swap = !!panelOpen;
    const fill = () => {
      panelScroll.innerHTML = renderPanel(p);
      panelScroll.scrollTop = 0;
      $('.panel-num').textContent = `${pad(S.projects.indexOf(p) + 1)} / ${pad(S.projects.length)}`;
      $('.panel-name').textContent = p.title;
      panel.setAttribute('aria-label', p.title);
      const t = topo($('.ph-topo svg', panelScroll), { seed: 100 + S.projects.indexOf(p) * 7, hills: 2, rings: 10 });
      $$('.p-title .split', panelScroll).forEach((n, k) => splitLetters(n, 350 + k * 140));
      hookTiles(panelScroll);
      $$('.reveal', panelScroll).forEach(watch);
      setTimeout(() => { $$('.p-title .split', panelScroll).forEach((n) => n.classList.add('is-in')); t.classList.add('drawn'); }, swap ? 50 : 200);
      onPanelScroll();
    };
    if (swap) {
      const pc = $('.pc', panelScroll);
      pc.classList.add('out');
      setTimeout(fill, 300);
    } else fill();
    panelOpen = slug;
    root.classList.add('panel-open', 'lock');
    panel.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('.panel-close').focus({ preventScroll: true }), 400);
  }
  function closePanel() {
    if (!panelOpen) return;
    const slug = panelOpen;
    panelOpen = null;
    root.classList.remove('panel-open');
    if (!LB.open && !root.classList.contains('menu-open')) root.classList.remove('lock');
    panel.setAttribute('aria-hidden', 'true');
    const card = $(`.card[data-slug="${slug}"]`);
    if (card) card.focus({ preventScroll: true });
  }
  function onPanelScroll() {
    const st = panelScroll.scrollTop;
    const max = Math.max(1, panelScroll.scrollHeight - panelScroll.clientHeight);
    $('.panel-progress').style.transform = `scaleX(${st / max})`;
    panelBar.classList.toggle('solid', st > innerHeight * 0.5);
    const media = $('.p-hero-media', panelScroll);
    if (media && st < innerHeight && !reduce) media.style.transform = `translate3d(0, ${st * 0.4}px, 0)`;
  }
  panelScroll.addEventListener('scroll', onPanelScroll, { passive: true });
  $('.panel-close').addEventListener('click', () => leave('panel'));
  $('.scrim').addEventListener('click', () => leave('panel'));
  panelScroll.addEventListener('click', (e) => {
    const v = e.target.closest('.video');
    if (v) {
      v.outerHTML = `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${v.dataset.yt}?autoplay=1&rel=0" title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
      return;
    }
    const n = e.target.closest('[data-next]');
    if (n) { e.preventDefault(); history.replaceState(null, '', n.getAttribute('href')); route(); }
  });

  // Swipe right from the left edge of the panel to close it on touch screens
  (function panelSwipe() {
    let sx = 0;
    let sy = 0;
    let dx = 0;
    let active = false;
    panel.addEventListener('touchstart', (e) => {
      if (LB.open) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0;
      active = sx < 40;
    }, { passive: true });
    panel.addEventListener('touchmove', (e) => {
      if (!active) return;
      dx = e.touches[0].clientX - sx;
      if (Math.abs(e.touches[0].clientY - sy) > Math.abs(dx)) { active = false; panel.style.transform = ''; return; }
      if (dx > 0) { panel.style.transition = 'none'; panel.style.transform = `translateX(${dx}px)`; }
    }, { passive: true });
    panel.addEventListener('touchend', () => {
      if (!active) return;
      panel.style.transition = '';
      panel.style.transform = '';
      if (dx > 90) leave('panel');
      active = false;
    });
  })();

  /* ---------------------------------------------------------------------- */
  /* Lightbox                                                                */
  /* ---------------------------------------------------------------------- */
  const lb = $('.lb');
  const lbImg = $('.lb-img');
  const lbThumbs = $('.lb-thumbs');
  const LB = { open: false, slug: null, list: [], i: 0, pushed: false };

  function lbList(slug) { return slug === 'portfolio' ? galleryOrder : sets[slug].images; }
  function fit(img) {
    const narrow = innerWidth < 720;
    const top = narrow ? 64 : 76;
    const bottom = narrow ? 120 : 130;
    const side = narrow ? 0 : Math.max(90, innerWidth * 0.06);
    const aw = innerWidth - side * 2;
    const ah = innerHeight - top - bottom;
    const s = Math.min(aw / img.w, ah / img.h);
    const w = img.w * s;
    const h = img.h * s;
    return { left: (innerWidth - w) / 2, top: top + (ah - h) / 2, width: w, height: h };
  }
  function place(box) {
    Object.assign(lbImg.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
  }
  function fromRect(rect, box) {
    const s = rect.width / box.width;
    const dy = rect.top + rect.height / 2 - (box.top + (box.height * s) / 2);
    return `translate(${rect.left - box.left}px, ${dy}px) scale(${s})`;
  }
  function setImage(load = true) {
    const img = LB.list[LB.i];
    const small = src(LB.slug, img.id, 's');
    const large = src(LB.slug, img.id, 'l');
    lbImg.src = small;
    lbImg.alt = img.caption || `${sets[LB.slug].title} — frame ${LB.i + 1}`;
    if (load) {
      const L = new Image();
      L.src = large;
      const want = LB.i;
      const slug = LB.slug;
      (L.decode ? L.decode() : Promise.resolve()).then(() => { if (LB.open && LB.i === want && LB.slug === slug) lbImg.src = large; }).catch(() => {});
      // warm up neighbours
      [1, -1].forEach((d) => { const n = LB.list[(LB.i + d + LB.list.length) % LB.list.length]; new Image().src = src(LB.slug, n.id, 'l'); });
    }
    $('.lb-count').textContent = `${pad(LB.i + 1, 3)} / ${pad(LB.list.length, 3)}`;
    $('.lb-title').textContent = sets[LB.slug].short || sets[LB.slug].title;
    $('.lb-cap').textContent = img.caption || '';
    $$('button', lbThumbs).forEach((b, k) => b.classList.toggle('on', k === LB.i));
    const on = lbThumbs.children[LB.i];
    if (on) lbThumbs.scrollTo({ left: on.offsetLeft - lbThumbs.clientWidth / 2 + on.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
  }
  function layoutLB(animate) {
    const box = fit(LB.list[LB.i]);
    if (!animate) lbImg.classList.add('drag');
    place(box);
    lbImg.style.transform = '';
    if (!animate) { void lbImg.offsetWidth; lbImg.classList.remove('drag'); }
    return box;
  }
  function findThumb(slug, id) {
    const scope = panelOpen ? panelScroll : document;
    const t = $(`.tile[data-key="${slug}/${id}"] img`, scope);
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.width ? t : null;
  }
  function openLB(slug, id, from) {
    const list = lbList(slug);
    const i = Math.max(0, list.findIndex((im) => im.id === id));
    if (LB.open && LB.slug === slug) { go(i - LB.i, i); return; }
    LB.open = true;
    LB.slug = slug;
    LB.list = list;
    LB.i = i;
    lbThumbs.innerHTML = list.map((im, k) => `<button aria-label="Photo ${k + 1}"><img src="${src(slug, im.id)}" alt="" loading="lazy"></button>`).join('');
    setImage();
    lb.classList.add('open', 'ui');
    lb.setAttribute('aria-hidden', 'false');
    root.classList.add('lock');
    lb.style.setProperty('--bg-o', 1);
    const box = fit(list[i]);
    place(box);
    const origin = from || findThumb(slug, id);
    lbImg.classList.add('drag');
    if (origin && !reduce) {
      lbImg.style.opacity = 1;
      lbImg.style.transform = fromRect(origin.getBoundingClientRect(), box);
    } else {
      lbImg.style.opacity = 0;
      lbImg.style.transform = 'scale(.94)';
    }
    void lbImg.offsetWidth;
    lbImg.classList.remove('drag');
    lbImg.style.transform = '';
    lbImg.style.opacity = 1;
    $('.cursor')?.classList.remove('label');
    setTimeout(() => $('.lb-close').focus({ preventScroll: true }), 50);
  }
  function closeLB() {
    if (!LB.open) return;
    const img = LB.list[LB.i];
    const t = findThumb(LB.slug, img.id);
    const box = fit(img);
    if (t && !reduce) lbImg.style.transform = fromRect(t.getBoundingClientRect(), box);
    else { lbImg.style.opacity = 0; lbImg.style.transform = 'scale(.94)'; }
    lb.classList.remove('ui');
    lb.style.setProperty('--bg-o', 0);
    LB.open = false;
    setTimeout(() => {
      if (LB.open) return;
      lb.classList.remove('open');
      lb.setAttribute('aria-hidden', 'true');
      lbImg.removeAttribute('src');
      lb.style.removeProperty('--bg-o');
    }, reduce ? 0 : 600);
    if (!panelOpen && !root.classList.contains('menu-open')) root.classList.remove('lock');
  }
  function lbHash() {
    const id = LB.list[LB.i].id;
    return LB.slug === 'portfolio' ? `#/g/${id}` : `#/p/${LB.slug}/${id}`;
  }
  let going = false;
  function go(d, absolute) {
    if (!LB.open || going || !d) return;
    const n = LB.list.length;
    const target = absolute ?? (LB.i + d + n) % n;
    const dir = Math.sign(d);
    going = true;
    lbImg.style.transform = `translateX(${-dir * 60}px)`;
    lbImg.style.opacity = 0;
    setTimeout(() => {
      LB.i = target;
      setImage();
      const box = fit(LB.list[LB.i]);
      lbImg.classList.add('drag');
      place(box);
      lbImg.style.transform = `translateX(${dir * 60}px)`;
      void lbImg.offsetWidth;
      lbImg.classList.remove('drag');
      lbImg.style.transform = '';
      lbImg.style.opacity = 1;
      history.replaceState(null, '', lbHash());
      going = false;
    }, reduce ? 0 : 200);
  }
  $('.lb-nav.prev').addEventListener('click', () => go(-1));
  $('.lb-nav.next').addEventListener('click', () => go(1));
  $('.lb-close').addEventListener('click', () => leave('lb'));
  lbThumbs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) go([...lbThumbs.children].indexOf(b) - LB.i, [...lbThumbs.children].indexOf(b));
  });

  // Drag / swipe: left-right to navigate, pull down to close, tap to toggle UI
  (function lbDrag() {
    const stage = $('.lb-stage');
    let sx = 0;
    let sy = 0;
    let dx = 0;
    let dy = 0;
    let down = false;
    let axis = null;
    let onImg = false;
    let wheelAt = 0;
    stage.addEventListener('pointerdown', (e) => {
      if (!LB.open) return;
      onImg = e.target === lbImg;
      down = true; axis = null; sx = e.clientX; sy = e.clientY; dx = dy = 0;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!down) return;
      dx = e.clientX - sx;
      dy = e.clientY - sy;
      if (!axis && Math.hypot(dx, dy) > 8) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (!axis) return;
      lbImg.classList.add('drag');
      if (axis === 'x') lbImg.style.transform = `translateX(${dx}px) rotate(${dx * 0.01}deg)`;
      else {
        const pull = Math.max(0, dy);
        lbImg.style.transform = `translateY(${pull}px) scale(${1 - Math.min(0.25, pull / 1200)})`;
        lb.style.setProperty('--bg-o', Math.max(0.2, 1 - pull / 400));
      }
    });
    const end = (e) => {
      if (!down) return;
      down = false;
      lbImg.classList.remove('drag');
      lb.style.setProperty('--bg-o', 1);
      if (!axis) {
        // tap: background closes, photo toggles the chrome
        if (onImg) lb.classList.toggle('ui');
        else leave('lb');
        return;
      }
      if (axis === 'x' && Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      else if (axis === 'y' && dy > 110) leave('lb');
      else lbImg.style.transform = '';
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) < 30 || Math.abs(e.deltaX) < Math.abs(e.deltaY) || performance.now() - wheelAt < 600) return;
      wheelAt = performance.now();
      go(e.deltaX > 0 ? 1 : -1);
    }, { passive: true });
  })();

  /* ---------------------------------------------------------------------- */
  /* Router: #/p/<slug>[/<id>]  ·  #/g/<id>                                   */
  /* ---------------------------------------------------------------------- */
  function parse() {
    const h = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (h[0] === 'p' && sets[h[1]] && h[1] !== 'portfolio') return { panel: h[1], lb: h[2] ? { slug: h[1], id: h[2] } : null };
    if (h[0] === 'g' && h[1]) return { panel: null, lb: { slug: 'portfolio', id: h[1] } };
    return { panel: null, lb: null };
  }
  function route() {
    const st = parse();
    if (st.panel) openPanel(st.panel); else closePanel();
    if (st.lb && imgOf(st.lb.slug, st.lb.id)) openLB(st.lb.slug, st.lb.id, pendingFrom);
    else closeLB();
    pendingFrom = null;
    if (!st.panel) panelPushed = false;
    if (!st.lb) LB.pushed = false;
  }
  // Go "up" one level: pop history if we pushed it, otherwise rewrite the hash.
  function leave(layer) {
    if (layer === 'lb') {
      if (LB.pushed) { LB.pushed = false; history.back(); return; }
      history.replaceState(null, '', panelOpen ? `#/p/${panelOpen}` : '#/');
    } else {
      if (panelPushed && !LB.open) { panelPushed = false; history.back(); return; }
      history.replaceState(null, '', '#/');
    }
    route();
  }
  // Intercept in-page links so we know which layer we pushed (for back-button behaviour)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const href = a.getAttribute('href');
    if (href === '#/') {
      e.preventDefault();
      if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
      route();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    e.preventDefault();
    if (/^#\/(g\/|p\/[^/]+\/)/.test(href)) { LB.pushed = true; pendingFrom = a.querySelector('img') || pendingFrom; }
    else panelPushed = true;
    history.pushState(null, '', href);
    route();
  });
  addEventListener('popstate', route);
  addEventListener('hashchange', route);

  // Keyboard
  addEventListener('keydown', (e) => {
    if (LB.open) {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') leave('lb');
      return;
    }
    if (e.key === 'Escape') {
      if (root.classList.contains('menu-open')) toggleMenu(false);
      else if (panelOpen) leave('panel');
    }
  });

  // Initial layout
  buildTrail();
  onScroll();
})();
