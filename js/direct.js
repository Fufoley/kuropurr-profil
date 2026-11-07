// Page du profil : 0.31 · mise à jour instantanée. KuroPurr publie un tout petit signal (l'heure du
// status.json envoyé, rien de personnel) sur un sujet ntfy public dédié au site, annoncé dans status.json
// (`direct: { serveur, sujet }`). La page s'y abonne (flux SSE) tant que l'onglet est visible et relit
// status.json dès qu'un signal arrive ; la relecture périodique reste là si le flux ne marche pas.
// Seul le serveur ntfy autorisé par la CSP de la page peut être joint.

const SERVEUR = /^https:\/\/[a-z0-9.-]+(:\d{1,5})?$/i;
const SUJET = /^[0-9a-f]{32}$/;
const ATTENTE_MIN = 2000,
  ATTENTE_MAX = 120000;

/** Adresse du flux, ou '' si `direct` est absent ou douteux. */
export function adresseFlux(direct) {
  if (!direct || typeof direct !== 'object') return '';
  const serveur = String(direct.serveur || '').replace(/\/+$/, '');
  const sujet = String(direct.sujet || '');
  if (!SERVEUR.test(serveur) || !SUJET.test(sujet)) return '';
  return `${serveur}/${sujet}/sse`;
}

/** Attente avant de se reconnecter : 2 s, 4 s, 8 s… jusqu'à 2 min. */
export const attenteReconnexion = (echecs) => Math.min(ATTENTE_MAX, ATTENTE_MIN * 2 ** Math.min(echecs, 8));

let url = '',
  source = null,
  echecs = 0,
  minuterie = null,
  surSignal = null,
  branche = false;

function fermer() {
  clearTimeout(minuterie);
  minuterie = null;
  if (source) {
    source.close();
    source = null;
  }
}

function ouvrir() {
  fermer();
  if (!url || document.hidden || typeof window.EventSource !== 'function') return;
  let es;
  try {
    es = new window.EventSource(url);
  } catch {
    return;
  }
  source = es;
  es.onopen = () => {
    echecs = 0;
  };
  es.onmessage = (e) => {
    let maj = '';
    try {
      const d = JSON.parse(e.data);
      if (d && d.event && d.event !== 'message') return;
      if (d && typeof d.message === 'string') maj = d.message.slice(0, 64);
    } catch {
      /* contenu inattendu : on relit quand même (la relecture est limitée) */
    }
    if (surSignal) surSignal(maj);
  };
  // Le navigateur se reconnecterait tout seul, sans attendre : on ferme et on réessaie de plus en plus tard
  es.onerror = () => {
    if (source !== es) return;
    es.close();
    source = null;
    echecs += 1;
    minuterie = setTimeout(ouvrir, attenteReconnexion(echecs));
  };
}

/** (Re)branche le flux d'après status.json ; `signal(majLe)` est appelé à chaque message reçu. */
export function configurerDirect(direct, signal) {
  surSignal = signal;
  if (!branche) {
    branche = true;
    // Onglet caché : flux coupé ; de retour : rebranché
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) fermer();
      else if (url && !source) {
        echecs = 0;
        ouvrir();
      }
    });
  }
  const nouvelle = adresseFlux(direct);
  if (nouvelle === url) {
    if (url && !source && !minuterie && !document.hidden) ouvrir();
    return;
  }
  url = nouvelle;
  echecs = 0;
  if (url) ouvrir();
  else fermer();
}
