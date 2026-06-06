// lib/cors.js — lets your Bluehost marketing site embed the public widgets
// (scoreboard, photo of the week) by fetching from these API endpoints.

export function allowCors(res) {
  // Public read-only widgets, so '*' is fine. Lock to your domain if you prefer:
  // res.setHeader('Access-Control-Allow-Origin', 'https://naturalselectionar.com');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
