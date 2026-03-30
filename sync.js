/**
 * ESPN Score Sync for NCAA March Madness 2026 Tracker
 *
 * Uses ESPN's public (undocumented) scoreboard API to pull game results.
 * This is a convenience feature — manual entry remains the fallback.
 */

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';

// Map ESPN shortDisplayName → our team name (as used in team keys)
const ESPN_TO_OUR_NAME = {
  // East
  'Duke': 'Duke', 'UConn': 'UConn', 'Connecticut': 'UConn',
  'Michigan St': 'Michigan St', 'Michigan State': 'Michigan St',
  'Kansas': 'Kansas', "St. John's": "St. John's", "St John's": "St. John's", 'St Johns': "St. John's",
  'Louisville': 'Louisville', 'UCLA': 'UCLA',
  'Ohio St': 'Ohio St', 'Ohio State': 'Ohio St',
  'TCU': 'TCU', 'UCF': 'UCF',
  'South Florida': 'South Florida', 'USF': 'South Florida',
  'Northern Iowa': 'Northern Iowa', 'UNI': 'Northern Iowa',
  'Cal Baptist': 'Cal Baptist', 'California Baptist': 'Cal Baptist', 'CA Baptist': 'Cal Baptist',
  'North Dakota St': 'North Dakota St', 'North Dakota State': 'North Dakota St', 'NDSU': 'North Dakota St', 'N Dakota St': 'North Dakota St',
  'Furman': 'Furman', 'Siena': 'Siena', 'Long Island': 'LIU',

  // West
  'Arizona': 'Arizona', 'Purdue': 'Purdue', 'Gonzaga': 'Gonzaga', 'Arkansas': 'Arkansas',
  'Wisconsin': 'Wisconsin', 'BYU': 'BYU',
  'Miami': 'Miami FL', 'Miami (FL)': 'Miami FL',
  'Villanova': 'Villanova',
  'Utah St': 'Utah St', 'Utah State': 'Utah St',
  'Missouri': 'Missouri',
  'Texas': 'Texas/NC State', 'NC State': 'Texas/NC State',
  'High Point': 'High Point', 'Hawaii': 'Hawaii', "Hawai'i": 'Hawaii',
  'Kennesaw St': 'Kennesaw St', 'Kennesaw State': 'Kennesaw St',
  'Queens': 'Queens', 'LIU': 'LIU',

  // South
  'Florida': 'Florida', 'Houston': 'Houston', 'Illinois': 'Illinois', 'Nebraska': 'Nebraska',
  'Vanderbilt': 'Vanderbilt', 'North Carolina': 'North Carolina', 'UNC': 'North Carolina',
  "Saint Mary's": "Saint Mary's", 'Saint Marys': "Saint Mary's",
  'Clemson': 'Clemson', 'Iowa': 'Iowa',
  'Texas A&M': 'Texas A&M', 'VCU': 'VCU',
  'McNeese': 'McNeese', 'McNeese State': 'McNeese', 'McNeese St': 'McNeese',
  'Troy': 'Troy', 'Penn': 'Penn', 'Idaho': 'Idaho',
  'Prairie View A&M': 'Prairie View A&M/Lehigh', 'Prairie View': 'Prairie View A&M/Lehigh', 'Lehigh': 'Prairie View A&M/Lehigh',

  // Midwest
  'Michigan': 'Michigan', 'Iowa St': 'Iowa St', 'Iowa State': 'Iowa St',
  'Virginia': 'Virginia', 'Alabama': 'Alabama',
  'Texas Tech': 'Texas Tech', 'Tennessee': 'Tennessee',
  'Kentucky': 'Kentucky', 'Georgia': 'Georgia',
  'Saint Louis': 'Saint Louis', 'St. Louis': 'Saint Louis',
  'Santa Clara': 'Santa Clara',
  'Miami (OH)': 'Miami OH/SMU', 'Miami Ohio': 'Miami OH/SMU', 'Miami OH': 'Miami OH/SMU', 'SMU': 'Miami OH/SMU',
  'Akron': 'Akron', 'Hofstra': 'Hofstra',
  'Wright St': 'Wright St', 'Wright State': 'Wright St',
  'Tennessee St': 'Tennessee St', 'Tennessee State': 'Tennessee St',
  'UMBC': 'UMBC/Howard', 'Howard': 'UMBC/Howard',
};

