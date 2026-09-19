/* Eero Moisio — portfolio behaviour. Vanilla, ~5 kB, no dependencies. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Theme ------------------------------------------------------------ */
  var themeBtn = document.querySelector('.theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      themeBtn.setAttribute('aria-label', 'Switch to ' + (next === 'light' ? 'dark' : 'light') + ' theme');
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* --- Section router ---------------------------------------------------- */
  /* All three sections live in this one document. Switching tabs shows one and
     hides the others instead of loading a new page, so there is no reload
     flash. Without JavaScript nothing is hidden and all three simply stack. */
  var pages = [].slice.call(document.querySelectorAll('.page'));
  var navLinks = [].slice.call(document.querySelectorAll('.nav a'));
  var baseTitle = document.title;
  var TITLES = {
    projects: baseTitle,
    work: 'Work experience \u2014 Eero Moisio',
    hobbies: 'Hobbies & personal projects \u2014 Eero Moisio'
  };

  function isPage(slug) {
    for (var i = 0; i < pages.length; i++) if (pages[i].id === slug) return true;
    return false;
  }

  function show(slug, scroll) {
    if (!isPage(slug)) slug = pages[0].id;
    pages.forEach(function (p) {
      var on = p.id === slug;
      p.hidden = !on;
      if (on) {
        p.classList.remove('is-entering');
        void p.offsetWidth;          // restart the entry animation
        p.classList.add('is-entering');
      }
    });
    navLinks.forEach(function (a) {
      if (a.getAttribute('href') === '#' + slug) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = TITLES[slug] || baseTitle;
    if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
  }

  if (pages.length > 1) {
    show((location.hash || '').replace('#', ''), false);

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var slug = a.getAttribute('href').slice(1);
      if (!isPage(slug)) return;     // in-page anchors keep their normal behaviour
      e.preventDefault();
      if (location.hash !== '#' + slug) history.pushState(null, '', '#' + slug);
      show(slug, true);
    });

    window.addEventListener('popstate', function () {
      show((location.hash || '').replace('#', ''), true);
    });
  }

  /* --- Sticky header + scroll progress + hero parallax ------------------ */
  var header = document.querySelector('.site-header');
  var progress = document.querySelector('.progress');
  var heroBg = document.querySelector('.hero-bg');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;

    if (header) header.classList.toggle('is-stuck', y > 12);

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }

    if (heroBg && !reduced && y < window.innerHeight * 1.5) {
      heroBg.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(2) + 'px,0)';
    }
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* --- Scroll reveal ---------------------------------------------------- */
  var targets = document.querySelectorAll('[data-reveal]');

  // Stagger siblings so groups cascade instead of popping in together.
  var seen = new Map();
  targets.forEach(function (el) {
    var i = seen.get(el.parentNode) || 0;
    seen.set(el.parentNode, i + 1);
    el.style.setProperty('--reveal-delay', Math.min(i * 70, 350) + 'ms');
  });

  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* --- Lightbox --------------------------------------------------------- */
  var box = document.querySelector('.lightbox');
  if (!box) return;

  var stage = box.querySelector('.lightbox-stage');
  var caption = box.querySelector('.lightbox-caption');
  var fallback = box.querySelector('.lightbox-fallback');
  var lastFocus = null;

  function close() {
    box.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { stage.querySelector('img, iframe')?.remove(); }, 400);
    if (lastFocus) lastFocus.focus();
  }

  function open(tile) {
    lastFocus = tile;
    stage.querySelector('img, iframe')?.remove();

    var node;
    if (tile.dataset.video) {
      node = document.createElement('iframe');
      node.className = 'frame' + (tile.dataset.orientation === 'portrait' ? ' portrait' : '');
      node.src = 'https://www.youtube-nocookie.com/embed/' + tile.dataset.video + '?autoplay=1&rel=0';
      node.allow = 'autoplay; encrypted-media; fullscreen';
      node.allowFullscreen = true;
      // Without a referrer YouTube refuses to configure the player (error 153).
      node.referrerPolicy = 'strict-origin-when-cross-origin';
      node.title = tile.dataset.caption || 'Video';
      fallback.href = 'https://www.youtube.com/watch?v=' + tile.dataset.video;
      fallback.hidden = false;
    } else {
      node = document.createElement('img');
      node.src = tile.dataset.full;
      node.alt = tile.dataset.caption || '';
      fallback.hidden = true;
    }

    stage.insertBefore(node, caption);
    caption.textContent = tile.dataset.caption || '';
    box.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox-close').focus();
  }

  document.addEventListener('click', function (e) {
    var tile = e.target.closest('.tile');
    if (tile) { open(tile); return; }
    if (e.target.closest('.lightbox-close') || e.target === box) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && box.classList.contains('is-open')) close();
  });
})();
