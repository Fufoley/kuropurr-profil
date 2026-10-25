// Page du profil : rendu d'ensemble, pages (onglets), fenêtre modale, pseudo animé et journaux des versions.
import { $, ago, el, isVideo, markdown, safeUrl, since, when } from './outils.js?v=0.29.4';
import { isLive, OFFLINE_AFTER_MS, status } from './donnees.js?v=0.29.4';
import { renderActivity, renderLinks, renderOrga } from './profil.js?v=0.29.4';
import { renderPosts, renderProjects } from './posts.js?v=0.29.4';
import { renderGames } from './jeux.js?v=0.29.4';
import { renderAnime } from './mediatheque.js?v=0.29.4';
import { renderMusic } from './musique.js?v=0.29.4';
import { discordAvatar, lanyard, loadLanyard, renderDiscord } from './discord.js?v=0.29.4';
import { note, renderDivers } from './divers.js?v=0.29.4';
import { views } from './amusements.js?v=0.29.4';

// Version et journal du site : déclarés en tête de app.js (le diagnostic de KuroPurr y lit `SITE_VERSION`).
let SITE_VERSION = '';
let SITE_LOG = [];
let page = location.hash.replace('#', '') || 'profil';

/* ---------------- Rendu ---------------- */
export function render() {
  const s = status;
  document.documentElement.style.setProperty('--accent', s.accent || '#a9c59b');
  const bg = $('bg');
  if (bg.dataset.src !== s.fond) {
    bg.dataset.src = s.fond;
    bg.replaceChildren();
    if (s.fond) {
      if (isVideo(s.fond)) {
        const v = el('video', { autoplay: '', muted: '', loop: '', playsinline: '' });
        v.muted = true;
        v.src = safeUrl(s.fond);
        bg.append(v);
      } else bg.append(el('img', { src: s.fond, alt: '' }));
    }
  }
  document.title = s.pseudo ? `${s.pseudo} · profil` : 'Profil';

  // Haut : statut KuroPurr, versions
  const age = s.majLe ? Date.now() - Date.parse(s.majLe) : Infinity;
  const online = !!s.enLigne && age < OFFLINE_AFTER_MS;
  $('dot').className = `dot ${online ? (s.nePasDeranger ? 'dnd' : 'on') : ''}`;
  $('statusText').textContent = online
    ? s.focus && s.focus.actif && Date.parse(s.focus.jusqua) > Date.now()
      ? `🎯 Concentré · encore ${Math.max(1, Math.ceil((Date.parse(s.focus.jusqua) - Date.now()) / 60000))} min`
      : `${s.nePasDeranger ? 'Ne pas déranger' : 'En ligne'}${s.enLigneDepuis ? ` · depuis ${since(s.enLigneDepuis)}` : ''}`
    : s.vu && s.vu.quand
      ? `Hors ligne · vu ${ago(s.vu.quand)}${s.vu.source ? ` sur ${s.vu.source}` : ''}`
      : s.majLe
        ? `Hors ligne · depuis ${when(s.majLe)}`
        : 'Hors ligne';
  $('verClient').textContent = s.versionClient || '—';
  $('verSite').textContent = SITE_VERSION;

  // Gros carré
  const img = $('avatar');
  const dcAvatar = lanyard && lanyard.discord_user ? discordAvatar(lanyard.discord_user) : '';
  const avatar = s.avatar || dcAvatar || 'logo.png';
  if (img.dataset.src !== avatar) {
    img.dataset.src = avatar;
    img.src = avatar;
    img.onerror = () => {
      img.src = 'logo.png';
    };
  }
  typewrite(s.pseudo || 'Quelqu’un');
  const tags = s.badges
    .flatMap((b) => String(b).split(/[,•·|;]+/))
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 3);
  $('tags').replaceChildren(
    ...tags
      .flatMap((t, i) => [i ? el('span', { class: 'sep' }, '•') : null, el('span', { class: 'tag' }, t)])
      .filter(Boolean),
  );
  // markdown() échappe tout avant balisage
  // nosemgrep
  $('description').innerHTML = markdown(s.description);

  renderDiscord(s);
  renderActivity(s, online);
  renderOrga(s);
  renderLinks(s);
  renderPosts(s);
  renderProjects(s);
  renderGames(s);
  renderAnime(s);
  renderMusic(s);
  renderDivers(s);
  showPage(page);
  // 0.23 : thème de saison (réglable dans KuroPurr) et indicateur « en direct »
  if (window.KP_EXTRAS) window.KP_EXTRAS.appliquerSaison(s.saisons !== false);
  $('liveTag').hidden = !isLive(s);

  $('updated').textContent = s.majLe ? `Dernière mise à jour : ${when(s.majLe)}` : 'Pas encore de mise à jour';
  loadLanyard(s.discordId);
  views(s.compteur, s.compteurCode);
}

/* ---------------- Pages ---------------- */
function showPage(id) {
  page = id;
  for (const b of $('nav').children) b.classList.toggle('on', b.dataset.page === id);
  for (const m of document.querySelectorAll('[data-page]')) if (m.tagName === 'MAIN') m.hidden = m.dataset.page !== id;
}
export function brancherPages() {
  $('nav').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    history.replaceState(null, '', `#${b.dataset.page}`);
    showPage(b.dataset.page);
  });
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#', '');
    if (id && document.querySelector(`main[data-page="${id}"]`)) showPage(id);
  });
}

/* ---------------- Fenêtres : image agrandie, fiche par-dessus la page ---------------- */
export function zoom(src) {
  const z = el('div', { class: 'zoom', onclick: () => z.remove() }, el('img', { src, alt: '' }));
  document.body.append(z);
}
/** Fenêtre générique par-dessus la page (listes complètes). */
export function openSheet(title, nodes) {
  $('modalBody').replaceChildren(el('h1', { class: 'sheet-title' }, title), ...nodes.flat(2).filter(Boolean));
  $('modal').hidden = false;
}
export function brancherFenetre() {
  $('modalClose').addEventListener('click', () => {
    $('modal').hidden = true;
  });
  $('modal').addEventListener('click', (e) => {
    if (e.target === $('modal')) $('modal').hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('modal').hidden = true;
  });
}

/* ---------------- Pseudo animé ---------------- */
let typed = '',
  typing = null;
function typewrite(text) {
  if (typed === text) return;
  typed = text;
  clearInterval(typing);
  const out = $('pseudo');
  out.textContent = '';
  let i = 0;
  typing = setInterval(() => {
    out.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(typing);
  }, 80);
}

/* ---------------- Journal des versions ---------------- */
export function brancherJournaux(version, journal) {
  SITE_VERSION = version;
  SITE_LOG = journal;
  $('verClientBtn').addEventListener('click', () => {
    const j = (status && status.journal) || [];
    openSheet(
      'Journal de KuroPurr',
      j.length
        ? j.map((r) => {
            const d = el('div', { class: 'md rel' });
            // markdown() échappe tout avant balisage
            // nosemgrep
            d.innerHTML = markdown(`## ${r.version}`) + markdown(r.notes);
            return d;
          })
        : [note('Pas de journal disponible.')],
    );
    $('modal').querySelector('.modal-box').classList.add('wide');
  });
  $('verSiteBtn').addEventListener('click', () => {
    openSheet(
      'Journal du site',
      SITE_LOG.map(([v, t]) => el('div', { class: 'rel' }, el('h2', {}, v), el('p', {}, t))),
    );
    $('modal').querySelector('.modal-box').classList.remove('wide');
  });
}