// Our full team list for reverse lookup
const OUR_TEAMS = {
  East: [['Duke',1],['UConn',2],['Michigan St',3],['Kansas',4],["St. John's",5],['Louisville',6],['UCLA',7],['Ohio St',8],['TCU',9],['UCF',10],['South Florida',11],['Northern Iowa',12],['Cal Baptist',13],['North Dakota St',14],['Furman',15],['Siena',16]],
  West: [['Arizona',1],['Purdue',2],['Gonzaga',3],['Arkansas',4],['Wisconsin',5],['BYU',6],['Miami FL',7],['Villanova',8],['Utah St',9],['Missouri',10],['Texas/NC State',11],['High Point',12],['Hawaii',13],['Kennesaw St',14],['Queens',15],['LIU',16]],
  South: [['Florida',1],['Houston',2],['Illinois',3],['Nebraska',4],['Vanderbilt',5],['North Carolina',6],["Saint Mary's",7],['Clemson',8],['Iowa',9],['Texas A&M',10],['VCU',11],['McNeese',12],['Troy',13],['Penn',14],['Idaho',15],['Prairie View A&M/Lehigh',16]],
  Midwest: [['Michigan',1],['Iowa St',2],['Virginia',3],['Alabama',4],['Texas Tech',5],['Tennessee',6],['Kentucky',7],['Georgia',8],['Saint Louis',9],['Santa Clara',10],['Miami OH/SMU',11],['Akron',12],['Hofstra',13],['Wright St',14],['Tennessee St',15],['UMBC/Howard',16]]
};

// Build lookup: ourName → [{name, seed, region, key}]
const NAME_TO_KEYS = {};
for (const [region, teams] of Object.entries(OUR_TEAMS)) {
  for (const [name, seed] of teams) {
    if (!NAME_TO_KEYS[name]) NAME_TO_KEYS[name] = [];
    NAME_TO_KEYS[name].push({ name, seed, region, key: `${name}|${seed}|${region}` });
  }
}

// ESPN round headline → our round ID
function parseRound(headline) {
  if (!headline) return null;
  const h = headline.toLowerCase();
  if (h.includes('national championship') || h.includes('championship game')) return 'champ';
  if (h.includes('final four') || h.includes('national semifinal')) return 'ff';
  if (h.includes('elite') || h.includes('regional final')) return 'e8';
  if (h.includes('sweet') || h.includes('regional semifinal')) return 's16';
  if (h.includes('2nd round') || h.includes('second round') || h.includes('round of 32')) return 'r2';
  if (h.includes('1st round') || h.includes('first round') || h.includes('round of 64')) return 'r1';
  if (h.includes('first four')) return null; // play-in, not tracked
  return null;
}

function findTeamKey(espnName) {
  const ourName = ESPN_TO_OUR_NAME[espnName];
  if (!ourName) return null;
  const entries = NAME_TO_KEYS[ourName];
  if (!entries || entries.length === 0) return null;
  if (entries.length === 1) return entries[0].key;
  return entries.map(e => e.key);
}

async function syncScores(db) {
  // Fetch games for tournament date range (March 17 - April 7, 2026)
  const dates = [];
  for (let d = 17; d <= 31; d++) dates.push(`202603${d < 10 ? '0' + d : d}`);
  for (let d = 1; d <= 7; d++) dates.push(`2026040${d}`);

  let updated = 0;
  let skipped = 0;
  let errors = [];

  for (const date of dates) {
    let data;
    try {
      const url = `${ESPN_BASE}?dates=${date}&groups=100&limit=100`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      data = await resp.json();
    } catch (e) {
      continue;
    }

    const events = data.events || [];
    for (const event of events) {
      for (const comp of (event.competitions || [])) {
        const status = comp.status?.type;
        if (!status?.completed) continue;

        const notes = comp.notes?.[0]?.headline || event.notes?.[0]?.headline || '';
        const roundId = parseRound(notes);
        if (!roundId) { skipped++; continue; }

        for (const team of (comp.competitors || [])) {
          const espnName = team.team?.shortDisplayName || team.team?.displayName || '';
          const won = team.winner === true;
          const keys = findTeamKey(espnName);

          if (!keys) {
            if (espnName) errors.push(`Unmatched: "${espnName}"`);
            continue;
          }

          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const teamKey of keyList) {
            const currentResults = db.getResults();
            if (currentResults[roundId]?.[teamKey] !== undefined) continue;
            db.setResult(roundId, teamKey, won);
            db.addActivity(won ? 'win' : 'loss', 'ESPN Sync', `${teamKey}|${roundId}`);
            updated++;
          }
        }
      }
    }
  }

  return {
    updated,
    skipped,
    errors: [...new Set(errors)],
    results: db.getResults()
  };
}

module.exports = { syncScores };
