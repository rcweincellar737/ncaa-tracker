const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ncaa.db');
let db;

async function init() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS picks (
    person TEXT PRIMARY KEY,
    teams TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS results (
    round_id TEXT,
    team_key TEXT,
    won INTEGER,
    PRIMARY KEY (round_id, team_key)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT DEFAULT (datetime('now')),
    type TEXT,
    person TEXT,
    detail TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT DEFAULT (datetime('now')),
    person TEXT,
    target_person TEXT,
    emoji TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);
  // seed defaults
  const lockRow = db.exec("SELECT value FROM config WHERE key='picks_locked'");
  if (lockRow.length === 0) {
    db.run("INSERT INTO config (key, value) VALUES ('picks_locked','false')");
  }
  const passRow = db.exec("SELECT value FROM config WHERE key='admin_password'");
  if (passRow.length === 0) {
    db.run("INSERT INTO config (key, value) VALUES ('admin_password','madness2025')");
  }
  const deadlineRow = db.exec("SELECT value FROM config WHERE key='lock_deadline'");
  if (deadlineRow.length === 0) {
    db.run("INSERT INTO config (key, value) VALUES ('lock_deadline','')");
  }
  save();
}

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// --- Picks ---
function getPicks() {
  const rows = db.exec('SELECT person, teams FROM picks');
  const out = {};
  if (rows.length > 0) {
    for (const row of rows[0].values) {
      out[row[0]] = JSON.parse(row[1]);
    }
  }
  return out;
}

function setPicks(person, teamsArray) {
  db.run('INSERT OR REPLACE INTO picks (person, teams) VALUES (?, ?)', [person, JSON.stringify(teamsArray)]);
  save();
  return getPicks();
}

// --- Results ---
function getResults() {
  const rows = db.exec('SELECT round_id, team_key, won FROM results');
  const out = {};
  if (rows.length > 0) {
    for (const row of rows[0].values) {
      if (!out[row[0]]) out[row[0]] = {};
      out[row[0]][row[1]] = row[2] === 1;
    }
  }
  return out;
}

function setResult(roundId, teamKey, won) {
  db.run('INSERT OR REPLACE INTO results (round_id, team_key, won) VALUES (?, ?, ?)', [roundId, teamKey, won ? 1 : 0]);
  save();
  return getResults();
}

function deleteResult(roundId, teamKey) {
  db.run('DELETE FROM results WHERE round_id = ? AND team_key = ?', [roundId, teamKey]);
  save();
  return getResults();
}

// --- Activity feed ---
function addActivity(type, person, detail) {
  db.run('INSERT INTO activity (type, person, detail) VALUES (?, ?, ?)', [type, person || '', detail || '']);
  save();
}

function getActivity(limit = 50) {
  const rows = db.exec(`SELECT id, ts, type, person, detail FROM activity ORDER BY id DESC LIMIT ${limit}`);
  if (rows.length === 0) return [];
  return rows[0].values.map(r => ({ id: r[0], ts: r[1], type: r[2], person: r[3], detail: r[4] }));
}

// --- Reactions ---
function addReaction(person, targetPerson, emoji) {
  db.run('INSERT INTO reactions (person, target_person, emoji) VALUES (?, ?, ?)', [person, targetPerson, emoji]);
  save();
}

function getReactions() {
  const rows = db.exec('SELECT person, target_person, emoji, ts FROM reactions ORDER BY id DESC LIMIT 200');
  if (rows.length === 0) return [];
  return rows[0].values.map(r => ({ person: r[0], targetPerson: r[1], emoji: r[2], ts: r[3] }));
}

// --- Config ---
function getConfig(key) {
  const rows = db.exec(`SELECT value FROM config WHERE key=?`, [key]);
  if (rows.length === 0) return null;
  return rows[0].values[0][0];
}

function setConfig(key, value) {
  db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value]);
  save();
}

function verifyAdmin(password) {
  const stored = getConfig('admin_password');
  return password === stored;
}

module.exports = {
  init, getPicks, setPicks, getResults, setResult, deleteResult,
  addActivity, getActivity,
  addReaction, getReactions,
  getConfig, setConfig, verifyAdmin
};
