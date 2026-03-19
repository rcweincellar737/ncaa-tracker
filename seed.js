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
  ],
  "Danielle": [
    "Duke|1|East", "Arizona|1|West", "Kansas|4|East", "Illinois|3|South",
    "Gonzaga|3|West", "North Carolina|6|South", "VCU|11|South", "UCF|10|East"
  ],
  "Ross": [
    "Texas/NC State|11|West", "South Florida|11|East", "VCU|11|South", "Santa Clara|10|Midwest",
    "Tennessee|6|Midwest", "Kennesaw St|14|West", "Akron|12|Midwest", "Ohio St|8|East"
  ],
  "Gil": [
    "Michigan St|3|East", "Houston|2|South", "Iowa St|2|Midwest", "Purdue|2|West",
    "Alabama|4|Midwest", "Kansas|4|East", "Nebraska|4|South", "Wisconsin|5|West"
  ],
  "Peter": [
    "Florida|1|South", "Miami FL|7|West", "Illinois|3|South", "St. John's|5|East",
    "BYU|6|West", "Tennessee|6|Midwest", "VCU|11|South", "Akron|12|Midwest"
  ],
  "Keith": [
    "Arizona|1|West", "Houston|2|South", "VCU|11|South", "Duke|1|East",
    "UConn|2|East", "Gonzaga|3|West", "Tennessee|6|Midwest", "Michigan|1|Midwest"
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
