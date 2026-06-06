// lib/airtable.js — thin wrapper around the Airtable SDK.
// All race data lives here: Racers, Teams, CPs, Proof Submissions,
// Photos, Swag Orders, Sponsors, Email Campaigns.

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN })
  .base(process.env.AIRTABLE_BASE_ID);

// Create a record. fields = { 'Full name': 'Jane', ... }
export async function create(table, fields) {
  const rec = await base(table).create([{ fields }]);
  return { id: rec[0].id, ...rec[0].fields };
}

// Update a record by id.
export async function update(table, id, fields) {
  const rec = await base(table).update([{ id, fields }]);
  return { id: rec[0].id, ...rec[0].fields };
}

// Find many records. filter is an Airtable formula string, e.g. "{Email}='x@y.com'".
export async function find(table, { filter, sort, max } = {}) {
  const opts = {};
  if (filter) opts.filterByFormula = filter;
  if (sort) opts.sort = sort;
  if (max) opts.maxRecords = max;
  const records = await base(table).select(opts).all();
  return records.map((r) => ({ id: r.id, ...r.fields }));
}

// Find a single record (first match) or null.
export async function findOne(table, filter) {
  const rows = await find(table, { filter, max: 1 });
  return rows[0] || null;
}

// Escape a value for safe use inside an Airtable formula string.
export function esc(value) {
  return String(value).replace(/'/g, "\\'");
}
