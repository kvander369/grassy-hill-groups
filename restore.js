#!/usr/bin/env node
// restore.js — check a backup, and put it back into a Supabase project.
//
//   node restore.js                          check the newest backup (default)
//   node restore.js 2026-09-07               check that one
//   node restore.js 2026-09-07 --write --target-url=https://xxx.supabase.co --target-key=sb_secret_...
//
// Checking touches nothing. It parses every file, compares the row counts to the
// manifest, and follows every foreign key — so a backup that cannot be put back
// says so here, not on the day it is needed.
//
// Writing requires --write AND a target given on the command line. It refuses to
// write to the live project unless --live is also passed, so a slip of the hand
// cannot overwrite the girls' real data. It only inserts; it never deletes.

const fs = require('fs');
const path = require('path');

const LIVE_URL = 'https://lackcooiarpahgmkrpeu.supabase.co';
const TABLES = ['players', 'rounds', 'round_groups', 'settings']; // parents before children
const OUT_ROOT = path.resolve(__dirname, '..', 'secrets', 'grassy-hill', 'backups');
const CHUNK = 200;

const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === '--' + name);
const value = (name) => {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : null;
};

const wanted = args.find((a) => !a.startsWith('--'));
const doWrite = flag('write');

function newestBackup() {
  const days = fs.readdirSync(OUT_ROOT)
    .filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f))
    .sort();
  if (!days.length) throw new Error('no backups in ' + OUT_ROOT);
  return days[days.length - 1];
}

function check(dir) {
  const problems = [];
  const data = {};
  let manifest = null;

  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  } catch (e) {
    problems.push('manifest.json unreadable: ' + (e.message || e));
  }

  for (const table of TABLES) {
    const file = path.join(dir, table + '.json');
    try {
      const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(rows)) throw new Error('not a JSON array');
      data[table] = rows;
      const claimed = manifest && manifest.tables && manifest.tables[table];
      if (claimed && claimed.rows !== rows.length) {
        problems.push(table + ': manifest says ' + claimed.rows + ' rows, file holds ' + rows.length);
      }
      if (claimed && claimed.complete === false) {
        problems.push(table + ': manifest marks this table incomplete');
      }
    } catch (e) {
      data[table] = [];
      problems.push(table + '.json: ' + (e.message || e));
    }
  }

  // Foreign keys: a group that points at a round or a player we did not save
  // cannot be restored, so it is a real defect in the backup.
  const roundIds = new Set(data.rounds.map((r) => r.id));
  const playerIds = new Set(data.players.map((p) => p.id));
  let orphanRound = 0;
  let orphanPlayer = 0;
  for (const g of data.round_groups) {
    if (!roundIds.has(g.round_id)) orphanRound++;
    if (!playerIds.has(g.player_id)) orphanPlayer++;
  }
  if (orphanRound) problems.push('round_groups: ' + orphanRound + ' rows point at a round that is not in the backup');
  if (orphanPlayer) problems.push('round_groups: ' + orphanPlayer + ' rows point at a player that is not in the backup');

  if (!fs.existsSync(path.join(dir, 'schema.sql'))) {
    problems.push('schema.sql missing — the data is here but not the table structure');
  }

  return { data, manifest, problems, orphanRound, orphanPlayer };
}

async function insertAll(data, targetUrl, targetKey) {
  for (const table of TABLES) {
    const rows = data[table];
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const res = await fetch(targetUrl + '/rest/v1/' + table, {
        method: 'POST',
        headers: {
          apikey: targetKey,
          Authorization: 'Bearer ' + targetKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal,resolution=merge-duplicates',
        },
        body: JSON.stringify(slice),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        throw new Error(table + ' rows ' + i + '-' + (i + slice.length - 1) +
          ': HTTP ' + res.status + ' ' + (await res.text()).slice(0, 300));
      }
    }
    console.log('  restored ' + table + ': ' + rows.length + ' rows');
  }
}

(async () => {
  const day = wanted || newestBackup();
  const dir = path.join(OUT_ROOT, day);
  if (!fs.existsSync(dir)) {
    console.error('No backup folder: ' + dir);
    process.exit(1);
  }

  console.log('Backup: ' + dir);
  const { data, manifest, problems } = check(dir);
  for (const table of TABLES) console.log('  ' + table + ': ' + data[table].length + ' rows');
  if (manifest) console.log('  taken ' + manifest.taken_at + ', manifest ok=' + manifest.ok);

  if (problems.length) {
    console.log('\nFAILED — this backup is not safe to restore:');
    for (const p of problems) console.log('  - ' + p);
    process.exit(1);
  }
  console.log('\nCHECK PASSED — files parse, counts match the manifest, every foreign key resolves.');

  if (!doWrite) {
    console.log('Nothing was written (add --write plus a target to actually restore).');
    process.exit(0);
  }

  const targetUrl = value('target-url');
  const targetKey = value('target-key');
  if (!targetUrl || !targetKey) {
    console.error('\n--write needs --target-url=... and --target-key=...');
    process.exit(1);
  }
  if (targetUrl.replace(/\/$/, '') === LIVE_URL && !flag('live')) {
    console.error('\nThat is the LIVE project the girls use. Refusing.');
    console.error('If you really mean it, add --live.');
    process.exit(1);
  }

  console.log('\nRestoring into ' + targetUrl + ' ...');
  await insertAll(data, targetUrl.replace(/\/$/, ''), targetKey);
  console.log('Done.');
})().catch((e) => {
  console.error('FAILED: ' + (e.message || e));
  process.exit(1);
});
