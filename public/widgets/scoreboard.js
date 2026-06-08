// public/widgets/scoreboard.js
// Embed the live YCAR leaderboard on naturalselectionar.com (or anywhere).
//
// On your Bluehost page, drop in:
//   <div id="ygtar-scoreboard"></div>
//   <script src="https://YOUR-VERCEL-APP.vercel.app/widgets/scoreboard.js"></script>

(function () {
  var API = 'https://YOUR-VERCEL-APP.vercel.app/api/leaderboard';
  var mount = document.getElementById('ygtar-scoreboard');
  if (!mount) return;

  mount.innerHTML = '<p style="font:14px sans-serif;color:#888">Loading leaderboard…</p>';

  fetch(API)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var rows = (data.standings || []).slice(0, 10).map(function (s, i) {
        return '<tr><td style="padding:6px 10px">' + (i + 1) + '</td>' +
          '<td style="padding:6px 10px">' + s.name + '</td>' +
          '<td style="padding:6px 10px;text-align:right;font-weight:600">' + s.total + '</td></tr>';
      }).join('');
      mount.innerHTML =
        '<table style="border-collapse:collapse;width:100%;font:14px sans-serif">' +
        '<thead><tr style="background:#1D9E75;color:#fff">' +
        '<th style="padding:8px 10px;text-align:left">#</th>' +
        '<th style="padding:8px 10px;text-align:left">Racer</th>' +
        '<th style="padding:8px 10px;text-align:right">CPs</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>';
    })
    .catch(function () {
      mount.innerHTML = '<p style="font:14px sans-serif;color:#c00">Leaderboard unavailable.</p>';
    });
})();
