// Page du profil : lecture de status.json (branche `status`), valeurs par défaut et rythme de relecture.
import { render } from './rendu.js?v=0.29.0';
import { progress } from './profil.js?v=0.29.0';

const CONFIG = window.KP_PROFIL || {};
// 0.23 : relecture de status.json selon l'état — « en direct » (activité en cours) 15 s, en ligne 30 s,
// hors ligne 60 s ; aucune requête tant que l'onglet est caché.
const LIVE_MS = 15000,
  IDLE_MS = 30000,
  OFFLINE_MS = 60000;
export const OFFLINE_AFTER_MS = 3 * 60 * 1000;

export let status = null;

const DEFAULTS = {
  enLigne: false,
  enLigneDepuis: null,
  nePasDeranger: false,
  majLe: null,
  versionClient: '',
  pseudo: '',
  avatar: '',
  description: '',
  badges: [],
  discordId: '',
  badgesDiscord: [],
  liens: [],
  fond: '',
  accent: '',
  jeu: { actif: false },
  musique: { actif: false },
  activites: [],
  projets: [],
  posts: [],
  tagsPosts: [],
  steam: null,
  roblox: null,
  compteur: false,
};
const normalize = (raw) => {
  const s = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  for (const k of ['jeu', 'musique']) if (!s[k] || typeof s[k] !== 'object') s[k] = { actif: false };
  for (const k of ['badges', 'liens', 'activites', 'projets', 'posts', 'tagsPosts', 'badgesDiscord'])
    if (!Array.isArray(s[k])) s[k] = [];
  if (!s.steam || !Array.isArray(s.steam.jeux)) s.steam = null;
  else if (!Array.isArray(s.steam.souhaits)) s.steam.souhaits = [];
  if (!s.roblox || !Array.isArray(s.roblox.jeux)) s.roblox = null;
  if (!s.spotify || typeof s.spotify !== 'object') s.spotify = null;
  if (!s.divers || typeof s.divers !== 'object') s.divers = null;
  else {
    if (!Array.isArray(s.divers.tuiles)) s.divers.tuiles = [];
    if (!s.divers.evenements || typeof s.divers.evenements !== 'object') s.divers.evenements = {};
  }
  if (!Array.isArray(s.journal)) s.journal = [];
  if (s.spotify)
    for (const k of ['ecoutes', 'topArtistes', 'topTitres', 'playlists'])
      if (!Array.isArray(s.spotify[k])) s.spotify[k] = [];
  return s;
};
function sources() {
  const list = [];
  if (CONFIG.repo)
    list.push(`https://raw.githubusercontent.com/${CONFIG.repo}/${CONFIG.branche || 'status'}/status.json`);
  list.push('status.json');
  return list;
}
async function load() {
  for (const base of sources()) {
    try {
      const r = await fetch(`${base}?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) continue;
      status = normalize(await r.json());
      render();
      return;
    } catch {
      /* source suivante */
    }
  }
  if (!status) status = normalize(null);
  render();
}

/* ---------------- Relecture : plus souvent en direct, jamais onglet caché ---------------- */
export function isLive(s) {
  if (!s || !s.enLigne || !s.majLe || Date.now() - Date.parse(s.majLe) >= OFFLINE_AFTER_MS) return false;
  return !!(
    (s.jeu && s.jeu.actif) ||
    (s.musique && s.musique.actif) ||
    (s.regarde && s.regarde.actif) ||
    s.activites.some((a) => a.debut && !a.fin)
  );
}
const rhythm = () =>
  isLive(status)
    ? LIVE_MS
    : status && status.enLigne && status.majLe && Date.now() - Date.parse(status.majLe) < OFFLINE_AFTER_MS
      ? IDLE_MS
      : OFFLINE_MS;
let loadTimer = null;
function schedule() {
  clearTimeout(loadTimer);
  if (document.hidden) return;
  loadTimer = setTimeout(() => load().finally(schedule), rhythm());
}
/** Première lecture, puis relecture selon l'état ; aiguilles des barres chaque seconde. */
export function demarrerRelecture() {
  load().finally(schedule);
  setInterval(progress, 1000);
  document.addEventListener('visibilitychange', () => {
    clearTimeout(loadTimer);
    if (!document.hidden) load().finally(schedule);
  });
}
