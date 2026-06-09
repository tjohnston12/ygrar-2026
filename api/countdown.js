/* countdown.js — "Race starts in …" banner that auto-removes once the race begins.
   Drop one line on any page that has a <main>:  <script src="countdown.js"></script>
   Event start: June 13, 2026, Atlantic time. After that moment the banner disappears
   on its own and never shows again. */
(function () {
  var START = new Date('2026-06-13T00:00:00-03:00').getTime();
  var timer = null;

  function pad(n) { return String(n).padStart(2, '0'); }

  function build() {
    var existing = document.getElementById('ycar-cd');
    if (existing) return existing;
    var main = document.querySelector('main') || document.body;

    if (!document.getElementById('ycar-cd-style')) {
      var st = document.createElement('style');
      st.id = 'ycar-cd-style';
      st.textContent =
        '#ycar-cd{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;' +
          'background:linear-gradient(150deg,var(--green-soft,#E6F5EF),#fff);' +
          'border:1px solid rgba(29,158,117,.28);border-radius:var(--radius-lg,16px);' +
          'padding:16px 22px;margin-bottom:22px;transition:opacity .4s ease}' +
        '#ycar-cd .cd-l .k{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;' +
          'color:var(--green-dark,#178060)}' +
        '#ycar-cd .cd-l .d{font-size:18.5px;font-weight:800;margin-top:3px;color:var(--color-text-primary,#16201b)}' +
        '#ycar-cd .cd-clock{display:flex;gap:9px}' +
        '#ycar-cd .u{background:#fff;border:1px solid var(--color-border-tertiary,rgba(22,32,27,.08));' +
          'border-radius:var(--radius-md,11px);padding:10px 6px;min-width:58px;text-align:center}' +
        '#ycar-cd .u .n{font-size:26px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1;' +
          'color:var(--color-text-primary,#16201b)}' +
        '#ycar-cd .u .l{font-size:9.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;' +
          'color:var(--color-text-tertiary,#6a786f);margin-top:6px}';
      document.head.appendChild(st);
    }

    var el = document.createElement('div');
    el.id = 'ycar-cd';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<div class="cd-l">' +
        '<div class="k"><i class="ti ti-flag-2" style="vertical-align:-2px"></i> Race starts in</div>' +
        '<div class="d">June 13, 2026 \u00b7 Hike \u00b7 Bike \u00b7 Paddle</div>' +
      '</div>' +
      '<div class="cd-clock">' +
        '<div class="u"><div class="n" id="cd-d">--</div><div class="l">Days</div></div>' +
        '<div class="u"><div class="n" id="cd-h">--</div><div class="l">Hrs</div></div>' +
        '<div class="u"><div class="n" id="cd-m">--</div><div class="l">Min</div></div>' +
        '<div class="u"><div class="n" id="cd-s">--</div><div class="l">Sec</div></div>' +
      '</div>';
    main.insertBefore(el, main.firstChild);
    return el;
  }

  function remove() {
    if (timer) { clearInterval(timer); timer = null; }
    var el = document.getElementById('ycar-cd');
    if (el) {
      el.style.opacity = '0';
      setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 440);
    }
  }

  function init() {
    if (Date.now() >= START) { remove(); return; } // race already underway — show nothing
    build();
    function tick() {
      var diff = START - Date.now();
      if (diff <= 0) { remove(); return; }
      document.getElementById('cd-d').textContent = Math.floor(diff / 86400000);
      document.getElementById('cd-h').textContent = pad(Math.floor((diff % 86400000) / 3600000));
      document.getElementById('cd-m').textContent = pad(Math.floor((diff % 3600000) / 60000));
      document.getElementById('cd-s').textContent = pad(Math.floor((diff % 60000) / 1000));
    }
    tick();
    timer = setInterval(tick, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
