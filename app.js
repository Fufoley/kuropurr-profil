// Page du profil : lit status.json (poussé par KuroPurr dans le dépôt GitHub) et l'affiche.
// Heures absolues partout : les barres avancent toutes seules, et le profil passe « hors ligne »
// si le statut n'est plus rafraîchi. Lus directement par la page, sans clé : Lanyard (Discord), hits.sh (vues).
(function () {
  'use strict';
  const SITE_VERSION = '3.1';
  // Journal du site (le journal de KuroPurr vient de status.json)
  const SITE_LOG = [
    ['3.0', 'Page Divers : activité sur un an, trophées, tops, records, récap du mois, horaires, setup, collection, livre d’or, playlist des visiteurs, bouton coucou, visiteurs par pays, Cat.exe. Compteur GoatCounter. Journal des versions (clic sur les versions). Pochettes dans l’activité. Affichage mobile.'],
    ['2.2', 'Page Musique : Spotify (écoutes, tops, playlists), KuroPurr Musique à venir.'],
    ['2.1', 'Médiathèque : séries et films via Simkl.'],
    ['2.0', 'Médiathèque : anime, manga, séries, films.'],
    ['1.9', 'Page Anime (MyAnimeList).'],
    ['1.8', 'Page Jeux en grille : Steam, Roblox, Minecraft.'],
    ['1.7', 'Carte Discord enrichie, badges déclarés.'],
    ['1.6', 'Posts & Projets.'],
    ['1.5', 'Refonte : carrés transparents, page Profil.'],
  ];
  const CONFIG = window.KP_PROFIL || {};
  const REFRESH_MS = 8000;
  const OFFLINE_AFTER_MS = 3 * 60 * 1000;
  const LANYARD_MS = 30000;
  const HISTORY_SHORT = 3;
  const HISTORY_DAYS = 7;
  const LINKS_SHORT = 6;
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); }
    n.append(...kids.flat(2).filter((k) => k != null && k !== false));
    return n;
  };

  let status = null, lanyard = null;
  let projectFilter = 'all', postTag = '', lib = 'steam', steamFilter = 'all';
  const gstate = { steam: { q: '', genre: '', sort: 'hours', desc: true }, roblox: { q: '', genre: '', sort: 'hours', desc: true }, anime: { q: '', genre: '', sort: 'score', desc: true }, manga: { q: '', genre: '', sort: 'score', desc: true }, series: { q: '', genre: '', sort: 'updated', desc: true }, films: { q: '', genre: '', sort: 'updated', desc: true }, spotify: { q: '', genre: '', sort: 'date', desc: true } };
  let aniKind = 'anime', aniFilter = 'all';
  let mus = 'spotify', musView = 'ecoutes';
  let page = location.hash.replace('#', '') || 'profil';

  const DEFAULTS = { enLigne: false, enLigneDepuis: null, nePasDeranger: false, majLe: null, versionClient: '', pseudo: '', avatar: '', description: '', badges: [], discordId: '', badgesDiscord: [], liens: [], fond: '', accent: '', jeu: { actif: false }, musique: { actif: false }, activites: [], projets: [], posts: [], tagsPosts: [], steam: null, roblox: null, compteur: false };
  const normalize = (raw) => {
    const s = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
    for (const k of ['jeu', 'musique']) if (!s[k] || typeof s[k] !== 'object') s[k] = { actif: false };
    for (const k of ['badges', 'liens', 'activites', 'projets', 'posts', 'tagsPosts', 'badgesDiscord']) if (!Array.isArray(s[k])) s[k] = [];
    if (!s.steam || !Array.isArray(s.steam.jeux)) s.steam = null; else if (!Array.isArray(s.steam.souhaits)) s.steam.souhaits = [];
    if (!s.roblox || !Array.isArray(s.roblox.jeux)) s.roblox = null;
    if (!s.spotify || typeof s.spotify !== 'object') s.spotify = null;
    if (!s.divers || typeof s.divers !== 'object') s.divers = null;
    else { if (!Array.isArray(s.divers.tuiles)) s.divers.tuiles = []; if (!s.divers.evenements || typeof s.divers.evenements !== 'object') s.divers.evenements = {}; }
    if (!Array.isArray(s.journal)) s.journal = [];
    else for (const k of ['ecoutes', 'topArtistes', 'topTitres', 'playlists']) if (!Array.isArray(s.spotify[k])) s.spotify[k] = [];
    return s;
  };
  function sources() {
    const list = [];
    if (CONFIG.repo) list.push(`https://raw.githubusercontent.com/${CONFIG.repo}/${CONFIG.branche || 'status'}/status.json`);
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
      } catch { /* source suivante */ }
    }
    if (!status) status = normalize(null);
    render();
  }

  /* ---------------- Outils ---------------- */
  const pad = (n) => String(n).padStart(2, '0');
  const fmtTime = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  const dur = (sec) => { const m = Math.round(sec / 60); return m < 1 ? '< 1 min' : m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${pad(m % 60)}` : `${Math.floor(m / 1440)} j ${Math.floor((m % 1440) / 60)} h`; };
  const since = (iso) => dur((Date.now() - Date.parse(iso)) / 1000);
  const clock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();
  const ago = (iso) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.floor(m / 60)} h` : m < 43200 ? `il y a ${Math.floor(m / 1440)} j` : when(iso); };
  const when = (iso) => { const t = Date.parse(iso); return isToday(iso) ? `aujourd’hui à ${clock.format(t)}` : `le ${dateFmt.format(t)} à ${clock.format(t)}`; };
  const isVideo = (u) => /\.(mp4|webm)(\?|$)/i.test(u);
  const svg = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'i'); s.innerHTML = d; return s; };
  const ICONS = {
    jeu: '<path d="M7.5 8h9a4.5 4.5 0 0 1 4.4 5.5l-.8 3.5a2.2 2.2 0 0 1-3.8 1l-2-2.2h-4.6l-2 2.2a2.2 2.2 0 0 1-3.8-1l-.8-3.5A4.5 4.5 0 0 1 7.5 8z"/>',
    musique: '<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  };
  const SOCIAL = { discord: '#5865f2', twitch: '#9146ff', youtube: '#ff2d2d', github: '#8b949e', x: '#cfd3d8', twitter: '#1d9bf0', instagram: '#e1306c', tiktok: '#69c9d0', steam: '#66c0f4', spotify: '#1db954', roblox: '#e2231a', reddit: '#ff4500', kick: '#53fc18', myanimelist: '#2e51a2', anilist: '#3db4f2', bluesky: '#0085ff', mastodon: '#6364ff', linkedin: '#0a66c2', patreon: '#ff424d', kofi: '#ff5e5b', deezer: '#a238ff', soundcloud: '#ff5500', snapchat: '#fffc00', telegram: '#26a5e4', site: '#a9c59b', mail: '#a9c59b' };
  const colorOf = (name) => SOCIAL[String(name).toLowerCase().replace(/[^a-z]/g, '')] || (status && status.accent) || '#a9c59b';

  /** Markdown minimal et sûr (tout est échappé avant balisage). */
  function markdown(src) {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<u>$1</u>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<s>$1</s>')
      .replace(/!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const lines = String(src || '').replace(/\r/g, '').split('\n');
    const out = []; let i = 0, para = [], list = null;
    const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
    const flushL = () => { if (list) { out.push(`<${list.tag}>${list.items.map((x) => `<li>${inline(x)}</li>`).join('')}</${list.tag}>`); list = null; } };
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) { flushP(); flushL(); const code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); i++; continue; }
      const h = l.match(/^(#{1,3})\s+(.*)/);
      if (h) { flushP(); flushL(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
      const li = l.match(/^\s*([-*•]|\d+[.)])\s+(.*)/);
      if (li) { flushP(); const tag = /\d/.test(li[1]) ? 'ol' : 'ul'; if (!list || list.tag !== tag) { flushL(); list = { tag, items: [] }; } list.items.push(li[2]); i++; continue; }
      const q = l.match(/^>\s?(.*)/);
      if (q) { flushP(); flushL(); out.push(`<blockquote>${inline(q[1])}</blockquote>`); i++; continue; }
      if (!l.trim()) { flushP(); flushL(); i++; continue; }
      flushL(); para.push(l); i++;
    }
    flushP(); flushL();
    return out.join('');
  }

  /* ---------------- Rendu ---------------- */
  function render() {
    const s = status;
    document.documentElement.style.setProperty('--accent', s.accent || '#a9c59b');
    const bg = $('bg');
    if (bg.dataset.src !== s.fond) {
      bg.dataset.src = s.fond; bg.replaceChildren();
      if (s.fond) {
        if (isVideo(s.fond)) { const v = el('video', { autoplay: '', muted: '', loop: '', playsinline: '' }); v.muted = true; v.src = s.fond; bg.append(v); }
        else bg.append(el('img', { src: s.fond, alt: '' }));
      }
    }
    document.title = s.pseudo ? `${s.pseudo} · profil` : 'Profil';

    // Haut : statut KuroPurr, versions
    const age = s.majLe ? Date.now() - Date.parse(s.majLe) : Infinity;
    const online = !!s.enLigne && age < OFFLINE_AFTER_MS;
    $('dot').className = `dot ${online ? (s.nePasDeranger ? 'dnd' : 'on') : ''}`;
    $('statusText').textContent = online
      ? `${s.nePasDeranger ? 'Ne pas déranger' : 'En ligne'}${s.enLigneDepuis ? ` · depuis ${since(s.enLigneDepuis)}` : ''}`
      : s.vu && s.vu.quand ? `Hors ligne · vu ${ago(s.vu.quand)}${s.vu.source ? ` sur ${s.vu.source}` : ''}` : s.majLe ? `Hors ligne · depuis ${when(s.majLe)}` : 'Hors ligne';
    $('verClient').textContent = s.versionClient || '—';
    $('verSite').textContent = SITE_VERSION;

    // Gros carré
    const img = $('avatar');
    const dcAvatar = lanyard && lanyard.discord_user ? discordAvatar(lanyard.discord_user) : '';
    const avatar = s.avatar || dcAvatar || 'logo.png';
    if (img.dataset.src !== avatar) { img.dataset.src = avatar; img.src = avatar; img.onerror = () => { img.src = 'logo.png'; }; }
    typewrite(s.pseudo || 'Quelqu’un');
    const tags = s.badges.flatMap((b) => String(b).split(/[,•·|;]+/)).map((x) => x.trim()).filter(Boolean).slice(0, 3);
    $('tags').replaceChildren(...tags.flatMap((t, i) => [i ? el('span', { class: 'sep' }, '•') : null, el('span', { class: 'tag' }, t)]).filter(Boolean));
    $('description').innerHTML = markdown(s.description);

    renderDiscord(s);
    renderActivity(s, online);
    renderLinks(s);
    renderPosts(s);
    renderProjects(s);
    renderGames(s);
    renderAnime(s);
    renderMusic(s);
    renderDivers(s);
    showPage(page);

    $('updated').textContent = s.majLe ? `Dernière mise à jour : ${when(s.majLe)}` : 'Pas encore de mise à jour';
    loadLanyard(s.discordId);
    views(s.compteur, s.compteurCode);
  }

  /* ---------------- Activité ---------------- */
  const entryName = (a) => a.url ? el('a', { href: a.url, target: '_blank', rel: 'noopener' }, a.nom) : a.nom;
  const entryIcon = (a, cls) => el('span', { class: cls }, a.image ? el('img', { src: a.image, alt: '', onerror: (e) => e.target.replaceWith(svg(ICONS[a.type] || ICONS.jeu)) }) : svg(ICONS[a.type] || ICONS.jeu));
  function activityRow(a, main) {
    const live = !a.fin;
    const sub = [a.detail, a.source].filter(Boolean).join(' · ');
    const kids = [entryIcon(a, 'ico'), el('div', { class: 'row-text' }, el('strong', {}, entryName(a)),
      el('span', { class: 'muted' }, `${sub}${sub ? ' · ' : ''}${live ? `depuis ${since(a.debut)}` : `${when(a.debut)} · ${dur((Date.parse(a.fin) - Date.parse(a.debut)) / 1000)}`}`))];
    if (live && a.type === 'musique' && a.finPrevue) {
      kids[1].append(el('div', { class: 'bar' }, el('div', { class: 'fill', 'data-start': Date.parse(a.debut), 'data-end': Date.parse(a.finPrevue) })),
        el('span', { class: 'times' }, el('span', { class: 'pos' }, '0:00'), el('span', {}, fmtTime(Date.parse(a.finPrevue) - Date.parse(a.debut)))));
    }
    return el('div', { class: `row ${main ? 'main' : ''}` }, kids);
  }
  function renderActivity(s, online) {
    const all = s.activites.filter((a) => a.debut).sort((a, b) => Date.parse(b.debut) - Date.parse(a.debut));
    // En cours : les sessions ouvertes (si KuroPurr est en ligne) ; la musique reçoit sa fin prévue
    let current = online ? all.filter((a) => !a.fin) : [];
    current = current.map((a) => a.type === 'musique' && s.musique.actif && s.musique.titre === a.nom ? { ...a, finPrevue: s.musique.fin } : a);
    current.sort((a, b) => (a.type === 'jeu' ? 0 : 1) - (b.type === 'jeu' ? 0 : 1));
    const past = all.filter((a) => a.fin);
    const nowBox = $('now'), more = $('nowMore');
    $('nowAll').hidden = true;
    if (current.length) {
      $('nowTitle').textContent = 'Activité en cours';
      nowBox.replaceChildren(activityRow(current[0], true));
      more.hidden = current.length < 2;
      more.textContent = `Voir toutes les activités en cours (${current.length})`;
      more.onclick = () => openSheet('Activités en cours', current.map((a) => activityRow(a, false)));
    } else {
      $('nowTitle').textContent = 'Activité récente';
      nowBox.replaceChildren(past.length ? activityRow(past[0], true) : el('p', { class: 'empty' }, 'Rien pour l’instant.'));
      more.hidden = true;
      if (past.length) past.shift(); // déjà affichée au-dessus
    }
    // Dernières activités : 3 ; la fenêtre montre les 7 derniers jours, par jour
    const limit = Date.now() - HISTORY_DAYS * 86400000;
    const week = past.filter((a) => Date.parse(a.fin) >= limit);
    const histItem = (a) => el('li', {}, entryIcon(a, 'k'),
      el('span', { class: 't' }, entryName(a), el('span', {}, ` · ${[a.detail, a.source].filter(Boolean).join(' · ')}`)),
      el('time', { datetime: a.debut, title: new Date(a.debut).toLocaleString('fr-FR') }, `${isToday(a.debut) ? clock.format(Date.parse(a.debut)) : dateFmt.format(Date.parse(a.debut))} · ${dur((Date.parse(a.fin) - Date.parse(a.debut)) / 1000)}`));
    const shown = week.slice(0, HISTORY_SHORT);
    $('history').replaceChildren(...(shown.length ? shown.map(histItem) : [el('li', { class: 'empty' }, 'Rien d’autre ces 7 derniers jours.')]));
    const hm = $('historyMore');
    hm.hidden = week.length <= HISTORY_SHORT;
    hm.textContent = `Afficher plus (${week.length - HISTORY_SHORT})`;
    hm.onclick = () => {
      const days = [];
      for (const a of week) { const k = new Date(a.debut).toDateString(); let d = days.find((x) => x.k === k); if (!d) { d = { k, label: dayLabel(a.debut), items: [] }; days.push(d); } d.items.push(a); }
      openSheet('7 derniers jours', days.map((d) => el('div', { class: 'day' }, el('h2', {}, d.label), el('ul', { class: 'list' }, d.items.map(histItem)))));
    };
  }
  const dayLabel = (iso) => { const d = new Date(iso); const diff = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000); return diff === 0 ? 'Aujourd’hui' : diff === 1 ? 'Hier' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); };
  function progress() {
    for (const f of document.querySelectorAll('.fill[data-start]')) {
      const start = Number(f.dataset.start), end = Number(f.dataset.end);
      const total = Math.max(1, end - start), pos = Math.min(total, Math.max(0, Date.now() - start));
      f.style.width = `${(pos / total) * 100}%`;
      const p = f.parentElement.nextElementSibling && f.parentElement.nextElementSibling.querySelector('.pos');
      if (p) p.textContent = fmtTime(pos);
    }
  }

  /* ---------------- Liens ---------------- */
  const linkTile = (l) => el('a', { class: 'lnk', href: l.url, target: '_blank', rel: 'noopener', style: `--c:${colorOf(l.nom)}`, title: l.description || l.url },
    el('span', { class: 'pic' }, l.image ? el('img', { src: l.image, alt: '' }) : String(l.nom).charAt(0).toUpperCase()),
    el('strong', {}, l.nom), el('span', {}, l.description || String(l.url).replace(/^https:\/\/(www\.)?/, '')));
  function renderLinks(s) {
    const shown = s.liens.slice(0, LINKS_SHORT);
    $('links').replaceChildren(...(shown.length ? shown.map(linkTile) : [el('p', { class: 'empty', style: 'grid-column:1/-1' }, 'Aucun lien pour l’instant.')]));
    const m = $('linksMore');
    m.hidden = s.liens.length <= LINKS_SHORT;
    m.textContent = `Afficher plus (${s.liens.length - LINKS_SHORT})`;
    m.onclick = () => openSheet('Tous les liens', [el('div', { class: 'links' }, s.liens.map(linkTile))]);
  }

  /* ---------------- Pages ---------------- */
  function showPage(id) {
    page = id;
    for (const b of $('nav').children) b.classList.toggle('on', b.dataset.page === id);
    for (const m of document.querySelectorAll('[data-page]')) if (m.tagName === 'MAIN') m.hidden = m.dataset.page !== id;
  }
  $('nav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; history.replaceState(null, '', `#${b.dataset.page}`); showPage(b.dataset.page); });
  window.addEventListener('hashchange', () => { const id = location.hash.replace('#', ''); if (id && document.querySelector(`main[data-page="${id}"]`)) showPage(id); });

  /* ---------------- Posts ---------------- */
  const POSTS_SHORT = 3;
  const postDate = (iso) => { const t = Date.parse(iso); return isToday(iso) ? `aujourd’hui à ${clock.format(t)}` : new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); };
  const excerpt = (md) => String(md || '').replace(/[#*_`>~\[\]]/g, '').replace(/\(https?:[^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  function postCard(x) {
    return el('button', { class: 'post', type: 'button', onclick: () => openPost(x) },
      el('div', { class: 'ph' }, el('span', {}, x.epingle ? el('span', { class: 'pin' }, '📌 ') : null, postDate(x.date)), x.tags.length ? el('span', { class: 'tagrow' }, x.tags.map((t) => el('span', {}, t))) : null),
      x.images.length ? el('img', { class: 'cover', src: x.images[0], alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null,
      x.titre ? el('strong', {}, x.titre) : null,
      x.texte ? el('p', {}, excerpt(x.texte)) : null);
  }
  function renderPosts(s) {
    const tags = s.tagsPosts.length ? s.tagsPosts : [...new Set(s.posts.flatMap((x) => x.tags))];
    $('ptags').replaceChildren(...(tags.length ? [['', 'Tous'], ...tags.map((t) => [t, t])].map(([id, label]) => el('button', { class: `ptag ${postTag === id ? 'on' : ''}`, type: 'button', onclick: () => { postTag = id; renderPosts(status); } }, label)) : []));
    const list = postTag ? s.posts.filter((x) => x.tags.includes(postTag)) : s.posts;
    const preview = list.slice(0, POSTS_SHORT);
    $('posts').replaceChildren(...(preview.length ? preview.map(postCard) : [el('p', { class: 'empty' }, s.posts.length ? 'Aucun post avec ce tag.' : 'Pas encore de post.')]));
    const m = $('postsMore');
    m.hidden = list.length <= POSTS_SHORT;
    m.textContent = `Voir plus (${list.length - POSTS_SHORT})`;
    m.onclick = () => openSheet(postTag ? `Posts · ${postTag}` : 'Tous les posts', [el('div', { class: 'posts' }, list.map(postCard))]);
  }
  function openPost(x) {
    const imgs = x.images.map((src) => el('img', { class: x.images.length === 1 ? 'one' : '', src, alt: '', loading: 'lazy', onclick: () => zoom(src), onerror: (e) => e.target.remove() }));
    const body = $('modalBody');
    body.replaceChildren(...[
      el('div', { class: 'ph', style: 'display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted)' }, el('span', {}, x.epingle ? '📌 ' : '', postDate(x.date)), x.tags.length ? el('span', { class: 'tagrow' }, x.tags.map((t) => el('span', {}, t))) : null),
      x.titre ? el('h1', { class: 'sheet-title', style: 'margin:6px 0 0' }, x.titre) : null,
      imgs.length ? el('div', { class: 'gallery' }, imgs) : null,
      el('div', { class: 'md' }),
    ].filter(Boolean));
    body.querySelector('.md').innerHTML = markdown(x.texte);
    $('modal').hidden = false;
  }
  function zoom(src) {
    const z = el('div', { class: 'zoom', onclick: () => z.remove() }, el('img', { src, alt: '' }));
    document.body.append(z);
  }

  /* ---------------- Jeux ---------------- */
  const hours = (h) => h >= 1 ? `${Math.round(h * 10) / 10} h` : h > 0 ? `${Math.round(h * 60)} min` : 'jamais lancé';
  $('libSwitch').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; lib = b.dataset.lib; renderGames(status); });
  const gprofile = (p, sub) => p ? el('div', { class: 'gprofile' },
    p.avatar ? el('img', { src: p.avatar, alt: '', onerror: (e) => e.target.replaceWith(el('span', { class: 'ini' }, String(p.nom || '?').charAt(0))) }) : el('span', { class: 'ini' }, String(p.nom || '?').charAt(0)),
    el('div', { class: 'gt' }, el('strong', {}, p.nom || p.pseudo), sub ? el('span', { class: 'muted' }, sub) : null, p.url ? el('a', { href: p.url, target: '_blank', rel: 'noopener' }, 'Voir le profil ↗') : null)) : null;
  const stat = (label, value, id, on, onclick) => el('button', { class: `pstat ${on ? 'on' : ''} ${onclick ? '' : 'static'}`, type: 'button', onclick: onclick || null }, el('span', {}, label), el('b', { class: typeof value === 'string' && value.length > 6 ? 'txt' : '' }, String(value)));
  const SORTS = { steam: [['hours', 'Heures de jeu'], ['recent', 'Heures récentes'], ['last', 'Dernière session'], ['name', 'Nom']], roblox: [['hours', 'Temps de jeu'], ['sessions', 'Sessions'], ['last', 'Dernière session'], ['name', 'Nom']], anime: [['score', 'Ma note'], ['mean', 'Note MAL'], ['progress', 'Épisodes vus'], ['updated', 'Dernière mise à jour'], ['year', 'Année'], ['name', 'Titre']], manga: [['score', 'Ma note'], ['mean', 'Note MAL'], ['progress', 'Chapitres lus'], ['updated', 'Dernière mise à jour'], ['year', 'Année'], ['name', 'Titre']], series: [['updated', 'Dernier épisode vu'], ['score', 'Ma note'], ['mean', 'Note Simkl'], ['progress', 'Épisodes vus'], ['year', 'Année'], ['name', 'Titre']], films: [['updated', 'Dernier visionnage'], ['score', 'Ma note'], ['mean', 'Note Simkl'], ['year', 'Année'], ['name', 'Titre']], spotify: [['date', 'Date d’écoute'], ['duration', 'Durée écoutée'], ['name', 'Titre'], ['artist', 'Artiste']] };
  function steamCard(g, wish) {
    const tag = wish ? ['souhait', 'Souhait'] : g.installe ? ['installe', 'Installé'] : ['noninstalle', 'Non installé'];
    const img = el('img', { src: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`, alt: '', loading: 'lazy' });
    img.onerror = () => { if (!img.dataset.alt) { img.dataset.alt = '1'; img.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`; } else img.remove(); };
    return el('a', { class: 'gcard', href: `https://store.steampowered.com/app/${g.appid}`, target: '_blank', rel: 'noopener', title: g.description || g.nom },
      el('span', { class: 'cov' }, String(g.nom).charAt(0), img, el('span', { class: 'nm' }, el('span', {}, g.nom))),
      el('div', { class: 'gi' },
        wish ? null : el('div', { class: 'nums' }, el('span', {}, el('b', {}, hours(g.heures))), el('span', {}, g.dernier ? `${dateFmt.format(Date.parse(g.dernier))}` : '')),
        g.description ? el('p', {}, g.description) : (g.genres && g.genres.length ? el('p', {}, g.genres.join(' · ')) : null),
        el('span', { class: `st ${tag[0]}` }, tag[1])));
  }
  function robloxCard(g) {
    return el(g.url ? 'a' : 'div', { class: 'gcard', href: g.url || null, target: g.url ? '_blank' : null, rel: 'noopener', title: g.nom },
      el('span', { class: 'cov sq' }, String(g.nom).charAt(0), g.image ? el('img', { src: g.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null, el('span', { class: 'nm' }, el('span', {}, g.nom))),
      el('div', { class: 'gi' },
        el('div', { class: 'nums' }, el('span', {}, el('b', {}, hours(g.heures))), el('span', {}, `${g.sessions} session${g.sessions > 1 ? 's' : ''}`)),
        el('p', {}, [g.genre, g.dernier ? `dernière ${when(g.dernier)}` : ''].filter(Boolean).join(' · '))));
  }
  /** Barre d'outils : recherche, genre, tri, ordre. */
  function tools(kind, genres, label = 'Tous les genres') {
    const st = gstate[kind];
    const redo = () => (kind === 'steam' || kind === 'roblox' ? renderGames(status) : kind === 'spotify' ? renderMusic(status) : renderAnime(status));
    const q = el('input', { class: 'gsearch', type: 'search', placeholder: 'Chercher…', value: st.q, oninput: (e) => { st.q = e.target.value; redo(); } });
    const genre = el('select', { class: 'gsel', onchange: (e) => { st.genre = e.target.value; redo(); } }, el('option', { value: '' }, label), ...genres.map((g) => el('option', { value: g, selected: st.genre === g }, g)));
    const sort = el('select', { class: 'gsel', onchange: (e) => { st.sort = e.target.value; redo(); } }, ...SORTS[kind].map(([v, l]) => el('option', { value: v, selected: st.sort === v }, l)));
    const order = el('button', { class: 'gorder', type: 'button', title: 'Inverser l’ordre', onclick: () => { st.desc = !st.desc; redo(); } }, st.desc ? '↓ Décroissant' : '↑ Croissant');
    return el('div', { class: 'gtools' }, q, genres.length ? genre : null, sort, order);
  }
  function applyTools(kind, list, keyOf) {
    const st = gstate[kind];
    const q = st.q.trim().toLowerCase();
    let out = list.filter((g) => (!q || String(g.nom || g.titre).toLowerCase().includes(q)) && (!st.genre || (g.genres || [g.genre]).includes(st.genre)));
    out.sort((a, b) => { const ka = keyOf(a, st.sort), kb = keyOf(b, st.sort); const r = typeof ka === 'string' ? ka.localeCompare(kb) : ka - kb; return st.desc ? -r : r; });
    return out;
  }
  const scroller = (cards, empty) => el('div', { class: 'scroller' }, cards.length ? el('div', { class: 'ggrid' }, cards) : el('p', { class: 'empty' }, empty));
  function renderGames(s) {
    for (const b of $('libSwitch').children) b.classList.toggle('on', b.dataset.lib === lib);
    const body = $('libBody');
    const active = document.activeElement && document.activeElement.classList.contains('gsearch');
    if (lib === 'minecraft') {
      const list = s.minecraft || [];
      const LOADERS = { vanilla: 'Vanilla', fabric: 'Fabric', quilt: 'Quilt', forge: 'Forge', neoforge: 'NeoForge' };
      const cards = list.map((i) => el('div', { class: 'gcard', title: i.nom },
        el('span', { class: 'cov sq' }, String(i.nom).charAt(0), el('span', { class: 'nm' }, el('span', {}, i.nom))),
        el('div', { class: 'gi' },
          el('div', { class: 'nums' }, el('span', {}, el('b', {}, hours(i.heures))), el('span', {}, i.dernier ? dateFmt.format(Date.parse(i.dernier)) : '')),
          el('p', {}, `Minecraft ${i.version} · ${LOADERS[i.loader] || i.loader}${i.mods ? ` · ${i.mods} mod${i.mods > 1 ? 's' : ''}` : ''}`))));
      body.replaceChildren(el('p', { class: 'muted small' }, 'Mes instances dans le launcher de KuroPurr.'), scroller(cards, 'Pas d’instance Minecraft pour l’instant.'));
      return;
    }
    if (lib === 'roblox') {
      const r = s.roblox;
      if (!r) { body.replaceChildren(el('p', { class: 'empty' }, 'Pas de bibliothèque Roblox pour l’instant.')); return; }
      const genres = [...new Set(r.jeux.map((g) => g.genre).filter(Boolean))].sort();
      const list = applyTools('roblox', r.jeux, (g, k) => k === 'name' ? String(g.nom) : k === 'sessions' ? g.sessions : k === 'last' ? Date.parse(g.dernier || 0) : g.heures);
      body.replaceChildren(gprofile(r.profil, r.profil && r.profil.pseudo ? `@${r.profil.pseudo}` : null), el('hr'),
        el('div', { class: 'pstats' }, stat('Jeux', r.total), stat('Heures', hours(r.heures)), stat('Sessions', r.sessions || 0), stat('Dernière', r.derniere ? when(r.derniere) : '—')),
        el('hr'), tools('roblox', genres),
        scroller(list.map(robloxCard), 'Rien vu pour l’instant.'),
        el('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Temps et sessions vus par KuroPurr (Roblox ne fournit pas le temps de jeu).'));
    } else {
      const st = s.steam;
      if (!st) { body.replaceChildren(el('p', { class: 'empty' }, 'Pas de bibliothèque Steam pour l’instant.')); return; }
      const pick = (id) => { steamFilter = steamFilter === id ? 'all' : id; renderGames(status); };
      const wish = steamFilter === 'wish';
      const base = wish ? st.souhaits : st.jeux.filter((g) => steamFilter === 'installed' ? g.installe : steamFilter === 'notinstalled' ? !g.installe : true);
      const genres = [...new Set(base.flatMap((g) => g.genres || []))].sort();
      const list = applyTools('steam', base, (g, k) => k === 'name' ? String(g.nom) : k === 'recent' ? g.heures2s || 0 : k === 'last' ? Date.parse(g.dernier || 0) : g.heures || 0);
      body.replaceChildren(gprofile(st.profil, `${st.heures} h de jeu au total${st.derniere ? ` · dernière session ${when(st.derniere)}` : ''}`), el('hr'),
        el('div', { class: 'pstats' },
          stat('Total', st.total, 'all', steamFilter === 'all', () => pick('all')),
          stat('Installés', st.installes, 'installed', steamFilter === 'installed', () => pick('installed')),
          stat('Non installés', st.total - st.installes, 'notinstalled', steamFilter === 'notinstalled', () => pick('notinstalled')),
          stat('Souhaits', st.souhaits.length, 'wish', steamFilter === 'wish', () => pick('wish'))),
        el('hr'), tools('steam', genres),
        scroller(list.map((g) => steamCard(g, wish)), wish ? 'Liste de souhaits vide ou privée.' : 'Aucun jeu.'));
    }
    if (active) { const q = body.querySelector('.gsearch'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  }

  /* ---------------- Médiathèque : Anime / Manga (MyAnimeList), Séries / Films (Simkl) ---------------- */
  const ANI_STATUS = { watching: ['watching', '👁', 'En cours', 'En lecture'], completed: ['completed', '✨', 'Terminé', 'Terminé'], on_hold: ['onhold', '⏸', 'En pause', 'En pause'], dropped: ['dropped', '✖', 'Abandonné', 'Abandonné'], plan_to_watch: ['plan', '🕒', 'Prévu', 'Prévu'] };
  const FILM_STATUS = { completed: ['completed', '✨', 'Vu'], plan_to_watch: ['plan', '🕒', 'À voir'], dropped: ['dropped', '✖', 'Abandonné'], on_hold: ['onhold', '⏸', 'En pause'], watching: ['watching', '👁', 'En cours'] };
  const TYPES = { series: 'Série', film: 'Film', tv: 'TV', movie: 'Film', ova: 'OVA', ona: 'ONA', special: 'Spécial', music: 'Musique', manga: 'Manga', novel: 'Roman', light_novel: 'Light novel', one_shot: 'One-shot', manhwa: 'Manhwa', manhua: 'Manhua', doujinshi: 'Dōjinshi' };
  function aniCard(a, kind) {
    const manga = kind === 'manga', film = kind === 'films';
    const st = (film ? FILM_STATUS[a.statut] : ANI_STATUS[a.statut]) || ['plan', '•', a.statut, a.statut];
    const unit = manga ? 'ch.' : 'eps';
    const prog = film ? (a.duree ? `${a.duree} min` : '') : `${a.progression}${a.total ? `/${a.total}` : ''} ${unit}`;
    return el('a', { class: 'gcard', href: a.url, target: '_blank', rel: 'noopener', title: a.titre },
      el('span', { class: 'cov' }, String(a.titre).charAt(0), a.image ? el('img', { src: a.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null, el('span', { class: 'nm' }, el('span', {}, a.titre))),
      el('div', { class: 'gi' },
        el('div', { class: 'nums' }, el('span', { class: 'star' }, '★ ', el('b', {}, a.note ? a.note : 'N/A')), el('span', {}, prog)),
        el('p', {}, [TYPES[a.type] || a.type, a.annee, a.moyenne ? `${film || kind === 'series' ? 'Simkl' : 'MAL'} ${a.moyenne}` : '', ...(a.genres || []).slice(0, 2)].filter(Boolean).join(' · ')),
        el('span', { class: `st ${st[0]}` }, `${st[1]} ${manga ? st[3] : st[2]}`)));
  }
  function renderAnime(s) {
    for (const b of $('aniSwitch').children) b.classList.toggle('on', b.dataset.kind === aniKind);
    const body = $('aniBody');
    const active = document.activeElement && document.activeElement.classList.contains('gsearch');
    const trakt = aniKind === 'series' || aniKind === 'films'; // Simkl
    const root = trakt ? s.simkl : s.anime;
    const data = root && root[aniKind];
    const EMPTY = { anime: 'Pas de liste d’animes pour l’instant.', manga: 'Pas de liste de mangas pour l’instant.', series: 'Pas de séries pour l’instant.', films: 'Pas de films pour l’instant.' };
    if (!data || !data.liste) { body.replaceChildren(el('p', { class: 'empty' }, EMPTY[aniKind])); return; }
    const manga = aniKind === 'manga', film = aniKind === 'films';
    const p = root.profil || {};
    const ps = p[aniKind] || {};
    const sub = trakt
      ? [ps.nombre ? `${ps.nombre} ${film ? 'films vus' : 'séries'}` : '', ps.episodes ? `${ps.episodes} épisodes` : '', ps.heures ? `${ps.heures} h` : '', root.maj ? `lu ${when(root.maj)}` : ''].filter(Boolean).join(' · ')
      : [ps.jours ? `${ps.jours} jours ${manga ? 'de lecture' : 'de visionnage'}` : '', ps.note ? `note moyenne ${ps.note}` : '', root.maj ? `liste lue ${when(root.maj)}` : ''].filter(Boolean).join(' · ');
    const pick = (id) => { aniFilter = aniFilter === id ? 'all' : id; renderAnime(status); };
    const st = data.stats || {};
    const base = aniFilter === 'all' ? data.liste : data.liste.filter((a) => a.statut === aniFilter);
    const genres = [...new Set(base.flatMap((a) => a.genres || []))].sort();
    const list = applyTools(aniKind, base, (a, k) => k === 'name' ? String(a.titre) : k === 'mean' ? a.moyenne || 0 : k === 'progress' ? a.progression || 0 : k === 'plays' ? a.vues || 0 : k === 'updated' ? Date.parse(a.maj || 0) : k === 'year' ? a.annee || 0 : a.note || 0);
    const counters = film
      ? [stat('Total', st.total || 0, 'all', aniFilter === 'all', () => pick('all')), stat('Vus', st.termines || 0, 'completed', aniFilter === 'completed', () => pick('completed')), stat('Abandonnés', st.abandonnes || 0, 'dropped', aniFilter === 'dropped', () => pick('dropped')), stat('À voir', st.prevus || 0, 'plan_to_watch', aniFilter === 'plan_to_watch', () => pick('plan_to_watch'))]
      : trakt
        ? [stat('Total', st.total || 0, 'all', aniFilter === 'all', () => pick('all')), stat('En cours', st.enCours || 0, 'watching', aniFilter === 'watching', () => pick('watching')), stat('Terminées', st.termines || 0, 'completed', aniFilter === 'completed', () => pick('completed')), stat('En pause', st.enPause || 0, 'on_hold', aniFilter === 'on_hold', () => pick('on_hold')), stat('Abandonnées', st.abandonnes || 0, 'dropped', aniFilter === 'dropped', () => pick('dropped')), stat('À voir', st.prevus || 0, 'plan_to_watch', aniFilter === 'plan_to_watch', () => pick('plan_to_watch'))]
        : [stat('Total', st.total || 0, 'all', aniFilter === 'all', () => pick('all')),
          stat(manga ? 'En lecture' : 'En cours', st.enCours || 0, 'watching', aniFilter === 'watching', () => pick('watching')),
          stat('Terminés', st.termines || 0, 'completed', aniFilter === 'completed', () => pick('completed')),
          stat('En pause', st.enPause || 0, 'on_hold', aniFilter === 'on_hold', () => pick('on_hold')),
          stat('Abandonnés', st.abandonnes || 0, 'dropped', aniFilter === 'dropped', () => pick('dropped')),
          stat('Prévus', st.prevus || 0, 'plan_to_watch', aniFilter === 'plan_to_watch', () => pick('plan_to_watch'))];
    const foot = film ? '' : trakt ? `${st.episodes || 0} épisodes vus au total.` : manga ? `${st.chapitres || 0} chapitres et ${st.volumes || 0} volumes lus au total.` : `${st.episodes || 0} épisodes vus au total.`;
    body.replaceChildren(gprofile({ nom: p.pseudo || root.utilisateur, avatar: p.avatar, url: p.url }, sub || null), el('hr'),
      el('div', { class: `pstats ${counters.length === 6 ? 'six' : counters.length === 3 ? 'three' : ''}` }, counters),
      el('hr'), tools(aniKind, genres),
      scroller(list.map((a) => aniCard(a, aniKind)), 'Rien ici.'),
      ...(foot ? [el('p', { class: 'muted small', style: 'margin:10px 0 0' }, foot)] : []));
    if (active) { const q = body.querySelector('.gsearch'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  }
  $('aniSwitch').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; aniKind = b.dataset.kind; aniFilter = 'all'; renderAnime(status); });

  /* ---------------- Musique : Spotify (écoutes vues par KuroPurr, playlists publiques) ---------------- */
  const mins = (m) => m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)}` : `${m} min`;
  const coverOf = (x, cls) => el('span', { class: cls }, String(x.titre || x.nom || '?').charAt(0), x.image ? el('img', { src: x.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null);
  function trackCard(t) {
    const live = !t.fin;
    return el('a', { class: 'gcard', href: t.url, target: '_blank', rel: 'noopener', title: `${t.titre} — ${t.artiste}` },
      el('span', { class: 'cov sq' }, String(t.titre).charAt(0), t.image ? el('img', { src: t.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null, el('span', { class: 'nm' }, el('span', {}, t.titre))),
      el('div', { class: 'gi' },
        el('div', { class: 'nums' }, el('span', {}, el('b', {}, live ? 'en cours' : dur(t.duree))), el('span', {}, live ? '' : when(t.fin))),
        el('p', {}, [t.artiste, t.album].filter(Boolean).join(' · '))));
  }
  const topRow = (x, i, max, main, sub, round) => el('a', { class: 'toprow', href: x.url, target: '_blank', rel: 'noopener' },
    el('span', { class: 'rank' }, String(i + 1)),
    coverOf(x, `tpic ${round ? 'round' : ''}`),
    el('span', { class: 'tt' }, el('strong', {}, main), el('span', { class: 'muted' }, sub), el('span', { class: 'bar' }, el('span', { class: 'fill', style: `width:${Math.max(3, (x.minutes / Math.max(1, max)) * 100)}%` }))),
    el('span', { class: 'tn' }, el('b', {}, mins(x.minutes)), el('span', {}, `${x.ecoutes} écoute${x.ecoutes > 1 ? 's' : ''}`)));
  const playlistCard = (p) => el('a', { class: 'gcard', href: p.url, target: '_blank', rel: 'noopener', title: p.titre },
    el('span', { class: 'cov sq' }, String(p.titre).charAt(0), p.image ? el('img', { src: p.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null, el('span', { class: 'nm' }, el('span', {}, p.titre))),
    el('div', { class: 'gi' }, el('p', {}, 'Ouvrir dans Spotify ↗')));
  function renderMusic(s) {
    for (const b of $('musSwitch').children) b.classList.toggle('on', b.dataset.mus === mus);
    const body = $('musBody');
    const active = document.activeElement && document.activeElement.classList.contains('gsearch');
    if (mus === 'kuropurr') {
      const kp = (s.spotify && s.spotify.kuropurr) || {};
      const cur = kp.enCours;
      const now = cur ? el('div', { class: 'nowtrack' },
        coverOf(cur, 'tpic big'),
        el('span', { class: 'tt' }, el('span', { class: 'rp-kind' }, cur.radio ? '● En ce moment · webradio' : '● En ce moment · KuroPurr Musique'), el('strong', {}, cur.titre), el('span', { class: 'muted' }, [cur.artiste, cur.album].filter(Boolean).join(' · ')),
          cur.radio ? null : el('div', { class: 'bar' }, el('div', { class: 'fill', 'data-start': Date.parse(cur.debut), 'data-end': Date.parse(cur.fin) })),
          cur.radio ? null : el('span', { class: 'times' }, el('span', { class: 'pos' }, '0:00'), el('span', {}, fmtTime(Date.parse(cur.fin) - Date.parse(cur.debut)))))) : null;
      const list = (kp.ecoutes || []).map((t) => trackCard({ ...t, url: t.url || undefined }));
      const sub = [kp.heures30 ? `${kp.heures30} h sur 30 jours` : '', (kp.radios || []).length ? `${kp.radios.length} radio${kp.radios.length > 1 ? 's' : ''} écoutée${kp.radios.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
      body.replaceChildren(...[
        el('p', { class: 'muted small' }, `Ce que j’écoute dans le lecteur de KuroPurr : ma musique à moi (hors ligne) et des webradios.${sub ? ' ' + sub + '.' : ''}`),
        now,
        (kp.radios || []).length ? el('div', { class: 'ptags' }, kp.radios.map((r) => el('span', { class: 'ptag on' }, '📻 ' + r))) : null,
        scroller(list, 'Rien écouté dans KuroPurr Musique pour l’instant.'),
      ].filter(Boolean));
      return;
    }
    const sp = s.spotify;
    if (!sp) { body.replaceChildren(el('p', { class: 'empty' }, 'Pas de musique pour l’instant.')); return; }
    const st = sp.stats || {};
    const prof = sp.profil || {};
    const sub = [st.heures30 ? `${st.heures30} h d’écoute sur 30 jours` : '', st.artistes30 ? `${st.artistes30} artistes` : '', sp.maj ? `vu ${when(sp.maj)}` : ''].filter(Boolean).join(' · ');
    const now = sp.enCours ? el('a', { class: 'nowtrack', href: sp.enCours.url, target: '_blank', rel: 'noopener' },
      coverOf(sp.enCours, 'tpic big'),
      el('span', { class: 'tt' }, el('span', { class: 'rp-kind', style: 'color:#1ed760 !important' }, '● En ce moment sur Spotify'), el('strong', {}, sp.enCours.titre), el('span', { class: 'muted' }, [sp.enCours.artiste, sp.enCours.album].filter(Boolean).join(' · ')),
        el('div', { class: 'bar' }, el('div', { class: 'fill', 'data-start': Date.parse(sp.enCours.debut), 'data-end': Date.parse(sp.enCours.fin) })),
        el('span', { class: 'times' }, el('span', { class: 'pos' }, '0:00'), el('span', {}, fmtTime(Date.parse(sp.enCours.fin) - Date.parse(sp.enCours.debut)))))) : null;
    const views = [['ecoutes', 'Dernières écoutes'], ['artistes', 'Top artistes'], ['titres', 'Top titres'], ['playlists', 'Playlists']];
    const tabs = el('div', { class: 'ptags' }, views.map(([id, label]) => el('button', { class: `ptag ${musView === id ? 'on' : ''}`, type: 'button', onclick: () => { musView = id; renderMusic(status); } }, label)));
    let main;
    if (musView === 'ecoutes') {
      const artists = [...new Set(sp.ecoutes.map((t) => t.artiste).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const list = applyTools('spotify', sp.ecoutes.map((t) => ({ ...t, nom: t.titre, genres: [t.artiste] })), (t, k) => k === 'name' ? String(t.titre) : k === 'artist' ? String(t.artiste) : k === 'duration' ? t.duree || 0 : Date.parse(t.debut || 0));
      main = [tools('spotify', artists, 'Tous les artistes'), scroller(list.map(trackCard), s.musique && s.musique.actif === false && !sp.ecoutes.length ? 'Rien écouté sur Spotify ces derniers temps.' : 'Rien ici.')];
    } else if (musView === 'artistes') {
      const max = Math.max(...sp.topArtistes.map((a) => a.minutes), 1);
      main = [el('div', { class: 'scroller' }, sp.topArtistes.length ? el('div', { class: 'toplist' }, sp.topArtistes.map((a, i) => topRow(a, i, max, a.nom, 'sur 30 jours', true))) : el('p', { class: 'empty' }, 'Pas encore assez d’écoutes.'))];
    } else if (musView === 'titres') {
      const max = Math.max(...sp.topTitres.map((a) => a.minutes), 1);
      main = [el('div', { class: 'scroller' }, sp.topTitres.length ? el('div', { class: 'toplist' }, sp.topTitres.map((t, i) => topRow(t, i, max, t.titre, t.artiste, false))) : el('p', { class: 'empty' }, 'Pas encore assez d’écoutes.'))];
    } else {
      main = [scroller(sp.playlists.map(playlistCard), 'Pas de playlist publique pour l’instant.')];
    }
    body.replaceChildren(gprofile({ nom: prof.pseudo || s.pseudo, avatar: prof.avatar || s.avatar, url: prof.url }, sub || null), el('hr'),
      el('div', { class: 'pstats six' },
        stat('Écoutes · 7 j', st.ecoutes7 || 0), stat('Heures · 7 j', st.heures7 || 0), stat('Écoutes · 30 j', st.ecoutes30 || 0), stat('Heures · 30 j', st.heures30 || 0), stat('Artistes · 30 j', st.artistes30 || 0), stat('Playlists', st.playlists || 0)),
      now, el('hr'), tabs, ...main,
      el('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Écoutes vues par KuroPurr sur Spotify ; pochettes via Deezer.'));
    progress();
    if (active) { const q = body.querySelector('.gsearch'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  }
  $('musSwitch').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; mus = b.dataset.mus; renderMusic(status); });

  /* ---------------- Projets ---------------- */
  const STATUS = { en_cours: 'En cours', planifie: 'Planifié', termine: 'Terminé' };
  const picOf = (p, cls) => el('span', { class: cls }, p.image ? el('img', { src: p.image, alt: '', loading: 'lazy', onerror: (e) => e.target.replaceWith(String(p.nom).charAt(0).toUpperCase()) }) : String(p.nom).charAt(0).toUpperCase());
  function renderProjects(s) {
    const all = s.projets;
    const count = (st) => all.filter((p) => p.statut === st).length;
    const stats = [['all', 'Projets', all.length], ['en_cours', 'En cours', count('en_cours')], ['planifie', 'Planifiés', count('planifie')], ['termine', 'Terminés', count('termine')]];
    $('pstats').replaceChildren(...stats.map(([id, label, n]) => el('button', { class: `pstat ${projectFilter === id ? 'on' : ''}`, type: 'button', onclick: () => { projectFilter = projectFilter === id ? 'all' : id; renderProjects(status); } }, el('span', {}, label), el('b', {}, String(n)))));
    const filtered = projectFilter === 'all' ? all : all.filter((p) => p.statut === projectFilter);
    const featured = filtered.filter((p) => p.avant);
    const preview = (featured.length ? featured : filtered).slice(0, 3);
    const projectCard = (p) => el('button', { class: 'project', type: 'button', onclick: () => openProject(p) },
      picOf(p, 'pic'),
      el('div', { class: 'pt' }, el('strong', {}, p.nom), p.description ? el('p', {}, p.description) : null, el('span', {}, el('span', { class: `st ${p.statut}` }, STATUS[p.statut] || 'En cours'))));
    $('projects').replaceChildren(...(preview.length ? preview.map(projectCard) : [el('p', { class: 'empty' }, all.length ? 'Aucun projet avec ce statut.' : 'Pas encore de projet.')]));
    const m = $('projectsMore');
    m.hidden = filtered.length <= preview.length;
    m.textContent = `Voir plus (${filtered.length - preview.length})`;
    m.onclick = () => openSheet(projectFilter === 'all' ? 'Tous les projets' : `Projets · ${STATUS[projectFilter]}`, [el('div', { class: 'projects' }, filtered.map(projectCard))]);
  }
  function openProject(p) {
    const links = (p.liens || []).map((l) => el('a', { class: 'chip', href: l.url, target: '_blank', rel: 'noopener', style: `--c:${colorOf(l.nom)}` }, el('i'), l.nom));
    const members = (p.membres || []).map((m) => el(m.url ? 'a' : 'span', { class: 'member', href: m.url || null, target: m.url ? '_blank' : null, rel: 'noopener', title: m.url ? 'Voir le profil' : null },
      m.avatar ? el('img', { src: m.avatar, alt: '' }) : el('span', { class: 'ini' }, String(m.nom).charAt(0).toUpperCase()), m.nom));
    const body = $('modalBody');
    body.replaceChildren(...[
      el('div', { class: 'modal-head' }, picOf(p, 'pic'), el('div', {}, el('h1', {}, p.nom), el('p', { class: 'muted', style: 'margin:4px 0 6px' }, p.description || ''), el('span', { class: `st ${p.statut}` }, STATUS[p.statut] || 'En cours'))),
      el('div', { class: 'md' }),
      links.length ? [el('h2', {}, 'Liens'), el('div', { class: 'chips' }, links)] : null,
      members.length ? [el('h2', { style: 'margin-top:16px' }, 'Collaborateurs'), el('div', { class: 'members' }, members)] : null,
    ].flat(2).filter(Boolean));
    body.querySelector('.md').innerHTML = markdown(p.details);
    $('modal').hidden = false;
  }
  /** Fenêtre générique par-dessus la page (listes complètes). */
  function openSheet(title, nodes) {
    $('modalBody').replaceChildren(el('h1', { class: 'sheet-title' }, title), ...nodes.flat(2).filter(Boolean));
    $('modal').hidden = false;
  }
  $('modalClose').addEventListener('click', () => { $('modal').hidden = true; });
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) $('modal').hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('modal').hidden = true; });

  /* ---------------- Pseudo animé ---------------- */
  let typed = '', typing = null;
  function typewrite(text) {
    if (typed === text) return;
    typed = text;
    clearInterval(typing);
    const out = $('pseudo'); out.textContent = '';
    let i = 0;
    typing = setInterval(() => { out.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typing); }, 80);
  }

  /* ---------------- Discord (Lanyard) ---------------- */
  // Lanyard donne statut, badges, photo et activités d'un compte membre de discord.gg/lanyard.
  let lanyardAt = 0;
  async function loadLanyard(id) {
    if (!/^\d{15,22}$/.test(id) || Date.now() - lanyardAt < LANYARD_MS) return;
    lanyardAt = Date.now();
    try {
      const r = await fetch(`https://api.lanyard.rest/v1/users/${id}`);
      const j = await r.json();
      if (j && j.success && j.data) { lanyard = j.data; render(); }
    } catch { /* la page marche sans */ }
  }
  const discordAvatar = (u) => u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${String(u.avatar).startsWith('a_') ? 'gif' : 'png'}?size=128` : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) >> 22n) % 6}.png`;
  // Badges : bit de public_flags → nom + icône officielle (CDN Discord)
  const FLAGS = [
    [1, 'Staff Discord', '5e74e9b61934fc1f67c65515d1f7e60d'], [2, 'Partenaire', '3f9748e53446a137a052f3454e2de41e'], [4, 'HypeSquad Events', 'bf01d1073931f921909045f3a39fd264'],
    [8, 'Bug Hunter', '2717692c7dca7289b35297368a940dd0'], [64, 'HypeSquad Bravery', '8a88d63823d8a71cd5e390baa45efa02'], [128, 'HypeSquad Brilliance', '011940fd013da3f7fb926e4a1cd2e618'],
    [256, 'HypeSquad Balance', '3aa41de486fa12454c3761e8e223442e'], [512, 'Early Supporter', '7060786766c9c840eb3019e725d2b358'], [16384, 'Bug Hunter Gold', '848f79194d4be5ff5f81505cbd0ce1e6'],
    [131072, 'Développeur de bot vérifié', '6df5892e0f35b866c5edb2cd7a01ab16'], [262144, 'Modérateur certifié', 'fee1624003e2fee35cb398e125dc479b'], [4194304, 'Développeur actif', '6bdc42827a38498929a4920da12695d9'],
  ];
  const NITRO = '2ba85e8026a8614b640c2837bcdfe21b';
  const badge = (name, icon) => el('img', { src: icon.startsWith('http') ? icon : `https://cdn.discordapp.com/badge-icons/${icon}.png`, alt: name, title: name, onerror: (e) => e.target.replaceWith(el('span', { class: 'txt', title: name }, name)) });
  // Badges déclarés à la main (Discord ne les rend pas publics) : icônes officielles via le dépôt mezotv/discord-badges.
  const BADGE_CDN = 'https://cdn.jsdelivr.net/gh/mezotv/discord-badges@main/assets/';
  const TIERS = {
    nitroTier: [['bronze', 'Nitro Bronze'], ['silver', 'Nitro Argent'], ['gold', 'Nitro Or'], ['platinum', 'Nitro Platine'], ['diamond', 'Nitro Diamant'], ['emerald', 'Nitro Émeraude'], ['ruby', 'Nitro Rubis'], ['opal', 'Nitro Opale']].map(([k, l]) => [k, l, `subscriptions/badges/${k}.png`]),
    boost: [['1', '1 mois'], ['2', '2 mois'], ['3', '3 mois'], ['4', '6 mois'], ['5', '9 mois'], ['6', '1 an'], ['7', '1 an 3 mois'], ['8', '1 an 6 mois'], ['9', '2 ans']].map(([k, l]) => [k, `Boost de serveur · ${l}`, `boosts/discord-boost-${k}.svg`]),
    gifting: [['patron', 'Mécène'], ['champion', 'Champion'], ['luminary', 'Luminaire'], ['icon', 'Icône'], ['hero', 'Héros'], ['legend', 'Légende']].map(([k, l]) => [k, `Cadeaux · ${l}`, `gifting/${k}.png`]),
    accountAge: ['seed', 'sprout', 'bud', 'sapling', 'blossom', 'redwood', 'sequoia', 'bristlecone', 'stromatolite', 'primordial'].map((k) => [k, `Ancienneté · ${k}`, `account-age/${k}.svg`]),
    streaming: ['newcomer', 'fledgling', 'breakout', 'standout', 'trendsetter', 'headliner', 'star', 'sensation', 'visionary', 'phenomenon'].map((k) => [k, `Streaming · ${k}`, `streaming/${k}.svg`]),
    gameTime: ['casual', 'recreational', 'dedicated', 'committed', 'serious', 'devoted', 'seasoned', 'ironclad', 'unshakeable', 'eternal'].map((k) => [k, `Temps de jeu · ${k}`, `game-time/${k}.svg`]),
    gameVariety: ['sampler', 'dabbler', 'enthusiast', 'ranger', 'explorer', 'adventurer', 'voyager', 'maverick', 'polymath', 'universalist'].map((k) => [k, `Variété de jeux · ${k}`, `game-variety/${k}.svg`]),
  };
  const SIMPLE = { nitro: ['Nitro', 'discord-nitro.svg'], nitroBasic: ['Nitro Basic', 'discord-nitro-basic.svg'], quest: ['Quête accomplie', 'quest.png'], orbs: ['Apprenti des Orbes', 'orb.svg'], legacyName: ['Ancien nom', 'username.png'], clown: ['Clown (édition limitée)', 'special/discord-lootbox.svg'], meadow: ['Last Meadow', 'last-meadow.png'],
    staff: ['Staff Discord', 'discord-staff.svg'], partner: ['Partenaire', 'discord-partner.svg'], events: ['HypeSquad Events', 'hype-squad-events.svg'], bravery: ['HypeSquad Bravery', 'hype-squad-bravery.svg'], brilliance: ['HypeSquad Brilliance', 'hype-squad-brilliance.svg'], balance: ['HypeSquad Balance', 'hype-squad-balance.svg'],
    early: ['Early Supporter', 'discord-early-supporter.svg'], bug1: ['Bug Hunter', 'discord-bug-hunter-green.svg'], bug2: ['Bug Hunter Gold', 'discord-bug-hunter-gold.svg'], botdev: ['Développeur de bot vérifié', 'discord-bot-dev.svg'], mod: ['Modérateur certifié', 'discord-mod.svg'], activedev: ['Développeur actif', 'active-developer.svg'] };
  function declaredBadges(keys, already) {
    const out = [];
    for (const key of keys) {
      const [group, val] = key.split(':');
      let name, asset;
      if (TIERS[group]) { const t = TIERS[group].find((x) => x[0] === val); if (!t) continue; [, name, asset] = t; }
      else if (SIMPLE[group]) [name, asset] = SIMPLE[group];
      else continue;
      if (already.has(name)) continue;
      already.add(name);
      out.push(badge(name, BADGE_CDN + asset));
    }
    return out;
  }
  function renderDiscord(s) {
    const box = $('discord');
    box.hidden = !s.discordId;
    if (!s.discordId) return;
    const u = lanyard && lanyard.discord_user;
    if (!u) { $('dcName').textContent = '…'; $('dcTag').textContent = 'Profil indisponible'; $('dcBadges').replaceChildren(); $('dcPresence').replaceChildren(el('p', { class: 'muted small' }, 'Statut Discord indisponible pour le moment.')); return; }
    const av = $('dcAvatar'); const src = discordAvatar(u);
    if (av.dataset.src !== src) { av.dataset.src = src; av.src = src; av.onerror = () => { av.src = 'logo.png'; }; }
    const deco = u.avatar_decoration_data && u.avatar_decoration_data.asset ? `https://cdn.discordapp.com/avatar-decoration-presets/${u.avatar_decoration_data.asset}.png?size=128&passthrough=true` : '';
    $('dcDeco').hidden = !deco;
    if (deco && $('dcDeco').dataset.src !== deco) { $('dcDeco').dataset.src = deco; $('dcDeco').src = deco; }
    const st = lanyard.discord_status && lanyard.discord_status !== 'offline' ? lanyard.discord_status : '';
    $('dcRing').className = `ring ${st}`;
    const g = u.primary_guild;
    const clan = g && g.tag ? el('span', { class: 'dc-clan' }, g.badge && g.identity_guild_id ? el('img', { src: `https://cdn.discordapp.com/clan-badges/${g.identity_guild_id}/${g.badge}.png?size=16`, alt: '' }) : null, g.tag) : null;
    const nameEl = $('dcName');
    nameEl.replaceChildren(el('span', { class: 'dc-dn' }, u.global_name || u.username), clan);
    // Couleur du nom d'affichage (Nitro) et plaque de nom (collectible)
    const dns = u.display_name_styles;
    const col = dns && Array.isArray(dns.colors) && dns.colors.length ? dns.colors.map((c) => `#${Number(c).toString(16).padStart(6, '0')}`) : null;
    nameEl.querySelector('.dc-dn').style.cssText = col ? (col.length > 1 ? `background:linear-gradient(90deg,${col.join(',')});-webkit-background-clip:text;background-clip:text;color:transparent` : `color:${col[0]}`) : '';
    const plate = u.collectibles && u.collectibles.nameplate && u.collectibles.nameplate.asset ? `https://cdn.discordapp.com/assets/collectibles/${u.collectibles.nameplate.asset}static.png` : '';
    const head = $('discord').querySelector('.dc-head');
    head.style.backgroundImage = plate ? `linear-gradient(90deg, rgba(14,17,16,.9) 35%, rgba(14,17,16,.2)), url(${plate})` : '';
    head.classList.toggle('plated', !!plate);
    const custom = (lanyard.activities || []).find((a) => a.type === 4);
    $('dcTag').replaceChildren(`@${u.username} · ${({ online: 'en ligne', idle: 'absent', dnd: 'ne pas déranger' })[st] || 'hors ligne'}`,
      custom && (custom.state || (custom.emoji && custom.emoji.name)) ? el('span', { class: 'dc-custom' }, custom.emoji && custom.emoji.id ? el('img', { src: `https://cdn.discordapp.com/emojis/${custom.emoji.id}.${custom.emoji.animated ? 'gif' : 'png'}?size=20`, alt: '' }) : (custom.emoji && custom.emoji.name ? custom.emoji.name + ' ' : ''), custom.state || '') : null);
    const auto = FLAGS.filter(([bit]) => Number(u.public_flags || 0) & bit);
    const already = new Set(auto.map(([, name]) => name));
    const badges = auto.map(([, name, icon]) => badge(name, icon));
    if (u.premium_type) { badges.push(badge('Nitro', NITRO)); already.add('Nitro'); }
    $('dcBadges').replaceChildren(...badges, ...declaredBadges(s.badgesDiscord, already));
    // Rich Presence : Spotify, sinon le premier jeu / activité
    const pres = $('dcPresence');
    const acts = Array.isArray(lanyard.activities) ? lanyard.activities.filter((a) => a.type !== 4) : [];
    if (lanyard.listening_to_spotify && lanyard.spotify) {
      const sp = lanyard.spotify, t = sp.timestamps || {};
      pres.replaceChildren(el('div', { class: 'rp' },
        el('div', { class: 'rp-img' }, sp.album_art_url ? el('img', { src: sp.album_art_url, alt: '' }) : el('span', { class: 'ph' }, svg(ICONS.musique))),
        el('div', { class: 'rp-text' }, el('span', { class: 'rp-kind' }, 'Écoute Spotify'), el('strong', {}, sp.song), el('span', {}, sp.artist || ''), sp.album ? el('span', {}, sp.album) : null,
          t.start && t.end ? [el('div', { class: 'bar' }, el('div', { class: 'fill', 'data-start': t.start, 'data-end': t.end })), el('span', { class: 'times' }, el('span', { class: 'pos' }, '0:00'), el('span', {}, fmtTime(t.end - t.start)))] : null)));
    } else if (acts.length) {
      const a = acts.find((x) => x.type === 0) || acts[0];
      const asset = (key) => { const v = a.assets && a.assets[key]; if (!v) return ''; return String(v).startsWith('mp:') ? `https://media.discordapp.net/${String(v).slice(3)}` : `https://cdn.discordapp.com/app-assets/${a.application_id}/${v}.png`; };
      const big = asset('large_image'), small = asset('small_image');
      pres.replaceChildren(el('div', { class: 'rp' },
        el('div', { class: 'rp-img' }, big ? el('img', { src: big, alt: '', title: a.assets && a.assets.large_text || '', onerror: (e) => e.target.replaceWith(el('span', { class: 'ph' }, svg(ICONS.jeu))) }) : el('span', { class: 'ph' }, svg(ICONS.jeu)),
          small ? el('img', { class: 'mini', src: small, alt: '', title: a.assets && a.assets.small_text || '' }) : null),
        el('div', { class: 'rp-text' }, el('strong', {}, a.name), a.details ? el('span', {}, a.details) : null, a.state ? el('span', {}, a.state) : null,
          a.timestamps && a.timestamps.start ? el('span', {}, `depuis ${dur((Date.now() - a.timestamps.start) / 1000)}`) : null)));
    } else {
      pres.replaceChildren(el('p', { class: 'muted small' }, st ? 'Aucune activité en ce moment.' : 'Hors ligne sur Discord.'));
    }
  }


  /* ---------------- Divers : tuiles + fiches ---------------- */
  const flag = (code) => String(code || '').length === 2 ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '🌐';
  const hms = (sec) => { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h} h ${pad(m)}` : `${m} min`; };
  const monthName = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); };
  const TILE_DEF = {
    activite: ['📊', 'Activité', (d) => d.activite ? `${d.activite.joursActifs} jours actifs` : 'bientôt'],
    trophees: ['🏆', 'Trophées', (d) => d.trophees ? `${d.trophees.or} or · ${d.trophees.argent} argent · ${d.trophees.bronze} bronze` : 'bientôt'],
    tops: ['🥇', 'Mes tops', (d) => `${(d.tops || []).length} classement${(d.tops || []).length > 1 ? 's' : ''}`],
    records: ['⚡', 'Records', (d) => d.records && d.records.sessionMax ? `session max ${hms(d.records.sessionMax.secondes)}` : 'bientôt'],
    recap: ['📆', 'Récap du mois', (d) => d.recaps && d.recaps.length ? monthName(d.recaps[0].mois) : 'bientôt'],
    horaires: ['🕒', 'Quand me trouver', (d) => d.activite ? peakLabel(d.activite.heures) : 'bientôt'],
    setup: ['🖥️', 'Setup', (d) => d.setup && d.setup.machine && d.setup.machine.processeur ? d.setup.machine.processeur.split(' · ')[0].replace(/\(R\)|\(TM\)|CPU|Processor/g, '').trim() : 'mon PC'],
    collection: ['🎞️', 'Collection', (d) => `${(d.collection || []).length} média${(d.collection || []).length > 1 ? 's' : ''}`],
    livreOr: ['📖', 'Livre d’or', (d) => `${((d.livreOr || {}).messages || []).length} message${((d.livreOr || {}).messages || []).length > 1 ? 's' : ''}`],
    playlist: ['🎵', 'Playlist des visiteurs', (d) => `${((d.playlist || {}).propositions || []).length} proposition${((d.playlist || {}).propositions || []).length > 1 ? 's' : ''}`],
    ping: ['👋', 'Me faire coucou', (d) => `${(d.evenements || {}).ping || 0} coucou${((d.evenements || {}).ping || 0) > 1 ? 's' : ''}`],
    visiteurs: ['🌍', 'Visiteurs', (d) => d.visiteurs ? `${(d.visiteurs.total || 0).toLocaleString('fr-FR')} · ${(d.visiteurs.pays || []).length} pays` : 'bientôt'],
    chat: ['🐈‍⬛', 'Cat.exe', (d) => `${(d.evenements || {}).calins || 0} câlin${((d.evenements || {}).calins || 0) > 1 ? 's' : ''}`],
  };
  function peakLabel(h) {
    if (!h || !h.some((x) => x > 0)) return 'pas encore assez de données';
    // Meilleure fenêtre de 4 h consécutives
    let best = 0, bi = 0;
    for (let i = 0; i < 24; i++) { const v = h[i] + h[(i + 1) % 24] + h[(i + 2) % 24] + h[(i + 3) % 24]; if (v > best) { best = v; bi = i; } }
    return `plutôt ${bi} h – ${(bi + 4) % 24} h`;
  }
  function renderDivers(s) {
    const d = s.divers;
    const box = $('tiles');
    if (!d) { box.replaceChildren(el('p', { class: 'empty' }, 'Rien ici pour l’instant.')); return; }
    const tiles = d.tuiles.filter((t) => TILE_DEF[t]);
    box.replaceChildren(...tiles.map((t) => {
      const [ico, label, sub] = TILE_DEF[t];
      return el('button', { class: 'tile', type: 'button', 'data-tile': t, onclick: () => openTile(t) }, el('span', { class: 'ico' }, ico), el('strong', {}, label), el('span', { class: 'muted small' }, sub(d)));
    }));
    if (!tiles.length) box.replaceChildren(el('p', { class: 'empty' }, 'Rien ici pour l’instant.'));
  }
  function openTile(t) {
    const d = status.divers || {};
    const open = (title, nodes, wide) => { openSheet(title, nodes); $('modal').querySelector('.modal-box').classList.toggle('wide', !!wide); };
    switch (t) {
      case 'activite': return open('Activité', activityView(d.activite), true);
      case 'trophees': return open('Trophées KuroPurr', trophiesView(d.trophees), true);
      case 'tops': return open('Mes tops', topsView(d.tops || []), true);
      case 'records': return open('Records', recordsView(d.records));
      case 'recap': return open('Récap', recapView(d.recaps || []), true);
      case 'horaires': return open('Quand me trouver', hoursView(d.activite));
      case 'setup': return open('Setup', setupView(d.setup));
      case 'collection': return open('Collection', collectionView(d.collection || []), true);
      case 'livreOr': return open('Livre d’or', guestbookView(d.livreOr || {}), true);
      case 'playlist': return open('Playlist des visiteurs', playlistView(d.playlist || {}));
      case 'ping': return open('Me faire coucou', pingView(d));
      case 'visiteurs': return open('Visiteurs', visitorsView(d.visiteurs));
      case 'chat': return open('Cat.exe', catView(d));
      default: return null;
    }
  }
  const note = (t) => el('p', { class: 'muted small', style: 'margin:8px 0 0' }, t);
  function activityView(a) {
    if (!a) return [note('Pas encore de données.')];
    const days = a.jours;
    const max = Math.max(1, ...days.map((x) => x.j + x.m));
    const level = (v) => v <= 0 ? 0 : v < max * 0.15 ? 1 : v < max * 0.4 ? 2 : v < max * 0.7 ? 3 : 4;
    // Colonnes = semaines (lundi en haut)
    const first = new Date(days[0].d + 'T00:00:00');
    const lead = (first.getDay() + 6) % 7;
    const cells = [...Array(lead).fill(null), ...days];
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    const months = [];
    weeks.forEach((w, i) => { const c = w.find(Boolean); if (!c) return; const dt = new Date(c.d + 'T00:00:00'); if (dt.getDate() <= 7) months.push([i, dt.toLocaleDateString('fr-FR', { month: 'short' })]); });
    const grid = el('div', { class: 'heat' },
      el('div', { class: 'heat-months' }, months.map(([i, m]) => el('span', { style: `grid-column:${i + 1}` }, m))),
      el('div', { class: 'heat-grid', style: `grid-template-columns:repeat(${weeks.length}, 1fr)` }, weeks.map((w) => el('div', { class: 'heat-col' }, [0, 1, 2, 3, 4, 5, 6].map((k) => { const c = w[k]; return el('span', { class: `heat-cell l${c ? level(c.j + c.m) : 0} ${c ? '' : 'none'}`, title: c ? `${new Date(c.d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · jeu ${hms(c.j)} · musique ${hms(c.m)}` : '' }); })))),
      el('div', { class: 'heat-legend muted small' }, 'moins ', [0, 1, 2, 3, 4].map((l) => el('span', { class: `heat-cell l${l}` })), ' plus'));
    const last30 = days.slice(-30);
    const sum = (k) => last30.reduce((n, x) => n + x[k], 0);
    return [
      el('div', { class: 'pstats' }, stat('Jours actifs', a.joursActifs), stat('Heures de jeu', a.heuresJeu), stat('Heures de musique', a.heuresMusique), stat('30 derniers jours', hms(sum('j') + sum('m')))),
      el('hr'), grid,
      note('Une case par jour sur un an : jeu et musique vus par KuroPurr (au moins 5 min pour compter un jour actif).'),
    ];
  }
  function trophiesView(t) {
    if (!t) return [note('Pas encore de trophées.')];
    const medal = (n) => ['⚪', '🥉', '🥈', '🥇'][n] || '⚪';
    const names = ['à débloquer', 'bronze', 'argent', 'or'];
    const list = t.liste.slice().sort((a, b) => b.niveau - a.niveau || b.progression - a.progression);
    return [
      el('div', { class: 'pstats' }, stat('Or', t.or), stat('Argent', t.argent), stat('Bronze', t.bronze), stat('Total', t.total)),
      el('hr'),
      el('div', { class: 'trophies' }, list.map((x) => el('div', { class: `trophy n${x.niveau}` },
        el('span', { class: 'ico' }, x.icone),
        el('div', { class: 'tt' }, el('strong', {}, x.nom, ' ', el('span', { class: 'medal', title: names[x.niveau] }, medal(x.niveau))), el('span', { class: 'muted small' }, x.description),
          el('span', { class: 'bar' }, el('span', { class: 'fill', style: `width:${Math.round(x.progression * 100)}%` })),
          el('span', { class: 'muted small nums' }, `${Number.isInteger(x.valeur) ? x.valeur : x.valeur.toFixed(1)} ${x.unite}${x.prochain != null ? ` · prochain palier ${x.prochain}` : ' · palier maximum'}`)))),
      ),
      note('Calculés par KuroPurr à partir de l’activité réelle : paliers bronze, argent, or.'),
    ];
  }
  function topsView(tops) {
    if (!tops.length) return [note('Pas encore de classement.')];
    const wrap = el('div', {});
    const grid = () => el('div', { class: 'topsgrid' }, tops.map((t) => { const first = t.items[0] || {}; return el('button', { class: 'topsq', type: 'button', onclick: () => show(t) },
      first.image ? el('img', { src: first.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null,
      el('span', { class: 'nm' }, el('strong', {}, t.nom), el('span', { class: 'small' }, `${t.items.length} entrée${t.items.length > 1 ? 's' : ''}${first.nom ? ` · n°1 ${first.nom}` : ''}`))); }));
    const show = (t) => {
      let i = 0;
      const card = el('div', { class: 'topcard' });
      const draw = () => {
        const it = t.items[i] || {};
        card.replaceChildren(
          el('span', { class: 'rank' }, `#${i + 1}`),
          it.image ? el('img', { src: it.image, alt: '', onerror: (e) => e.target.remove() }) : el('span', { class: 'ph' }, String(it.nom || '?').charAt(0)),
          el('strong', {}, it.nom || '—'), it.note ? el('p', {}, it.note) : null,
          el('span', { class: 'muted small' }, `${i + 1} / ${t.items.length} · clique pour continuer`));
      };
      card.addEventListener('click', () => { i = (i + 1) % Math.max(1, t.items.length); draw(); });
      draw();
      wrap.replaceChildren(el('button', { class: 'link-btn', type: 'button', onclick: () => wrap.replaceChildren(el('h2', {}, 'Choisis un top'), grid()) }, '← Tous les tops'), el('h2', {}, t.nom), card,
        el('div', { class: 'topdots' }, t.items.map((_, k) => el('button', { class: k === i ? 'on' : '', type: 'button', onclick: (e) => { e.stopPropagation(); i = k; draw(); [...e.currentTarget.parentElement.children].forEach((b, j) => b.classList.toggle('on', j === k)); } }))));
    };
    wrap.replaceChildren(el('h2', {}, 'Choisis un top'), grid());
    return [wrap];
  }
  function recordsView(r) {
    if (!r) return [note('Pas encore de records.')];
    const row = (ico, label, value, sub) => value ? el('div', { class: 'row' }, el('span', { class: 'rico' }, ico), el('div', { class: 'rt' }, el('span', { class: 'muted small' }, label), el('strong', {}, value), sub ? el('span', { class: 'muted small' }, sub) : null)) : null;
    return [
      row('⏱️', 'Plus longue session', r.sessionMax && `${r.sessionMax.nom} · ${hms(r.sessionMax.secondes)}`, r.sessionMax && `${r.sessionMax.source} · ${new Date(r.sessionMax.date).toLocaleDateString('fr-FR')}`),
      row('🔁', 'Jeu le plus relancé (90 j)', r.jeuRelance && `${r.jeuRelance.nom}`, r.jeuRelance && `${r.jeuRelance.sessions} sessions`),
      row('🎧', 'Titre le plus écouté (90 j)', r.titreEcoute && `${r.titreEcoute.titre}`, r.titreEcoute && `${r.titreEcoute.artiste} · ${r.titreEcoute.ecoutes} écoutes`),
      row('🔥', 'Jours d’affilée', r.serieJours && `${r.serieJours.max} jours`, r.serieJours && `série en cours : ${r.serieJours.actuelle}`),
      row('📅', 'Journée la plus chargée', r.journeeMax && hms(r.journeeMax.secondes), r.journeeMax && new Date(r.journeeMax.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })),
      row('🌙', 'Nuit la plus tardive', r.nuitTardive && `fin à ${r.nuitTardive.heure}`, r.nuitTardive && r.nuitTardive.nom),
      row('🧭', 'Jeux différents (90 j)', r.jeuxDifferents ? String(r.jeuxDifferents) : null),
      row('🎮', 'Total', `${r.heuresJeu} h de jeu · ${r.heuresMusique} h de musique`, `${r.joursActifs} jours actifs`),
    ];
  }
  function recapView(recaps) {
    if (!recaps.length) return [note('Le premier récap arrive à la fin du mois.')];
    return recaps.map((m) => el('div', { class: 'recap' },
      el('h2', {}, monthName(m.mois), m.enCours ? el('span', { class: 'st en_cours', style: 'margin-left:8px' }, 'en cours') : null),
      el('div', { class: 'pstats' }, stat('Heures de jeu', m.heuresJeu), stat('Heures de musique', m.heuresMusique), stat('Jours actifs', m.joursActifs), stat('Jeux différents', m.jeuxDifferents)),
      el('div', { class: 'recap-rows' },
        m.jeu ? el('span', {}, '🎮 Jeu du mois : ', el('b', {}, m.jeu.nom), ` (${m.jeu.heures} h)`) : null,
        m.artiste ? el('span', {}, '🎤 Artiste du mois : ', el('b', {}, m.artiste.nom), ` (${m.artiste.minutes} min)`) : null,
        m.titre ? el('span', {}, '🎵 Titre du mois : ', el('b', {}, m.titre.titre), ` — ${m.titre.artiste} (${m.titre.ecoutes} écoutes)`) : null,
        m.nuit ? el('span', {}, '🌙 Nuit la plus tardive : ', el('b', {}, m.nuit)) : null)));
  }
  function hoursView(a) {
    if (!a || !a.heures) return [note('Pas encore de données.')];
    const h = a.heures;
    const max = Math.max(1, ...h);
    const now = new Date().getHours();
    return [
      el('p', { class: 'muted small' }, 'Heures de jeu sur les 30 derniers jours, heure par heure (heure de Paris). ', el('b', {}, peakLabel(h)), '.'),
      el('div', { class: 'hours' }, h.map((v, i) => el('div', { class: `hbar ${i === now ? 'now' : ''}`, title: `${i} h : ${hms(v)}` }, el('span', { style: `height:${Math.max(2, (v / max) * 100)}%` }), el('small', {}, i % 3 === 0 ? `${i}h` : '')))),
      note('La barre claire est l’heure actuelle.'),
    ];
  }
  function setupView(s) {
    if (!s) return [note('Rien à montrer.')];
    const m = s.machine || {};
    const rows = [['💻', 'Système', m.systeme], ['⚙️', 'Processeur', m.processeur], ['🧠', 'Mémoire', m.memoire], ['🎨', 'Carte graphique', m.graphique]].filter((r) => r[2]);
    return [
      s.photo ? el('img', { class: 'setup-photo', src: s.photo, alt: '', onclick: () => zoom(s.photo) }) : null,
      rows.length ? el('div', { class: 'kv' }, rows.map(([i, k, v]) => el('div', {}, el('span', { class: 'muted small' }, `${i} ${k}`), el('strong', {}, v)))) : null,
      (s.lignes || []).length ? el('div', { class: 'kv' }, s.lignes.map((l) => el('div', {}, el('span', { class: 'muted small' }, l.nom), el('strong', {}, l.valeur)))) : null,
      !rows.length && !(s.lignes || []).length ? note('Pas encore renseigné.') : null,
    ];
  }
  function collectionView(items) {
    if (!items.length) return [note('Pas encore de clips ni de captures.')];
    return [el('div', { class: 'gallery coll' }, items.map((m) => el('figure', {},
      m.type === 'video' ? el('video', { src: m.url, controls: '', preload: 'metadata', playsinline: '' }) : el('img', { src: m.url, alt: '', loading: 'lazy', onclick: () => zoom(m.url) }),
      el('figcaption', {}, el('strong', {}, m.titre || (m.type === 'video' ? 'Clip' : 'Capture')), el('span', { class: 'muted small' }, new Date(m.date).toLocaleDateString('fr-FR'))))))];
  }
  function msgRows(list, empty) {
    return list.length ? el('div', { class: 'msgs' }, list.map((m) => el('div', { class: 'msg' }, el('div', { class: 'mh' }, el('strong', {}, m.pseudo), el('span', { class: 'muted small' }, m.date)), el('p', {}, m.texte)))) : el('p', { class: 'empty' }, empty);
  }
  function guestbookView(g) {
    const form = g.formulaire;
    const gi = g.giscus;
    const how = el('div', { class: 'howto' },
      el('h2', {}, 'Écrire un mot'),
      form ? el('div', { class: 'opt' }, el('strong', {}, '1. Sans compte (le plus simple)'),
        el('ol', {}, el('li', {}, 'Clique sur « Ouvrir le formulaire » : il s’ouvre dans un nouvel onglet.'), el('li', {}, 'Mets ton pseudo, choisis « Livre d’or », écris ton message, envoie.'), el('li', {}, 'Le message arrive chez moi dans KuroPurr ; je le valide et il apparaît ici (quelques heures max).')),
        el('a', { class: 'btn', href: form, target: '_blank', rel: 'noopener' }, 'Ouvrir le formulaire ↗')) : null,
      gi ? el('div', { class: 'opt' }, el('strong', {}, form ? '2. Avec un compte GitHub' : 'Avec un compte GitHub'),
        el('ol', {}, el('li', {}, 'Dans le cadre ci-dessous, clique sur « Sign in with GitHub » et autorise giscus.'), el('li', {}, 'Écris ton message et clique sur « Comment ».'), el('li', {}, 'Il apparaît tout de suite dans le cadre (ta discussion est publique sur GitHub).')),
        el('div', { class: 'giscus-box', id: 'giscusBox' })) : null,
      !form && !gi ? el('p', { class: 'muted small' }, 'Le livre d’or n’est pas encore ouvert à l’écriture.') : null);
    const nodes = [msgRows(g.messages || [], 'Personne n’a encore écrit. Sois le premier !'), el('hr'), how];
    if (gi) setTimeout(() => mountGiscus(gi), 0);
    return nodes;
  }
  function mountGiscus(gi) {
    const box = $('giscusBox');
    if (!box) return;
    const sc = document.createElement('script');
    const attrs = { src: 'https://giscus.app/client.js', 'data-repo': gi.repo, 'data-repo-id': gi.repoId, 'data-category': gi.category, 'data-category-id': gi.categoryId, 'data-mapping': gi.mapping || 'specific', 'data-term': gi.term || 'Livre d’or', 'data-strict': '0', 'data-reactions-enabled': '1', 'data-emit-metadata': '0', 'data-input-position': 'top', 'data-theme': 'transparent_dark', 'data-lang': 'fr', crossorigin: 'anonymous', async: '' };
    for (const [k, v] of Object.entries(attrs)) sc.setAttribute(k, v);
    box.replaceChildren(sc);
  }
  function playlistView(p) {
    return [
      el('p', { class: 'muted small' }, 'Les morceaux que vous me conseillez. Je les écoute, et ceux que je valide apparaissent ici.'),
      msgRows(p.propositions || [], 'Aucune proposition pour l’instant.'),
      el('hr'),
      el('h2', {}, 'Proposer un morceau'),
      p.formulaire ? el('div', { class: 'opt' }, el('ol', {}, el('li', {}, 'Ouvre le formulaire (nouvel onglet).'), el('li', {}, 'Ton pseudo, le type « Proposition de musique », puis titre + artiste (un lien Spotify / YouTube, c’est encore mieux).'), el('li', {}, 'Envoie : je reçois ça dans KuroPurr et je valide.')), el('a', { class: 'btn', href: p.formulaire, target: '_blank', rel: 'noopener' }, 'Ouvrir le formulaire ↗')) : el('p', { class: 'muted small' }, 'Pas encore ouvert aux propositions.'),
    ];
  }
  function pingView(d) {
    const n = (d.evenements || {}).ping || 0;
    const today = new Date().toDateString();
    let done = false;
    try { done = localStorage.getItem('kp-ping') === today; } catch { /* rien */ }
    const btn = el('button', { class: 'bigbtn', type: 'button', disabled: done || null }, done ? 'Coucou envoyé aujourd’hui ✓' : '👋 Faire coucou');
    const msg = el('p', { class: 'muted small' }, done ? 'Merci ! Tu pourras recommencer demain.' : `Un clic, et je reçois une notification sur mon PC. Une fois par jour et par personne.${n ? ` Déjà ${n} coucou${n > 1 ? 's' : ''} reçus.` : ''}`);
    btn.addEventListener('click', () => {
      gcEvent('ping', 'Coucou');
      try { localStorage.setItem('kp-ping', today); } catch { /* rien */ }
      btn.disabled = true; btn.textContent = 'Coucou envoyé ✓'; msg.textContent = 'Envoyé ! Il verra passer une notification « quelqu’un te fait coucou » sur son PC.';
      burst(btn, '👋');
    });
    return [el('div', { class: 'center' }, btn, msg)];
  }
  function visitorsView(v) {
    if (!v) return [note('Compteur pas encore configuré.')];
    const pays = v.pays || [];
    const max = Math.max(1, ...pays.map((p) => p.n));
    return [
      el('div', { class: 'pstats three' }, stat('Visiteurs', (v.total || 0).toLocaleString('fr-FR')), stat('Pays', pays.length), stat('Mis à jour', v.maj ? ago(v.maj) : '—')),
      el('hr'),
      pays.length ? el('div', { class: 'toplist' }, pays.slice(0, 30).map((p, i) => el('div', { class: 'toprow' }, el('span', { class: 'rank' }, String(i + 1)), el('span', { class: 'tpic round flagpic' }, flag(p.code)), el('span', { class: 'tt' }, el('strong', {}, p.nom || p.code), el('span', { class: 'bar' }, el('span', { class: 'fill', style: `width:${Math.max(3, (p.n / max) * 100)}%` }))), el('span', { class: 'tn' }, el('b', {}, p.n.toLocaleString('fr-FR')))))) : el('p', { class: 'empty' }, 'Pas encore de visiteurs comptés.'),
      note('Visiteurs uniques comptés par GoatCounter, sans cookie ni traçage : seul le pays est agrégé.'),
    ];
  }
  /* ---- Cat.exe : la planche de Cat.exe (8 × 6 cases) ---- */
  const CAT = { cols: 8, rows: 6, anims: { sit: [25, 25, 25, 25, 25, 26, 26], purr: [27], groom: [28, 29, 30, 29], sleep: [33], stretch: [34, 35, 35, 36], pounce: [37, 38, 39, 40, 41], walk: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] } };
  function makeCat(size = 160) {
    const c = el('div', { class: 'scat', style: `width:${size}px;height:${size * 0.75}px` });
    let frames = CAT.anims.sit, i = 0, timer = null, once = null;
    const show = (f) => { c.style.backgroundPosition = `${((f % CAT.cols) / (CAT.cols - 1)) * 100}% ${(Math.floor(f / CAT.cols) / (CAT.rows - 1)) * 100}%`; };
    const play = (name, fps = 4, after = null) => { frames = CAT.anims[name] || CAT.anims.sit; i = 0; once = after; clearInterval(timer); show(frames[0]); timer = setInterval(() => { i++; if (i >= frames.length) { if (once) { const f = once; once = null; f(); return; } i = 0; } show(frames[i]); }, 1000 / fps); };
    c.play = play;
    play('sit', 1);
    return c;
  }
  function catView(d) {
    const n0 = (d.evenements || {}).calins || 0;
    let mine = 0;
    try { mine = Number(localStorage.getItem('kp-calins-' + new Date().toDateString()) || 0); } catch { /* rien */ }
    const cat = makeCat(200);
    const count = el('strong', { class: 'big' }, (n0 + 0).toLocaleString('fr-FR'));
    const hint = el('p', { class: 'muted small' }, 'Clique sur le chat pour le caresser. Il ronronne, et le compteur de câlins est partagé entre tous les visiteurs (30 par jour et par personne, il faut le laisser dormir).');
    let local = 0, last = 0;
    const idle = () => { const r = Math.random(); cat.play(r < 0.5 ? 'sit' : r < 0.8 ? 'groom' : 'sleep', 2); };
    const idleTimer = setInterval(idle, 6000);
    cat.addEventListener('click', () => {
      const now = Date.now();
      if (now - last < 700) return;
      last = now;
      if (mine >= 30) { hint.textContent = 'Il dort… reviens demain pour d’autres câlins.'; cat.play('sleep', 1); return; }
      mine++; local++;
      try { localStorage.setItem('kp-calins-' + new Date().toDateString(), String(mine)); } catch { /* rien */ }
      gcEvent('calins', 'Câlin à Cat.exe');
      count.textContent = (n0 + local).toLocaleString('fr-FR');
      burst(cat, '💗');
      cat.play(Math.random() < 0.2 ? 'stretch' : 'purr', 3, () => cat.play('sit', 1));
    });
    const eggs = foundEggs();
    const obs = new MutationObserver(() => { if ($('modal').hidden) { clearInterval(idleTimer); obs.disconnect(); } });
    obs.observe($('modal'), { attributes: true });
    return [
      el('div', { class: 'center' }, el('span', { class: 'catpad' }, cat), el('div', { class: 'calins' }, count, el('span', { class: 'muted small' }, ' câlins')), hint),
      el('hr'),
      el('p', { class: 'muted small' }, `🥚 Œufs de Pâques trouvés sur ce site : ${eggs.length} / ${EGGS.length}. ${eggs.length ? `Trouvés : ${eggs.map((e) => EGG_NAMES[e]).join(', ')}.` : 'Il y en a cachés un peu partout…'}`),
    ];
  }
  function burst(node, emoji) {
    const r = node.getBoundingClientRect();
    for (let k = 0; k < 6; k++) {
      const p = el('span', { class: 'fx', style: `left:${r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.6}px;top:${r.top + r.height / 2}px;--dx:${(Math.random() - 0.5) * 120}px;--d:${600 + Math.random() * 500}ms` }, emoji);
      document.body.append(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  /* ---------------- GoatCounter : visites + événements (ping, câlins, œufs) ---------------- */
  let gcCode = '';
  function gcEvent(path, title) {
    if (!gcCode) return;
    if (window.goatcounter && window.goatcounter.count) { window.goatcounter.count({ path, title, event: true }); return; }
    const u = `https://${gcCode}.goatcounter.com/count?p=${encodeURIComponent(path)}&t=${encodeURIComponent(title || path)}&e=true&rnd=${Math.random().toString(36).slice(2)}`;
    try { navigator.sendBeacon ? navigator.sendBeacon(u) : (new Image().src = u); } catch { new Image().src = u; }
  }

  /* ---------------- Œufs de Pâques ---------------- */
  const EGGS = ['konami', 'logo', 'miaou', 'hibou'];
  const EGG_NAMES = { konami: 'le code Konami', logo: 'le logo caressé', miaou: 'le mot magique', hibou: 'le hibou de nuit' };
  const foundEggs = () => { try { return JSON.parse(localStorage.getItem('kp-oeufs') || '[]'); } catch { return []; } };
  function egg(id, text) {
    const f = foundEggs();
    const first = !f.includes(id);
    if (first) { f.push(id); try { localStorage.setItem('kp-oeufs', JSON.stringify(f)); } catch { /* rien */ } gcEvent(`oeuf-${id}`, `Œuf : ${id}`); }
    const t = el('div', { class: 'egg-toast' }, el('strong', {}, first ? '🥚 Œuf de Pâques trouvé !' : '🥚 Déjà trouvé'), el('span', {}, text));
    document.body.append(t);
    setTimeout(() => t.remove(), 4000);
  }
  function catRain() {
    for (let k = 0; k < 14; k++) {
      const c = makeCat(70 + Math.random() * 60);
      c.classList.add('rain');
      c.style.left = `${Math.random() * 95}vw`;
      c.style.animationDuration = `${3 + Math.random() * 3}s`;
      c.style.animationDelay = `${Math.random() * 2}s`;
      c.play('walk', 12);
      document.body.append(c);
      setTimeout(() => c.remove(), 7000);
    }
  }
  (function eggs() {
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let ki = 0, typed = '';
    document.addEventListener('keydown', (e) => {
      ki = e.key === konami[ki] ? ki + 1 : (e.key === konami[0] ? 1 : 0);
      if (ki === konami.length) { ki = 0; egg('konami', 'Il pleut des chats.'); catRain(); }
      if (e.key.length === 1) { typed = (typed + e.key.toLowerCase()).slice(-5); if (typed === 'miaou') { typed = ''; egg('miaou', 'Miaou à toi aussi.'); document.body.classList.add('party'); setTimeout(() => document.body.classList.remove('party'), 6000); } }
    });
    let clicks = 0, t0 = 0;
    $('footLogo').addEventListener('click', () => { const now = Date.now(); clicks = now - t0 < 4000 ? clicks + 1 : 1; t0 = now; if (clicks === 7) { clicks = 0; egg('logo', 'Sept caresses sur le logo : le chat apprécie.'); document.body.classList.add('paws'); setTimeout(() => document.body.classList.remove('paws'), 15000); } });
    const h = new Date().getHours();
    if (h >= 2 && h < 5) setTimeout(() => egg('hibou', 'Toi aussi tu es debout à cette heure-ci ? Bienvenue chez les hiboux.'), 4000);
  })();

  /* ---------------- Journal des versions ---------------- */
  $('verClientBtn').addEventListener('click', () => {
    const j = (status && status.journal) || [];
    openSheet('Journal de KuroPurr', j.length ? j.map((r) => { const d = el('div', { class: 'md rel' }); d.innerHTML = `<h2>${r.version}</h2>` + markdown(r.notes); return d; }) : [note('Pas de journal disponible.')]);
    $('modal').querySelector('.modal-box').classList.add('wide');
  });
  $('verSiteBtn').addEventListener('click', () => {
    openSheet('Journal du site', SITE_LOG.map(([v, t]) => el('div', { class: 'rel' }, el('h2', {}, v), el('p', {}, t))));
    $('modal').querySelector('.modal-box').classList.remove('wide');
  });

  /* ---------------- Vues : GoatCounter (visiteurs uniques, sans cookie) ---------------- */
  let gcLoaded = false;
  async function views(enabled, code) {
    const box = $('views');
    gcCode = String(code || '').replace(/[^a-z0-9-]/gi, '').toLowerCase();
    box.hidden = !enabled || !gcCode;
    box.onclick = () => openTile('visiteurs');
    if (!enabled || !gcCode) return;
    if (!gcLoaded) {
      gcLoaded = true;
      const sc = document.createElement('script');
      sc.async = true; sc.src = '//gc.zgo.at/count.js';
      sc.setAttribute('data-goatcounter', `https://${gcCode}.goatcounter.com/count`);
      document.head.append(sc);
      try {
        const r = await fetch(`https://${gcCode}.goatcounter.com/counter/TOTAL.json`, { cache: 'no-store' });
        const j = await r.json();
        const n = Number(String(j.count || '').replace(/\D/g, ''));
        box.textContent = Number.isFinite(n) && n > 0 ? `${n.toLocaleString('fr-FR')} visite${n > 1 ? 's' : ''}` : 'visites';
      } catch {
        const v = status && status.divers && status.divers.visiteurs;
        box.textContent = v && v.total ? `${v.total.toLocaleString('fr-FR')} visiteurs` : 'visites';
      }
    }
  }

  load();
  setInterval(load, REFRESH_MS);
  setInterval(progress, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
