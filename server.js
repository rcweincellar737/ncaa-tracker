const express = require('express');
const path = require('path');
const db = require('./db');
const { syncScores } = require('./sync');
const { seedIfEmpty } = require('./seed');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Full state (picks, results, activity, reactions, config)
app.get('/api/state', (req, res) => {
  res.json({
    picks: db.getPicks(),
    results: db.getResults(),
    activity: db.getActivity(50),
    reactions: db.getReactions(),
    picksLocked: db.getConfig('picks_locked') === 'true',
    lockDeadline: db.getConfig('lock_deadline') || ''
  });
});

// Save picks
app.post('/api/picks', (req, res) => {
  const { person, teams } = req.body;
  if (!person || !Array.isArray(teams)) {
    return res.status(400).json({ error: 'person (string) and teams (array) required' });
  }
  if (db.getConfig('picks_locked') === 'true') {
    return res.status(403).json({ error: 'Picks are locked' });
  }
  const oldPicks = db.getPicks()[person] || [];
  const picks = db.setPicks(person, teams);

  // Activity: figure out what changed
  const added = teams.filter(t => !oldPicks.includes(t));
  const removed = oldPicks.filter(t => !teams.includes(t));
  for (const t of added) db.addActivity('pick', person, t);
  for (const t of removed) db.addActivity('unpick', person, t);

  res.json({ picks });
});

// Save results (admin-protected)
app.post('/api/results', (req, res) => {
  const { roundId, teamKey, won, adminPass } = req.body;
  if (!roundId || !teamKey || typeof won !== 'boolean') {
    return res.status(400).json({ error: 'roundId, teamKey, and won (boolean) required' });
  }
  if (!db.verifyAdmin(adminPass || '')) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  const results = db.setResult(roundId, teamKey, won);
  db.addActivity(won ? 'win' : 'loss', '', `${teamKey}|${roundId}`);
  res.json({ results });
});

// Reactions
app.post('/api/reactions', (req, res) => {
  const { person, targetPerson, emoji } = req.body;
  if (!person || !targetPerson || !emoji) {
    return res.status(400).json({ error: 'person, targetPerson, and emoji required' });
  }
  db.addReaction(person, targetPerson, emoji);
  db.addActivity('reaction', person, `${emoji} → ${targetPerson}`);
  res.json({ reactions: db.getReactions() });
});

// Admin: lock/unlock picks
app.post('/api/admin/lock', (req, res) => {
  const { locked, adminPass, deadline } = req.body;
  if (!db.verifyAdmin(adminPass || '')) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  db.setConfig('picks_locked', locked ? 'true' : 'false');
  if (deadline !== undefined) db.setConfig('lock_deadline', deadline || '');
  db.addActivity('admin', '', locked ? 'Picks locked' : 'Picks unlocked');
  res.json({ picksLocked: locked });
});

// Admin: change password
app.post('/api/admin/password', (req, res) => {
  const { oldPass, newPass } = req.body;
  if (!db.verifyAdmin(oldPass || '')) {
    return res.status(401).json({ error: 'Invalid current password' });
  }
  if (!newPass || newPass.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }
  db.setConfig('admin_password', newPass);
  res.json({ ok: true });
});

// Verify admin password (for UI unlock)
app.post('/api/admin/verify', (req, res) => {
  const { adminPass } = req.body;
  res.json({ valid: db.verifyAdmin(adminPass || '') });
});

// Sync scores from ESPN (admin-protected)
app.post('/api/sync', async (req, res) => {
  const { adminPass } = req.body;
  if (!db.verifyAdmin(adminPass || '')) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  try {
    const result = await syncScores(db);
    res.json(result);
  } catch (e) {
    console.error('Sync error:', e);
    res.status(500).json({ error: 'Sync failed: ' + e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

db.init().then(() => {
  seedIfEmpty(db);
  app.listen(PORT, () => console.log(`NCAA Tracker running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
