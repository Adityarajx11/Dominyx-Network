const { CURATED } = require('./reco');

const MOODS = {
  Chill: {
    blurb: 'Low-effort listening: acoustic, ambient, lo-fi.',
    seeds: [...CURATED.acoustic, ...CURATED.lofi, ...CURATED.ambient],
  },
  Gaming: {
    blurb: 'Background fuel: EDM, phonk, hype rap — no slow ballads.',
    seeds: [...CURATED.edm, 'gaming music mix', ...CURATED.hiphop],
  },
  Workout: {
    blurb: 'High energy only: fast EDM, pump-up rap, hype pop.',
    seeds: ['workout pump up mix', ...CURATED.edm, ...CURATED.hiphop],
  },
  Sad: {
    blurb: 'Slow and heavy: sad ballads, rainy-day acoustic.',
    seeds: ['sad ballads mix', 'rainy day acoustic', ...CURATED.hindi],
  },
  Party: {
    blurb: 'Dancefloor: party hits, Bollywood dance, EDM drops.',
    seeds: ['party hits mix', 'bollywood party mix', ...CURATED.pop, ...CURATED.edm],
  },
  Focus: {
    blurb: 'No lyrics if possible: deep focus, instrumental, ambient.',
    seeds: ['deep focus instrumental', 'instrumental study mix', ...CURATED.ambient, ...CURATED.lofi],
  },
};

function moodQueries(mood, n = 5, salt = 0) {
  const seeds = MOODS[mood]?.seeds || MOODS.Chill.seeds;
  const out = [];
  for (let i = 0; i < seeds.length && out.length < n; i++) {
    const q = seeds[(i + salt) % seeds.length];
    if (!out.includes(q)) out.push(q);
  }
  return out;
}

module.exports = { MOODS, moodQueries };
