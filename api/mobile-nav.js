/* mobile-nav.js — drop-in mobile/tablet menu for YCAR pages.
   Add ONE line to any page that uses the .app / .sidebar / .topbar layout:
     <script src="mobile-nav.js"></script>
   It injects a hamburger button into the existing .topbar, a tap-to-close
   backdrop, the drawer CSS, and all the toggle wiring. No other edits needed. */
(function () {
  function init() {
    var app = document.querySelector('.app');
    var topbar = document.querySelector('.topbar');
    var sidebar = document.querySelector('.sidebar');
    if (!app || !topbar || !sidebar) return;
    if (document.getElementById('mn-style')) return; // already initialised

    // --- styles (hamburger + backdrop + slide-in drawer; only active <=860px) ---
    var css =
      '@media(max-width:860px){' +
      '.mn-toggle{background:none;border:none;color:var(--color-text-primary,#16201b);' +
        'font-size:26px;line-height:1;display:grid;place-items:center;cursor:pointer;padding:4px;flex:none}' +
      '.mn-backdrop{display:none;position:fixed;inset:0;background:rgba(22,32,27,.45);z-index:49}' +
      '.app.nav-open .mn-backdrop{display:block}' +
      '.app.nav-open .sidebar{display:flex!important;position:fixed;top:0;left:0;height:100vh;' +
        'width:260px;z-index:50;overflow-y:auto;box-shadow:0 14px 40px rgba(0,0,0,.28)}' +
      'body.mn-locked{overflow:hidden}' +
      '}';
    var style = document.createElement('style');
    style.id = 'mn-style';
    style.textContent = css;
    document.head.appendChild(style);

    // --- hamburger button (prepended so it sits on the left of the topbar) ---
    var btn = document.createElement('button');
    btn.className = 'mn-toggle';
    btn.setAttribute('aria-label', 'Open menu');
    btn.innerHTML = '<i class="ti ti-menu-2"></i>';
    topbar.insertBefore(btn, topbar.firstChild);

    // spacer on the right so the logo stays centred
    var spacer = document.createElement('span');
    spacer.style.width = '34px';
    spacer.style.flex = 'none';
    topbar.appendChild(spacer);

    // --- backdrop ---
    var backdrop = document.createElement('div');
    backdrop.className = 'mn-backdrop';
    app.appendChild(backdrop);

    function open() { app.classList.add('nav-open'); document.body.classList.add('mn-locked'); }
    function close() { app.classList.remove('nav-open'); document.body.classList.remove('mn-locked'); }
    function toggle() { app.classList.contains('nav-open') ? close() : open(); }

    btn.addEventListener('click', toggle);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    // close after tapping any nav link
    sidebar.querySelectorAll('a.navitem').forEach(function (a) {
      a.addEventListener('click', close);
    });
    // safety: if the window grows back to desktop, drop the open state
    window.addEventListener('resize', function () { if (window.innerWidth > 860) close(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
