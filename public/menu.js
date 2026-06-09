/* YCAR mobile/tablet menu — drop-in.
   Add  <script src="menu.js"></script>  just before </body> on every page.
   Injects a hamburger into .topbar and slides .sidebar in as a drawer at <=860px.
   Reuses the existing sidebar markup, so admin-only / auth-in / auth-out logic is untouched. */
(function () {
  if (window.__ycarMenu) return;
  window.__ycarMenu = true;

  var css =
    '.ycar-burger{display:none;place-items:center;width:40px;height:40px;border-radius:11px;' +
    'border:1px solid var(--color-border-secondary);background:var(--color-background-primary);' +
    'color:var(--color-text-primary);font-size:22px;cursor:pointer;flex:none;margin-right:4px}' +
    '@media(max-width:860px){' +
      '.ycar-burger{display:inline-grid}' +
      '.sidebar{display:flex !important;position:fixed;top:0;left:0;height:100vh;width:82%;' +
        'max-width:300px;z-index:60;transform:translateX(-100%);transition:transform .22s ease;' +
        'box-shadow:0 12px 40px rgba(0,0,0,.22);overflow-y:auto}' +
      '.sidebar.open{transform:translateX(0)}' +
      '.ycar-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:50;opacity:0;' +
        'pointer-events:none;transition:opacity .22s ease}' +
      '.ycar-backdrop.open{opacity:1;pointer-events:auto}' +
    '}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function init() {
    var sidebar = document.querySelector('.sidebar');
    var topbar = document.querySelector('.topbar');
    if (!sidebar || !topbar) return; // page has no nav — nothing to do

    var backdrop = document.createElement('div');
    backdrop.className = 'ycar-backdrop';
    document.body.appendChild(backdrop);

    var burger = document.createElement('button');
    burger.className = 'ycar-burger';
    burger.setAttribute('aria-label', 'Open menu');
    burger.innerHTML = '<i class="ti ti-menu-2"></i>';
    topbar.insertBefore(burger, topbar.firstChild);

    function open() { sidebar.classList.add('open'); backdrop.classList.add('open'); }
    function close() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }

    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      sidebar.classList.contains('open') ? close() : open();
    });
    backdrop.addEventListener('click', close);
    // tap a link (or logout) -> close the drawer
    sidebar.querySelectorAll('a.navitem, [onclick]').forEach(function (el) {
      el.addEventListener('click', close);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
