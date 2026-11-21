// Page du profil : 0.31 · détails des jeux depuis Discord. Le Rich Presence que les jeux envoient
// eux-mêmes à Discord (mode, carte, score, groupe…), lu via Lanyard, ajouté au jeu en cours.
// Fonctions pures (sans DOM), testées dans src/js/test/site-richpresence.test.mjs.

/** Hôtes d'images Discord acceptés (images d'application et proxy média). */
const HOTES = new Set(['cdn.discordapp.com', 'media.discordapp.net']);
/** Lecteurs de musique (déjà affichés par la page Musique et la carte Spotify). */
const MUSIQUE =
  /^(spotify|apple music|itunes|deezer|tidal|soundcloud|youtube music|amazon music|qobuz|musicbee|foobar2000|aimp|winamp|cider|tidal-hifi)$/i;
const MAX = 128;

const texte = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, MAX) : '');
const chiffres = (v) => typeof v === 'string' && /^\d{15,22}$/.test(v);

/**
 * Adresse https d'une image d'activité Discord, ou '' :
 * `mp:external/…` ou `mp:attachments/…` → https://media.discordapp.net/…,
 * identifiant d'image → https://cdn.discordapp.com/app-assets/<application_id>/<id>.png.
 * Toute autre forme (spotify:, twitch:, adresse quelconque) est ignorée.
 */
export function imageDiscord(a, cle) {
  const v = a && a.assets && a.assets[cle];
  if (typeof v !== 'string' || !v) return '';
  let url = '';
  if (/^mp:[\w./%-]+$/.test(v) && !v.includes('..')) url = `https://media.discordapp.net/${v.slice(3)}`;
  else if (/^\d{5,25}$/.test(v) && chiffres(a.application_id))
    url = `https://cdn.discordapp.com/app-assets/${a.application_id}/${v}.png`;
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && HOTES.has(u.hostname) ? u.href : '';
  } catch {
    return '';
  }
}

/** Nom comparable : minuscules, sans accents, sans ™ ® ni ponctuation. */
export const nomSouple = (n) =>
  String(n || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

/** Même jeu ? Égalité souple, ou l'un commence par l'autre (« Minecraft » / « Minecraft Java Edition »). */
export function memeJeu(a, b) {
  const x = nomSouple(a),
    y = nomSouple(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return Math.min(x.length, y.length) >= 4 && (x.startsWith(y) || y.startsWith(x));
}

/**
 * Jeux en cours d'après Lanyard, à afficher : activités « Joue à » (type 0) avec des détails, qui ne
 * viennent ni de KuroPurr (`status.appsKuropurr`) ni d'un lecteur de musique ; rien si la page ne
 * doit pas les montrer (`status.discordJeux` faux : option coupée, jeu en cours caché, activité masquée).
 */
export function jeuxDiscord(lanyard, status) {
  if (!status || status.discordJeux !== true || !lanyard || !Array.isArray(lanyard.activities)) return [];
  const apps = new Set((Array.isArray(status.appsKuropurr) ? status.appsKuropurr : []).map(String));
  const out = [];
  for (const a of lanyard.activities) {
    if (!a || a.type !== 0) continue;
    const nom = texte(a.name);
    if (!nom || MUSIQUE.test(nom) || a.id === 'spotify:1') continue;
    if (a.application_id != null && apps.has(String(a.application_id))) continue;
    const details = texte(a.details),
      etat = texte(a.state);
    if (!details && !etat) continue;
    const size = a.party && Array.isArray(a.party.size) ? a.party.size.map(Number) : [];
    const groupe =
      size.length === 2 && size.every((n) => Number.isInteger(n) && n > 0 && n < 10000) && size[0] <= size[1]
        ? size
        : null;
    const debut = Number(a.timestamps && a.timestamps.start);
    out.push({
      nom,
      details,
      etat,
      groupe,
      debut: Number.isFinite(debut) && debut > 1e12 && debut <= Date.now() + 60000 ? debut : null,
      image: imageDiscord(a, 'large_image'),
      imageTexte: texte(a.assets && a.assets.large_text),
      petite: imageDiscord(a, 'small_image'),
      petiteTexte: texte(a.assets && a.assets.small_text),
    });
  }
  return out;
}

/**
 * Range les jeux Discord : ceux que KuroPurr affiche déjà (même nom, souple) sont rattachés à son
 * activité (`fusions` : index de l'activité → jeu Discord), les autres forment leurs propres cartes.
 */
export function placer(activites, jeux) {
  const fusions = new Map();
  const autres = [];
  for (const j of jeux) {
    const i = activites.findIndex((a, k) => a && a.type === 'jeu' && !fusions.has(k) && memeJeu(a.nom, j.nom));
    if (i >= 0) fusions.set(i, j);
    else autres.push(j);
  }
  return { fusions, autres };
}
