// Suggestion ranking: normalize, dedupe, score by evidence. No AI, no new deps.
const { pool } = require('@dominyx/core');

const NOISE_RE = /\(?(official\s+)?(music\s+)?video|lyrical|lyric|audio|visualiser|visualizer|full\s+song|title\s+track|4k|hd|1080p|explicit|slowed|sped\s*up|\[.*?\]|\(.*?version\)/gi;

function normalizeTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(NOISE_RE, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArtist(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rareWords(s) {
  const stop = new Set(['the', 'a', 'an', 'song', 'video', 'official', 'new', 'best', 'top', 'mix', 'full', 'hd', 'hindi']);
  return new Set(String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !stop.has(w)));
}

function sharedRare(a, b) {
  const wa = rareWords(a);
  let n = 0;
  for (const w of rareWords(b)) if (wa.has(w)) n++;
  return n;
}

// Score 0-100 from available evidence only. No mood/genre guessing.
function scoreCandidate(seed, cand, historyArtists = new Set()) {
  let score = 0;
  const seedArtist = normalizeArtist(seed.artist);
  const candArtist = normalizeArtist(cand.artist);
  const seedTitle = normalizeTitle(seed.title);
  const candTitle = normalizeTitle(cand.title);

  if (seedArtist && seedArtist === candArtist) score += 40; // same artist
  const shared = sharedRare(`${seed.title} ${seed.artist}`, `${cand.title} ${cand.artist}`);
  score += Math.min(shared * 8, 24); // shared vocabulary (movie/album words)
  if (seedTitle && candTitle && seedTitle !== candTitle) score += 6; // not the same song
  else if (seedTitle === candTitle) score -= 20; // duplicate of seed
  if (/cover|unplugged|reprise|live|acoustic/.test(candTitle)) score -= 5; // alternates rank lower, kept
  const sd = seed.durationMs || 0;
  const cd = cand.durationMs || 0;
  if (sd > 0 && cd > 0) {
    const ratio = Math.min(sd, cd) / Math.max(sd, cd);
    if (ratio > 0.7) score += 8; // similar length class
  }
  if (historyArtists.has(candArtist)) score += 10; // requester likes this artist
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function requesterArtists(guildId, userId, limit = 30) {
  try {
    const res = await pool.query(
      `SELECT DISTINCT artist FROM play_history WHERE guild_id = $1 AND user_id = $2 ORDER BY started_at DESC LIMIT $3`,
      [guildId, userId, limit]
    );
    return new Set(res.rows.map((r) => normalizeArtist(r.artist)));
  } catch {
    return new Set();
  }
}

function logSuggestionDebug(seed, candidates, picked) {
  try {
    console.log(
      '[DOMINYX:SUGGESTIONS] ' +
        JSON.stringify({
          seed: {
            title: seed?.title,
            author: seed?.artist,
            durationMs: seed?.durationMs,
            uri: seed?.uri,
          },
          candidateCount: candidates?.length ?? 0,
          candidates: (candidates ?? []).slice(0, 15).map((c, i) => ({
            rank: i + 1,
            score: c.score,
            title: c.title,
            author: c.artist,
            durationMs: c.durationMs,
            uri: c.url,
          })),
          picked: picked ?? null,
        })
    );
  } catch {}
}

module.exports = { normalizeTitle, normalizeArtist, scoreCandidate, requesterArtists, logSuggestionDebug };
