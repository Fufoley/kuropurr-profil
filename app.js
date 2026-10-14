// Page du profil : lit status.json (poussé par KuroPurr dans le dépôt GitHub) et l'affiche.
// Heures absolues partout : les barres avancent toutes seules, et le profil passe « hors ligne »
// si le statut n'est plus rafraîchi. Lus directement par la page, sans clé : Lanyard (Discord), hits.sh (vues).
(function () {
  'use strict';
  const SITE_VERSION = '1.2';
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
  let showAllHistory = false, showAllLinks = false, showAllNow = false, showAllProjects = false, projectFilter = 'all';
  let page = location.hash.replace('#', '') || 'profil';

  const DEFAULTS = { enLigne: false, enLigneDepuis: null, nePasDeranger: false, majLe: null, versionClient: '', pseudo: '', avatar: '', description: '', badges: [], discordId: '', liens: [], fond: '', accent: '', jeu: { actif: false }, musique: { actif: false }, activites: [], portfolio: '', projets: [], compteur: false };
  const normalize = (raw) => {
    const s = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
    for (const k of ['jeu', 'musique']) if (!s[k] || typeof s[k] !== 'object') s[k] = { actif: false };
    for (const k of ['badges', 'liens', 'activites', 'projets']) if (!Array.isArray(s[k])) s[k] = [];
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
      : s.majLe ? `Hors ligne · depuis ${when(s.majLe)}` : 'Hors ligne';
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
    $('portfolio').innerHTML = markdown(s.portfolio);
    renderProjects(s);
    showPage(page);

    $('updated').textContent = s.majLe ? `Dernière mise à jour : ${when(s.majLe)}` : 'Pas encore de mise à jour';
    loadLanyard(s.discordId);
    views(s.compteur);
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
    const nowBox = $('now'), more = $('nowMore'), allBox = $('nowAll');
    if (current.length) {
      $('nowTitle').textContent = 'Activité en cours';
      nowBox.replaceChildren(activityRow(current[0], true));
      more.hidden = current.length < 2;
      more.textContent = showAllNow ? 'Masquer les autres activités' : `Voir toutes les activités en cours (${current.length})`;
      allBox.hidden = !showAllNow || current.length < 2;
      allBox.replaceChildren(...current.slice(1).map((a) => activityRow(a, false)));
    } else {
      $('nowTitle').textContent = 'Activité récente';
      nowBox.replaceChildren(past.length ? activityRow(past[0], true) : el('p', { class: 'empty' }, 'Rien pour l’instant.'));
      more.hidden = true; allBox.hidden = true;
      if (past.length) past.shift(); // déjà affichée au-dessus
    }
    // Dernières activités : 3, puis 7 jours
    const limit = Date.now() - HISTORY_DAYS * 86400000;
    const week = past.filter((a) => Date.parse(a.fin) >= limit);
    const shown = showAllHistory ? week : week.slice(0, HISTORY_SHORT);
    $('history').replaceChildren(...(shown.length ? shown.map((a) => el('li', {}, entryIcon(a, 'k'),
      el('span', { class: 't' }, entryName(a), el('span', {}, ` · ${[a.detail, a.source].filter(Boolean).join(' · ')}`)),
      el('time', { datetime: a.debut, title: new Date(a.debut).toLocaleString('fr-FR') }, `${isToday(a.debut) ? clock.format(Date.parse(a.debut)) : dateFmt.format(Date.parse(a.debut))} · ${dur((Date.parse(a.fin) - Date.parse(a.debut)) / 1000)}`)))
      : [el('li', { class: 'empty' }, 'Rien d’autre ces 7 derniers jours.')]));
    const hm = $('historyMore');
    hm.hidden = week.length <= HISTORY_SHORT;
    hm.textContent = showAllHistory ? 'Afficher moins' : `Afficher plus (${week.length - HISTORY_SHORT})`;
  }
  $('nowMore').addEventListener('click', () => { showAllNow = !showAllNow; render(); });
  $('historyMore').addEventListener('click', () => { showAllHistory = !showAllHistory; render(); });
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
  function renderLinks(s) {
    const shown = showAllLinks ? s.liens : s.liens.slice(0, LINKS_SHORT);
    $('links').replaceChildren(...(shown.length ? shown.map((l) => el('a', { class: 'lnk', href: l.url, target: '_blank', rel: 'noopener', style: `--c:${colorOf(l.nom)}`, title: l.description || l.url },
      el('span', { class: 'pic' }, l.image ? el('img', { src: l.image, alt: '' }) : String(l.nom).charAt(0).toUpperCase()),
      el('strong', {}, l.nom), el('span', {}, l.description || String(l.url).replace(/^https:\/\/(www\.)?/, ''))))
      : [el('p', { class: 'empty', style: 'grid-column:1/-1' }, 'Aucun lien pour l’instant.')]));
    const m = $('linksMore');
    m.hidden = s.liens.length <= LINKS_SHORT;
    m.textContent = showAllLinks ? 'Afficher moins' : `Afficher plus (${s.liens.length - LINKS_SHORT})`;
  }
  $('linksMore').addEventListener('click', () => { showAllLinks = !showAllLinks; render(); });

  /* ---------------- Pages ---------------- */
  function showPage(id) {
    page = id;
    for (const b of $('nav').children) b.classList.toggle('on', b.dataset.page === id);
    for (const m of document.querySelectorAll('[data-page]')) if (m.tagName === 'MAIN') m.hidden = m.dataset.page !== id;
  }
  $('nav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; history.replaceState(null, '', `#${b.dataset.page}`); showPage(b.dataset.page); });

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
    const shown = showAllProjects ? filtered : preview;
    $('projects').replaceChildren(...(shown.length ? shown.map((p) => el('button', { class: 'project', type: 'button', onclick: () => openProject(p) },
      picOf(p, 'pic'),
      el('div', { class: 'pt' }, el('strong', {}, p.nom), p.description ? el('p', {}, p.description) : null, el('span', {}, el('span', { class: `st ${p.statut}` }, STATUS[p.statut] || 'En cours')))))
      : [el('p', { class: 'empty' }, all.length ? 'Aucun projet avec ce statut.' : 'Pas encore de projet.')]));
    const m = $('projectsMore');
    m.hidden = filtered.length <= preview.length;
    m.textContent = showAllProjects ? 'Voir moins' : `Voir plus (${filtered.length - preview.length})`;
  }
  $('projectsMore').addEventListener('click', () => { showAllProjects = !showAllProjects; renderProjects(status); });
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
  const badge = (name, icon) => el('img', { src: `https://cdn.discordapp.com/badge-icons/${icon}.png`, alt: name, title: name, onerror: (e) => e.target.replaceWith(el('span', { class: 'txt', title: name }, name)) });
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
    $('dcName').replaceChildren(u.global_name || u.username, clan);
    $('dcTag').textContent = `@${u.username} · ${({ online: 'en ligne', idle: 'absent', dnd: 'ne pas déranger' })[st] || 'hors ligne'}`;
    const badges = FLAGS.filter(([bit]) => Number(u.public_flags || 0) & bit).map(([, name, icon]) => badge(name, icon));
    if (u.premium_type) badges.push(badge('Nitro', NITRO));
    $('dcBadges').replaceChildren(...badges);
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

  /* ---------------- Vues : comptées une fois par visiteur et par jour ---------------- */
  // counterapi.dev (gratuit, sans compte, réponse JSON) ; en secours, le badge SVG de hits.sh.
  let viewsDone = false;
  async function views(enabled) {
    const box = $('views');
    box.hidden = !enabled;
    if (!enabled || viewsDone) return;
    viewsDone = true;
    const ns = `kuropurr-${location.host.replace(/[^a-z0-9]/gi, '-')}`.toLowerCase();
    const key = location.pathname.replace(/[^a-z0-9]/gi, '-').replace(/^-+|-+$/g, '') || 'profil';
    const today = new Date().toDateString();
    let mem = {};
    try { mem = JSON.parse(localStorage.getItem('kp-vues') || '{}'); } catch { /* stockage indisponible */ }
    const counted = mem.day === today;
    try {
      const r = await fetch(`https://api.counterapi.dev/v1/${ns}/${key}${counted ? '' : '/up'}`);
      const j = await r.json();
      const n = Number(j.count ?? (j.data && j.data.count));
      if (!Number.isFinite(n)) throw new Error();
      box.textContent = `${n.toLocaleString('fr-FR')} vues`;
      try { localStorage.setItem('kp-vues', JSON.stringify({ day: today, n })); } catch { /* tant pis */ }
    } catch {
      const img = el('img', { src: `https://hits.sh/${location.host}${location.pathname}.svg?label=vues&color=${encodeURIComponent((status && status.accent) || '#a9c59b').replace('%23', '')}&labelColor=1a1f1c&style=flat-square`, alt: 'vues', onerror: () => { box.textContent = mem.n ? `${mem.n.toLocaleString('fr-FR')} vues` : 'vues indisponibles'; } });
      box.replaceChildren(img);
    }
  }

  load();
  setInterval(load, REFRESH_MS);
  setInterval(progress, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
