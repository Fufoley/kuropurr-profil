// Page du profil : langue du site (français, anglais, espagnol). Le texte fixe de la page passe par
// `t('texte en français', { variables })` ; les traductions sont dans langues.js, rangées par texte
// français (un texte sans traduction reste en français). Les textes saisis dans KuroPurr (pseudo,
// description, posts…) et les titres (jeux, animés, musiques) ne sont jamais traduits.
// La langue choisie est gardée dans le navigateur (localStorage, s'il est disponible).
import { LANGUES } from './langues.js?v=0.35.0';

const CLE = 'kp-langue';
export const LISTE = [
  ['fr', '🇫🇷', 'Français'],
  ['en', '🇬🇧', 'English'],
  ['es', '🇪🇸', 'Español'],
];
const LOCALES = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES' };

function lire() {
  try {
    const l = localStorage.getItem(CLE);
    return LOCALES[l] ? l : '';
  } catch {
    return '';
  }
}

/** Langue gardée par ce navigateur ('' si jamais choisie). */
export const langueGardee = lire;

export let langue = lire() || 'fr';

/** Locale des dates et des nombres (« fr-FR », « en-GB », « es-ES »). */
export const locale = () => LOCALES[langue] || 'fr-FR';

/** Texte traduit ; `{nom}` est remplacé par `vars.nom`. */
export function t(fr, vars) {
  const tr = langue !== 'fr' && LANGUES[langue] ? LANGUES[langue][fr] : null;
  let s = tr || fr;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

/** Singulier ou pluriel (`{n}` = le nombre). */
export const pl = (n, un, plusieurs, vars) => t(Number(n) > 1 ? plusieurs : un, { n, ...(vars || {}) });

/** Traduit le texte fixe de index.html : `data-i18n` (texte), `data-i18n-title`, `data-i18n-aria`. */
export function traduirePage(racine = document) {
  for (const n of racine.querySelectorAll('[data-i18n]')) n.textContent = t(n.dataset.i18n);
  for (const n of racine.querySelectorAll('[data-i18n-title]')) n.title = t(n.dataset.i18nTitle);
  for (const n of racine.querySelectorAll('[data-i18n-aria]')) n.setAttribute('aria-label', t(n.dataset.i18nAria));
  document.documentElement.lang = langue;
}

const ecouteurs = [];
/** Appelé à chaque changement de langue (la page se redessine). */
export const surChangement = (f) => ecouteurs.push(f);

export function choisirLangue(l, garder = true) {
  if (!LOCALES[l]) return;
  langue = l;
  if (garder)
    try {
      localStorage.setItem(CLE, l);
    } catch {
      /* navigation privée : la langue vaut pour cette visite */
    }
  traduirePage();
  for (const f of ecouteurs) f(l);
}
