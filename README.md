# NCAA March Madness Tracker

Shared office scoring app for March Madness picks.

## Local Setup

```bash
npm install
node server.js
# Open http://localhost:3000
```

## Deploy on Railway

1. Push to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the repo — Railway auto-detects Node.js
4. Add env var: `PORT = 3000` (Railway sets this automatically)
5. Deploy → get your public URL → share with the office

## Scoring

- **Rounds 1–4** (R64, R32, Sweet 16, Elite 8): seed value per win
- **Final Four**: +6 bonus per team
- **Championship Game**: +8 bonus per team
- **National Champion**: +10 bonus per team
