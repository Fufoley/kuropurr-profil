// Page du profil (0.31) : écran d'entrée façon « clique pour découvrir » avec le choix de la langue,
// curseur « chat » (souris seulement) et musique d'ambiance (jamais lancée sans un clic).
// L'écran d'entrée et la musique se règlent dans KuroPurr (status.json : `ecranEntree`, `entree`,
// `musiqueFond`, `curseur`). Le choix de langue, le volume et « couper » restent dans ce navigateur.
import { $, el, safeUrl } from './outils.js?v=0.35.0';
import { choisirLangue, langue, LISTE, surChangement, t, traduirePage } from './i18n.js?v=0.35.0';

let entre = false;
let parClic = false; // la page a été ouverte par le clic d'entrée (le navigateur permet alors la lecture)
let musique = '';
let audio = null;

/* ---------------- Langue ---------------- */
function boutonsLangue() {
  const box = $('entreeLangues');
  if (box)
    box.replaceChildren(
      ...LISTE.map(([code, drapeau, nom]) =>
        el(
          'button',
          {
            class: `entree-langue ${code === langue ? 'on' : ''}`,
            type: 'button',
            'data-langue': code,
            'aria-pressed': code === langue ? 'true' : 'false',
            lang: code,
            onclick: (e) => {
              e.stopPropagation();
              choisirLangue(code);
            },
          },
          el('span', { class: 'drapeau', 'aria-hidden': 'true' }, drapeau),
          nom,
        ),
      ),
    );
  const b = $('langueBtn');
  if (b) {
    const l = LISTE.find((x) => x[0] === langue) || LISTE[0];
    b.textContent = `${l[1]} ${l[2]}`;
    b.setAttribute('aria-label', `${t('Langue')} : ${l[2]}`);
  }
}

/* ---------------- Écran d'entrée ---------------- */
function entrer() {
  if (entre) return;
  entre = true;
  const e = $('entree');
  parClic = true;
  if (e) {
    e.classList.add('parti');
    setTimeout(() => e.remove(), 450);
  }
  document.body.classList.remove('avant-entree');
  lancerMusique(true);
}

/** Appelé à chaque rendu (status.json lu). */
export function appliquerEntree(s) {
  // Curseur chat : seulement avec une souris (jamais sur un écran tactile)
  const souris = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.documentElement.classList.toggle('kp-curseur', !!s.curseur && souris);
  const p = $('entreePseudo');
  if (p) p.textContent = s.pseudo || '';
  const texte = $('entreeTexte');
  if (texte) {
    // Texte choisi dans KuroPurr : tel quel ; sinon le texte de la page, traduit
    if (s.entree) {
      texte.removeAttribute('data-i18n');
      texte.textContent = s.entree;
    }
  }
  if (!entre && s.ecranEntree === false) {
    // Écran d'entrée coupé dans KuroPurr : la page s'ouvre directement (et la musique attend un clic)
    entre = true;
    $('entree')?.remove();
    document.body.classList.remove('avant-entree');
  }
  preparerMusique(s.musiqueFond);
}

/* ---------------- Musique d'ambiance ---------------- */
const CLE_AMBIANCE = 'kp-ambiance';
function reglagesAmbiance() {
  try {
    const r = JSON.parse(localStorage.getItem(CLE_AMBIANCE) || '{}');
    return { vol: Number.isFinite(r.vol) ? Math.min(1, Math.max(0, r.vol)) : 0.15, coupe: !!r.coupe };
  } catch {
    return { vol: 0.15, coupe: false };
  }
}
function garderAmbiance(r) {
  try {
    localStorage.setItem(CLE_AMBIANCE, JSON.stringify(r));
  } catch {
    /* navigation privée : réglage pour cette visite seulement */
  }
}
function majBouton() {
  const b = $('ambianceBtn');
  if (!b) return;
  const joue = audio && !audio.paused && !audio.muted;
  b.textContent = joue ? '♪' : '🔇';
  b.classList.toggle('coupe', !joue);
  b.setAttribute('aria-label', joue ? t('Couper la musique') : t('Lancer la musique'));
  b.title = b.getAttribute('aria-label');
}
function preparerMusique(src) {
  const box = $('ambiance');
  const url = src && /^(https:\/\/|musique\.[a-z0-9]+$)/i.test(src) ? safeUrl(src) : '';
  if (url === musique) {
    if (box) box.hidden = !url || !entre;
    document.body.classList.toggle('avec-ambiance', !!url && entre);
    return;
  }
  musique = url;
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (box) box.hidden = !url || !entre;
  document.body.classList.toggle('avec-ambiance', !!url && entre);
  majBouton();
  // Musique connue après le clic d'entrée (statut lu un peu plus tard) : elle démarre maintenant
  if (url && parClic) lancerMusique(true);
}
/** `apresClic` : appelé par le clic d'entrée (geste de l'utilisateur, la lecture est permise). */
function lancerMusique(apresClic) {
  const box = $('ambiance');
  if (!musique) return;
  if (box) box.hidden = false;
  document.body.classList.add('avec-ambiance');
  const r = reglagesAmbiance();
  $('ambianceVol').value = String(Math.round(r.vol * 100));
  if (!apresClic || r.coupe) return majBouton();
  jouer();
}
function jouer() {
  if (!musique) return;
  const r = reglagesAmbiance();
  if (!audio) {
    audio = new Audio(musique);
    audio.loop = true;
    audio.preload = 'auto';
    audio.addEventListener('play', majBouton);
    audio.addEventListener('pause', majBouton);
  }
  audio.volume = r.vol;
  audio.muted = false;
  audio.play().catch(() => majBouton());
  majBouton();
}

export function brancherEntree() {
  document.body.classList.add('avant-entree');
  boutonsLangue();
  traduirePage();
  surChangement(boutonsLangue);
  $('entreeClic')?.addEventListener('click', entrer);
  $('entree')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') entrer();
  });
  $('entreeClic')?.focus({ preventScroll: true });
  $('langueBtn')?.addEventListener('click', () => {
    const i = LISTE.findIndex((x) => x[0] === langue);
    choisirLangue(LISTE[(i + 1) % LISTE.length][0]);
  });
  $('ambianceBtn')?.addEventListener('click', () => {
    const r = reglagesAmbiance();
    if (audio && !audio.paused && !audio.muted) {
      audio.pause();
      garderAmbiance({ ...r, coupe: true });
    } else {
      garderAmbiance({ ...r, coupe: false });
      jouer();
    }
  });
  $('ambianceVol')?.addEventListener('input', (e) => {
    const vol = Math.min(1, Math.max(0, Number(e.target.value) / 100));
    garderAmbiance({ ...reglagesAmbiance(), vol });
    if (audio) audio.volume = vol;
  });
}
