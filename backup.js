#!/usr/bin/env node
// backup.js — weekly local backup of the Grassy Hill Supabase data.
//
// Writes ..\secrets\grassy-hill\backups\YYYY-MM-DD\ : one .json per table,
// schema.sql + schema-openapi.json, and manifest.json.
//
// Contains no secrets: the URL and publishable key below are already public in
// index.html. The secret key is read from the secrets folder only to fetch the
// schema, and only if it is there; without it the data backup still runs.
//
// Never deletes anything. Old backups accumulate (they are ~100 KB each).
// Exit codes: 0 ok, 2 project paused/unreachable (nothing written), 1 failed.

const fs = require('fs');
const path = require('path');

const URL_BASE = 'https://lackcooiarpahgmkrpeu.supabase.co';
const PUB_KEY = 'sb_publishable_rZhPx_Mkcx9lNG0lrfLJZg_yzqV9ukZ';
const TABLES = ['players', 'rounds', 'round_groups', 'settings']; // FK order for restore
const SECRETS = path.resolve(__dirname, '..', 'secrets', 'grassy-hill');
const OUT_ROOT = path.join(SECRETS, 'backups');
const PAGE = 1000;

const stamp = new Date().toISOString();
const day = stamp.slice(0, 10);

function log(line) {
  const msg = stamp + ' ' + line;
  console.log(msg);
  try {
    fs.mkdirSync(OUT_ROOT, { recursive: true });
    fs.appendFileSync(path.join(OUT_ROOT, 'backup.log'), msg + '\n');
  } catch { /* logging must never be the thing that fails the run */ }
}

function headers(key) {
  return { apikey: key, Authorization: 'Bearer ' + key };
}

// One request. Returns {status, contentRange, text} or throws on network failure.
async function get(pathAndQuery, key, extra) {
  const res = await fetch(URL_BASE + pathAndQuery, {
    headers: Object.assign({}, headers(key), extra || {}),
    signal: AbortSignal.timeout(30000),
  });
  return {
    status: res.status,
    contentRange: res.headers.get('content-range'),
    text: await res.text(),
  };
}

// Is the project actually answering? A paused project has no DNS at all;
// a waking one answers 521/503/404 before it is ready.
async function reachable() {
  try {
    const r = await get('/rest/v1/' + TABLES[0] + '?select=id&limit=1', PUB_KEY);
    if (r.status === 200) return { ok: true };
    return { ok: false, why: 'HTTP ' + r.status };
  } catch (e) {
    const why = e.name === 'TimeoutError' ? 'timed out' : ((e.cause && e.cause.code) || e.message);
    return { ok: false, why: why };
  }
}

// Every row of one table, paged, plus the server's own exact count to check against.
async function fetchTable(table) {
  const rows = [];
  let expected = null;
  for (let from = 0; ; from += PAGE) {
    const r = await get('/rest/v1/' + table + '?select=*&order=id', PUB_KEY, {
      Range: from + '-' + (from + PAGE - 1),
      Prefer: 'count=exact',
    });
    if (r.status !== 200 && r.status !== 206) {
      throw new Error(table + ': HTTP ' + r.status + ' ' + r.text.slice(0, 200));
    }
    // content-range looks like "0-40/41"
    if (expected === null && r.contentRange) {
      const total = r.contentRange.split('/')[1];
      if (total && total !== '*') expected = Number(total);
    }
    const page = JSON.parse(r.text);
    rows.push.apply(rows, page);
    if (page.length < PAGE) break;
  }
  return { rows: rows, expected: expected };
}

// The secret key, if it is in the secrets folder. Used only for the schema.
function secretKey() {
  try {
    for (const f of fs.readdirSync(SECRETS)) {
      const full = path.join(SECRETS, f);
      if (!fs.statSync(full).isFile()) continue;
      const m = fs.readFileSync(full, 'utf8').match(/sb_secret_[A-Za-z0-9_-]+/);
      if (m) return m[0];
    }
  } catch { /* no secrets folder is not fatal */ }
  return null;
}

const PG_TYPE = {
  uuid: 'uuid', text: 'text', numeric: 'numeric', integer: 'integer',
  date: 'date', 'timestamp with time zone': 'timestamptz', boolean: 'boolean',
  bigint: 'bigint', 'double precision': 'double precision', json: 'jsonb', jsonb: 'jsonb',
};

