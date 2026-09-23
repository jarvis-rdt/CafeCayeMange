/* ============================================================
   Café Caye Mangé · main.js
   Navigation, mobile menu, scroll reveals, stat counters,
   menu tabs, and open-today highlighting.
   ============================================================ */
(function () {
  'use strict';

  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  /* ── Nav: solid background once scrolled ── */
  var nav = document.querySelector('.nav');
  function onScroll() {
    if (!nav) return;
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile burger menu ── */
  var burger = document.querySelector('.nav__burger');
  var mobileNav = document.querySelector('.nav__mobile');
  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Scroll reveal ── */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ── Animated stat counters (stats bar on home page) ── */
  var counters = document.querySelectorAll('.stats-item__num[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        cio.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  }
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var start = null;
    var duration = 1400;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ── Menu page tabs ── */
  var tabs = document.querySelectorAll('.menu-tab');
  var categories = document.querySelectorAll('.menu-category');
  if (tabs.length && categories.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-target');
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        categories.forEach(function (c) {
          c.classList.toggle('active', c.id === target);
        });
        var wrap = document.getElementById('menu-categories');
        if (wrap && window.innerWidth < 820) {
          var top = wrap.getBoundingClientRect().top + window.scrollY - 90;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });
    /* Deep link support: menu.html#desserts etc. */
    if (window.location.hash) {
      var hashId = window.location.hash.slice(1);
      var linked = document.getElementById(hashId);
      var linkedTab = hashId && document.querySelector('.menu-tab[data-target="' + hashId + '"]');
      if (linked && linkedTab) linkedTab.click();
    }
  }

  /* ── Highlight today's hours row ── */
  var today = DAYS[new Date().getDay()];
  document.querySelectorAll('.hours-row[data-day]').forEach(function (row) {
    if (row.getAttribute('data-day') === today) row.classList.add('today');
  });
  /* Footer hours: mark open days for subtle emphasis */
  document.querySelectorAll('[data-hours-footer] .footer__hours-row').forEach(function (row) {
    var dayText = row.querySelector('span');
    if (dayText && dayText.textContent && dayText.textContent.indexOf(today.charAt(0).toUpperCase() + today.slice(1)) !== -1) {
      row.classList.add('today');
    }
  });
})();
