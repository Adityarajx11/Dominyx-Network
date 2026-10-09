// RecommendationProvider: Last.fm primary (optional key), curated fallback (always).
// Everything resolves through searchTrack() at click time — menus carry queries, not audio.
const { pool } = require('@dominyx/core');

const CURATED = {
  lofi: ['lofi hip hop radio', 'chill lofi beats', 'ambient study music'],
  pop: ['top pop hits', 'pop dance mix', 'feel good pop'],
  rock: ['classic rock anthems', 'alternative rock mix', 'soft rock ballads'],
  hiphop: ['hip hop workout mix', 'rap hits', 'old school hip hop'],
  edm: ['edm party mix', 'house music mix', 'phonk mix'],
  hindi: ['bollywood romantic mix', 'arijit singh best songs', 'hindi lofi mix'],
  acoustic: ['acoustic covers', 'unplugged sessions', 'coffeehouse acoustic'],
  ambient: ['ambient sleep music', 'deep focus ambient', 'rain sounds mix'],
};

const ARTIST_GENRE = [
  [/arijit|shreya|sonu|bollywood|hindi/i, 'hindi'],
  [/lofi|chill/i, 'lofi'],
  [/rock|metal/i, 'rock'],
  [/rap|hip hop|hip-hop|eminem|drake/i, 'hiphop'],
  [/edm|house|phonk|dj/i, 'edm'],
  [/acoustic|unplugged/i, 'acoustic'],
];

const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://iv.duti.dev',
];

// Result titles that scream compilation/mix, not a song.
const MIX_TITLE_RE = /\bmix\b|jukebox|compilation|\btop\s?\d+\b|playlist|nonstop|mashup|\b1\s?hour\b|\bbest of\b|collection|hour loop|lofi beats to|radio 📚/i;

function youtubeIdFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    return u.searchParams.get('v');
  } catch {
    return null;
  }
}

// Free, keyless: YouTube's own "related videos" via public Invidious API.
// Returns [{ title, artist, url, id }] of real single videos.
async function youtubeRelated(videoId, n = 5) {
  if (!videoId) return null;
  for (const base of INVIDIOUS) {
    try {
      const res = await fetch(`${base}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      const recs = Array.isArray(data?.recommendedVideos) ? data.recommendedVideos : [];
      const out = [];
      for (const r of recs) {
        if (out.length >= n) break;
        const id = r.videoId;
        const len = Number(r.lengthSeconds || 0);
        if (!id || (len > 0 && (len < 45 || len > 1200))) continue;
        if (MIX_TITLE_RE.test(r.title || '')) continue;
        out.push({
          id,
          title: r.title || 'Unknown',
          artist: r.author || '',
          url: `https://www.youtube.com/watch?v=${id}`,
        });
      }
      if (out.length > 0) return out;
    } catch {
      continue;
    }
  }
  return null;
}

function genreOf(artist, title) {
  const s = `${artist || ''} ${title || ''}`;
  for (const [re, g] of ARTIST_GENRE) {
    if (re.test(s)) return g;
  }
  return 'pop';
}

const lastfmCache = new Map();

async function lastfmSimilarTracks(artist, title, n = 5) {
  const key = process.env.LASTFM_API_KEY;
  if (!key || !artist) return null;
  const ck = `${artist}::${title}`;
  if (lastfmCache.has(ck)) return lastfmCache.get(ck);
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title || '')}&api_key=${key}&format=json&limit=${n}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const tracks = data?.similartracks?.track;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    const out = tracks.slice(0, n).map((t) => `${t.artist?.name || ''} - ${t.name}`.trim());
    lastfmCache.set(ck, out);
    if (lastfmCache.size > 500) lastfmCache.delete(lastfmCache.keys().next().value);
    return out;
  } catch {
    return null;
  }
}

async function lastfmSimilarArtists(artist, n = 5) {
  const key = process.env.LASTFM_API_KEY;
  if (!key || !artist) return null;
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${key}&format=json&limit=${n}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const artists = data?.similarartists?.artist;
    if (!Array.isArray(artists) || artists.length === 0) return null;
    return artists.slice(0, n).map((a) => a.name);
  } catch {
    return null;
  }
}

// Primary API, then curated fallback. Always returns n query strings. Works keyless.
async function similarTracks(title, artist, n = 5) {
  const viaApi = await lastfmSimilarTracks(artist, title, n);
  if (viaApi && viaApi.length > 0) return dedupeQueries(viaApi, title).slice(0, n);
  // Keyless: artist-popular singles first (these resolve to real hit songs),
  // vibe queries last. Mixes/playlists are filtered at resolve time anyway.
  const a = artist && artist !== 'Unknown' ? artist : '';
  const t = title || '';
  const seeds = [];
  if (a) seeds.push(`${a} top songs`, `best of ${a}`, `${a} hit songs`, `${a} unplugged`, `${a} romantic songs`);
  if (t) seeds.push(`songs like ${t}`, `${t} cover`, `${t} reprise`, `${t} unplugged`);
  const g = genreOf(artist, title);
  for (const s of CURATED[g]) {
    if (seeds.length >= n + 3) break;
    seeds.push(s);
  }
  return dedupeQueries(seeds, title).slice(0, n + 3);
}

async function similarArtists(artist, n = 5) {
  const viaApi = await lastfmSimilarArtists(artist, n);
  if (viaApi && viaApi.length > 0) return viaApi.slice(0, n);
  const g = genreOf(artist, '');
  return CURATED[g].slice(0, n);
}

function dedupeQueries(queries, currentTitle) {
  const seen = new Set();
  const out = [];
  const cur = String(currentTitle || '').toLowerCase();
  for (const q of queries) {
    const k = String(q || '').toLowerCase().trim();
    if (!k || seen.has(k) || (cur && k === cur)) continue;
    seen.add(k);
    out.push(q);
  }
  return out;
}

module.exports = { similarTracks, similarArtists, genreOf, CURATED, youtubeRelated, youtubeIdFromUrl };
