// Page du profil : démarrage, appelé par app.js une fois les modules chargés.
// Les écouteurs sont posés dans l'ordre de l'ancien app.js d'un seul tenant, puis la première lecture part.
import { brancherFenetre, brancherJournaux, brancherPages, render } from './rendu.js?v=0.35.0';
import { brancherJeux } from './jeux.js?v=0.35.0';
import { brancherMediatheque } from './mediatheque.js?v=0.35.0';
import { brancherMusique } from './musique.js?v=0.35.0';
import { brancherOeufs } from './amusements.js?v=0.35.0';
import { demarrerRelecture, status } from './donnees.js?v=0.35.0';
import { brancherEntree } from './entree.js?v=0.35.0';
import { surChangement } from './i18n.js?v=0.35.0';

/** `version` et `journal` : SITE_VERSION et SITE_LOG de app.js. */
export function demarrer(version, journal) {
  // 0.31 : écran d'entrée et langue d'abord (le texte fixe de la page est traduit tout de suite)
  brancherEntree();
  brancherPages();
  brancherJeux();
  brancherMediatheque();
  brancherMusique();
  brancherFenetre();
  brancherOeufs();
  brancherJournaux(version, journal);
  // Changement de langue : la page se redessine (le statut déjà lu suffit)
  surChangement(() => {
    if (status) render();
  });
  demarrerRelecture();
}