// Turn the REST API's OpenAPI description into CREATE TABLE statements.
// This is derived from what the API exposes, not a pg_dump: it carries columns,
// types, primary keys, foreign keys and NOT NULL, but not defaults, indexes,
// triggers or the Row Level Security policies. Those must be set by hand.
function schemaSql(spec) {
  const out = [
    '-- Grassy Hill — table structure, derived from the Supabase REST API schema.',
    '-- Generated ' + stamp + ' by backup.js. NOT a pg_dump.',
    '-- Missing by nature: defaults, indexes, triggers, and RLS policies.',
    '-- After creating these, RLS must be re-enabled and the policies recreated by',
    '-- hand, or the new project is wide open.',
    '',
  ];
  for (const table of TABLES) {
    const def = spec.definitions && spec.definitions[table];
    if (!def) { out.push('-- ' + table + ': not present in the API schema', ''); continue; }
    const required = new Set(def.required || []);
    const cols = [];
    const fks = [];
    let pk = null;
    for (const [name, p] of Object.entries(def.properties || {})) {
      const type = PG_TYPE[p.format] || 'text';
      const desc = p.description || '';
      if (desc.indexOf('<pk/>') !== -1) pk = name;
      const fk = desc.match(/<fk table='([^']+)' column='([^']+)'\/>/);
      if (fk) fks.push('  foreign key (' + name + ') references ' + fk[1] + '(' + fk[2] + ')');
      cols.push('  ' + name + ' ' + type + (required.has(name) && name !== pk ? ' not null' : ''));
    }
    if (pk) cols.push('  primary key (' + pk + ')');
    out.push('create table if not exists ' + table + ' (', cols.concat(fks).join(',\n'), ');', '');
  }
  return out.join('\n');
}

(async () => {
  const up = await reachable();
  if (!up.ok) {
    // A paused project is the expected case, not a crash. Write nothing:
    // an empty backup that looks successful is worse than no backup.
    log('SKIPPED — project not reachable (' + up.why + '). Nothing written.');
    process.exit(2);
  }

  const dir = path.join(OUT_ROOT, day);
  fs.mkdirSync(dir, { recursive: true });

  const manifest = {
    taken_at: stamp,
    source: URL_BASE,
    tables: {},
    schema_captured: false,
    ok: false,
  };
  const problems = [];

  for (const table of TABLES) {
    try {
      const got = await fetchTable(table);
      fs.writeFileSync(path.join(dir, table + '.json'), JSON.stringify(got.rows, null, 1));
      const short = got.expected !== null && got.rows.length !== got.expected;
      manifest.tables[table] = {
        rows: got.rows.length,
        server_count: got.expected,
        complete: !short,
      };
      if (short) problems.push(table + ': saved ' + got.rows.length + ' of ' + got.expected + ' rows');
      if (got.expected === null) problems.push(table + ': server gave no count, completeness unverified');
    } catch (e) {
      manifest.tables[table] = { rows: 0, error: String(e.message || e), complete: false };
      problems.push(table + ': ' + (e.message || e));
    }
  }

  const sk = secretKey();
  if (sk) {
    try {
      const r = await get('/rest/v1/', sk);
      if (r.status === 200) {
        const spec = JSON.parse(r.text);
        fs.writeFileSync(path.join(dir, 'schema-openapi.json'), r.text);
        fs.writeFileSync(path.join(dir, 'schema.sql'), schemaSql(spec));
        manifest.schema_captured = true;
      } else {
        problems.push('schema: HTTP ' + r.status);
      }
    } catch (e) {
      problems.push('schema: ' + (e.message || e));
    }
  } else {
    problems.push('schema: no secret key found in the secrets folder — data saved, structure not');
  }

  manifest.ok = problems.length === 0;
  manifest.problems = problems;
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1));

  const counts = TABLES.map(function (t) {
    return t + '=' + (manifest.tables[t] ? manifest.tables[t].rows : 'ERR');
  }).join(' ');

  if (manifest.ok) {
    log('OK ' + day + ' ' + counts);
    process.exit(0);
  }
  log('FAILED ' + day + ' ' + counts + ' | ' + problems.join('; '));
  process.exit(1);
})();
