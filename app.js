// Page du profil : lit status.json (poussé par KuroPurr dans le dépôt GitHub) et l'affiche.
// Heures absolues partout : les barres avancent toutes seules, et le profil passe « hors ligne »
// si le statut n'est plus rafraîchi. Lus directement par la page, sans clé : Lanyard (Discord), hits.sh (vues).
// Ce fichier reste un script classique (ancien index.html en cache compatible) : il déclare la version et le
// journal du site (le diagnostic de KuroPurr lit `SITE_VERSION` ici), puis charge le code, découpé en modules
// dans js/. `0.29.2` est remplacé par la version de KuroPurr à l'installation : tous les fichiers changent d'adresse
// ensemble, le navigateur ne mélange jamais ancien et nouveau code.
(function () {
  'use strict';
  const SITE_VERSION = '3.5';
  // Journal du site (le journal de KuroPurr vient de status.json)
  const SITE_LOG = [
    [
      '3.5',
      'Code du site découpé en modules, sans changement visible. Correction : la page ne plante plus quand le journal est présent sans données Spotify.',
    ],
    ['3.4', 'Sécurité : liens et images filtrés (aucun lien « javascript: » possible, même venant d’un autre site).'],
    [
      '3.3',
      'Carte « En ce moment dans ma vie », comptes à rebours « Bientôt », tuile Habitudes. Mise à jour « en direct » quand je joue ou écoute. Thèmes de saison (Halloween, Noël, Nouvel An). Carte du monde des visiteurs. Mes critiques d’animés et de jeux.',
    ],
    [
      '3.2',
      'Animés en cours (anime-sama, via l’extension KuroPurr) dans l’activité, avec affiche et épisode. Statut « Concentré » pendant le mode focus. Coups de cœur Spotify dans la tuile Playlist. Heures d’animé et de focus dans les stats et les récaps.',
    ],
    [
      '3.0',
      'Page Divers : activité sur un an, trophées, tops, records, récap du mois, horaires, setup, collection, livre d’or, playlist des visiteurs, bouton coucou, visiteurs par pays, Cat.exe. Compteur GoatCounter. Journal des versions (clic sur les versions). Pochettes dans l’activité. Affichage mobile.',
    ],
    ['2.2', 'Page Musique : Spotify (écoutes, tops, playlists), KuroPurr Musique à venir.'],
    ['2.1', 'Médiathèque : séries et films via Simkl.'],
    ['2.0', 'Médiathèque : anime, manga, séries, films.'],
    ['1.9', 'Page Anime (MyAnimeList).'],
    ['1.8', 'Page Jeux en grille : Steam, Roblox, Minecraft.'],
    ['1.7', 'Carte Discord enrichie, badges déclarés.'],
    ['1.6', 'Posts & Projets.'],
    ['1.5', 'Refonte : carrés transparents, page Profil.'],
  ];
  import('./js/main.js?v=0.29.2').then((m) => m.demarrer(SITE_VERSION, SITE_LOG));
})();
