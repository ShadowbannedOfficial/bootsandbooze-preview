/* ==========================================================================
   BOOTS & BOOZE — site behaviour
   No libraries. Everything degrades to a working static page.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     HOURS — single source of truth.
     Minutes from midnight; close may exceed 1440 when the night runs past
     12 AM. Index matches JS getDay(): 0 Sun … 6 Sat.
     Authoritative set supplied by the client (see visit page + footer).
     --------------------------------------------------------------------- */
  var HOURS = [
    { dow: 0, name: 'Sunday',    open: 11 * 60, close: 24 * 60 }, // 11 AM – 12 AM
    { dow: 1, name: 'Monday',    open: 16 * 60, close: 24 * 60 }, // 4 PM – 12 AM
    { dow: 2, name: 'Tuesday',   open: 16 * 60, close: 24 * 60 },
    { dow: 3, name: 'Wednesday', open: 16 * 60, close: 26 * 60 }, // 4 PM – 2 AM
    { dow: 4, name: 'Thursday',  open: 16 * 60, close: 26 * 60 },
    { dow: 5, name: 'Friday',    open: 16 * 60, close: 26 * 60 },
    { dow: 6, name: 'Saturday',  open: 11 * 60, close: 26 * 60 }
  ];

  /* Clock reading in America/Chicago, independent of the visitor's zone. */
  function chicagoNow() {
    var parts;
    try {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(new Date());
    } catch (e) {
      // Very old browser without timeZone support: fall back to local clock.
      var d = new Date();
      return { dow: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() };
    }
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var names = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var h = parseInt(map.hour, 10) % 24; // some engines emit "24" at midnight
    var m = parseInt(map.minute, 10);
    return { dow: names[map.weekday], mins: h * 60 + m };
  }

  function fmt(min) {
    var m = min % (24 * 60);
    var h = Math.floor(m / 60);
    var mm = m % 60;
    var h12 = h % 12 === 0 ? 12 : h % 12;
    var ap = h < 12 || h === 24 ? 'AM' : 'PM';
    return h12 + (mm ? ':' + (mm < 10 ? '0' + mm : mm) : '') + ' ' + ap;
  }

  /* Returns {open:bool, until:string|null, nextLabel:string|null} */
  function status() {
    var now = chicagoNow();
    var today = HOURS[now.dow];
    var yest = HOURS[(now.dow + 6) % 7];

    // Inside today's window?
    if (now.mins >= today.open && now.mins < today.close) {
      return { open: true, until: fmt(today.close), nextLabel: null };
    }
    // Spillover from last night (a 2 AM close is really part of yesterday).
    if (yest.close > 1440 && now.mins < (yest.close - 1440)) {
      return { open: true, until: fmt(yest.close), nextLabel: null };
    }
    // Not open. Next opening is later today, or tomorrow, or the day after.
    if (now.mins < today.open) {
      return { open: false, until: null, nextLabel: 'Opens at ' + fmt(today.open), nextShort: 'Closed' };
    }
    var nxt = HOURS[(now.dow + 1) % 7];
    return { open: false, until: null, nextLabel: 'Opens tomorrow at ' + fmt(nxt.open), nextShort: 'Closed' };
  }

  function paintStatus() {
    var s = status();
    var pills = document.querySelectorAll('[data-open-pill]');
    for (var i = 0; i < pills.length; i++) {
      var pill = pills[i];
      var longEl = pill.querySelector('.pill__txt--long');
      var shortEl = pill.querySelector('.pill__txt--short');
      pill.classList.toggle('is-open', !!s.open);
      pill.hidden = false;
      if (longEl) longEl.textContent = s.open ? 'Open now — until ' + s.until : (s.nextLabel || 'Closed');
      if (shortEl) shortEl.textContent = s.open ? 'Open' : 'Closed';
      pill.setAttribute('aria-label', s.open
        ? 'Open now, closing at ' + s.until + ' Central time'
        : (s.nextLabel || 'Closed') + ' Central time');
    }

    // Highlight today in any hours table
    var now = chicagoNow();
    var rows = document.querySelectorAll('[data-hours-day]');
    for (var r = 0; r < rows.length; r++) {
      rows[r].classList.toggle('is-today', parseInt(rows[r].getAttribute('data-hours-day'), 10) === now.dow);
    }
  }

  /* ---------------------------------------------------------------------
     Header: solid on scroll
     --------------------------------------------------------------------- */
  function initHeader() {
    var hdr = document.querySelector('.hdr');
    if (!hdr) return;
    var onScroll = function () {
      hdr.classList.toggle('is-stuck', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------------
     Mobile nav
     --------------------------------------------------------------------- */
  function initNav() {
    var btn = document.querySelector('.burger');
    var panel = document.querySelector('.mnav');
    if (!btn || !panel) return;
    var setOpen = function (open) {
      document.body.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    };
    setOpen(false);
    btn.addEventListener('click', function () {
      setOpen(!document.body.classList.contains('nav-open'));
    });
    panel.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* ---------------------------------------------------------------------
     Scroll reveals
     --------------------------------------------------------------------- */
  function initReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    for (var j = 0; j < els.length; j++) io.observe(els[j]);
  }

  /* ---------------------------------------------------------------------
     Background video
     Decorative loops inside .hero__bg / .phero__bg / .band__bg. The markup
     ships with autoplay so a browser that never runs this file still gets the
     loop, which means every path that decides NOT to play has to strip the
     attribute as well as pause — leaving autoplay on would play it regardless.
     The poster is the real content; the video only ever decorates it.
     --------------------------------------------------------------------- */
  function initBgVideo() {
    var vids = document.querySelectorAll('.hero__bg video, .phero__bg video, .band__bg video');
    if (!vids.length) return;

    var i;

    /* Whether to hold the poster. Spending bytes is the concern, not looks: on
       a phone over cellular a 4-6 MB background loop is real money, and the
       poster already carries the frame. Load-time check only — re-testing on
       resize risks starting a download the visitor never asked for. */
    var conn = navigator.connection;
    var thrifty = !!(conn && (conn.saveData || /2g/.test(conn.effectiveType || '')));
    var wide = window.matchMedia('(min-width: 900px)').matches;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!wide || thrifty || reduce) {
      for (i = 0; i < vids.length; i++) {
        (function (v) {
          v.removeAttribute('autoplay');
          v.pause();
          // Belt and braces: if the parser's own autoplay already started,
          // catch it and stop it rather than let it buffer.
          v.addEventListener('play', function () { v.pause(); });
        })(vids[i]);
      }
      return;
    }

    // A video that fails just leaves the poster showing. Nothing else.
    var dead = [];
    var kill = function (v) {
      return function () {
        if (dead.indexOf(v) !== -1) return;
        dead.push(v);
        v.pause();
        if (io) io.unobserve(v);
      };
    };

    var play = function (v) {
      if (dead.indexOf(v) !== -1) return;
      var p = v.play();
      if (p && typeof p.catch === 'function') p.catch(function () {}); // blocked autoplay must never throw
    };

    var io = null;
    if ('IntersectionObserver' in window) {
      // preload="none", so nothing is fetched until a slot comes near the
      // viewport; pausing it again on the way out keeps the cost to one slot.
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) play(en.target);
          else en.target.pause();
        });
      }, { rootMargin: '200px 0px' });
    }

    for (i = 0; i < vids.length; i++) {
      vids[i].addEventListener('error', kill(vids[i]));
      var srcs = vids[i].getElementsByTagName('source');
      for (var j = 0; j < srcs.length; j++) srcs[j].addEventListener('error', kill(vids[i]));
      if (io) io.observe(vids[i]);
      else play(vids[i]); // no IntersectionObserver: no way to be lazy, so play everything once
    }
  }

  /* ---------------------------------------------------------------------
     Current year
     --------------------------------------------------------------------- */
  function initYear() {
    var y = new Date().getFullYear();
    var nodes = document.querySelectorAll('[data-year]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = y;
  }

  /* ---------------------------------------------------------------------
     Forms
     No backend exists yet. If data-endpoint is filled in (Formspree or
     similar) the form POSTs normally. Until then it composes a mailto: so
     the enquiry still reaches the venue instead of vanishing.
     --------------------------------------------------------------------- */
  function initForms() {
    var forms = document.querySelectorAll('form[data-mailto]');
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        form.addEventListener('submit', function (e) {
          var endpoint = form.getAttribute('data-endpoint');
          if (endpoint) return; // real endpoint configured — let it post

          e.preventDefault();

          var to = form.getAttribute('data-mailto');
          var subject = form.getAttribute('data-subject') || 'Website enquiry';
          var lines = [];
          var fields = form.querySelectorAll('input, select, textarea');
          for (var f = 0; f < fields.length; f++) {
            var el = fields[f];
            if (!el.name || el.type === 'submit') continue;
            var label = el.getAttribute('data-label') || el.name;
            var val = (el.value || '').toString().trim();
            if (val) lines.push(label + ': ' + val);
          }
          var body = lines.join('\n') + '\n\n— Sent from bootsandboozetx.com';
          window.location.href = 'mailto:' + to +
            '?subject=' + encodeURIComponent(subject) +
            '&body=' + encodeURIComponent(body);

          var note = form.querySelector('[data-form-note]');
          if (note) {
            note.textContent = 'Opening your email app with this request filled in. If nothing happens, text us at (469) 908-8770.';
            note.hidden = false;
          }
        });
      })(forms[i]);
    }
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  function boot() {
    paintStatus();
    initHeader();
    initNav();
    initReveal();
    initBgVideo();
    initYear();
    initForms();
    // Keep the pill honest on long sessions.
    setInterval(paintStatus, 60 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) paintStatus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
