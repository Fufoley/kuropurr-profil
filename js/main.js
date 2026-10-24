// Page du profil : démarrage, appelé par app.js une fois les modules chargés.
// Les écouteurs sont posés dans l'ordre de l'ancien app.js d'un seul tenant, puis la première lecture part.
import { brancherFenetre, brancherJournaux, brancherPages } from './rendu.js?v=0.29.2';
import { brancherJeux } from './jeux.js?v=0.29.2';
import { brancherMediatheque } from './mediatheque.js?v=0.29.2';
import { brancherMusique } from './musique.js?v=0.29.2';
import { brancherOeufs } from './amusements.js?v=0.29.2';
import { demarrerRelecture } from './donnees.js?v=0.29.2';

/** `version` et `journal` : SITE_VERSION et SITE_LOG de app.js. */
export function demarrer(version, journal) {
  brancherPages();
  brancherJeux();
  brancherMediatheque();
  brancherMusique();
  brancherFenetre();
  brancherOeufs();
  brancherJournaux(version, journal);
  demarrerRelecture();
}
