/**
 * Seed script — pre-loads picks that were entered before deployment.
 * Runs automatically on first start if no picks exist in the DB.
 * Called from server.js after db.init().
 */

const SEED_PICKS = {
  "Kevin": [
    "Arizona|1|West", "UConn|2|East", "Houston|2|South", "High Point|12|West",
    "BYU|6|West", "Akron|12|Midwest", "South Florida|11|East", "Miami OH/SMU|11|Midwest"
  ],
  "Brendan": [
    "St. John's|5|East", "UCF|10|East", "Hofstra|13|Midwest", "Duke|1|East",
    "VCU|11|South", "Texas A&M|10|South", "Santa Clara|10|Midwest", "Tennessee|6|Midwest"
  ],
  "David": [
    "St. John's|5|East", "UConn|2|East", "Vanderbilt|5|South", "Houston|2|South",
    "Arizona|1|West", "Purdue|2|West", "Michigan|1|Midwest", "Virginia|3|Midwest"
  ]
};

function seedIfEmpty(db) {
  const existing = db.getPicks();
  if (Object.keys(existing).length > 0) {
    console.log('DB already has picks, skipping seed.');
    return;
  }
  for (const [person, teams] of Object.entries(SEED_PICKS)) {
    db.setPicks(person, teams);
  }
  console.log(`Seeded ${Object.keys(SEED_PICKS).length} players' picks.`);
}

module.exports = { seedIfEmpty };
