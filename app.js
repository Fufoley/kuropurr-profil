// Page du profil : lit status.json (poussé par KuroPurr dans le dépôt GitHub) et l'affiche.
// Tout est calculé à partir d'heures absolues : la barre de musique avance toute seule,
// et le profil passe « hors ligne » si le statut n'est plus rafraîchi.
// Lus directement par la page (facultatif, sans clé) : Lanyard (statut Discord) et hits.sh (vues).
(function () {
  'use strict';
  const CONFIG = window.KP_PROFIL || {};
  const REFRESH_MS = 12000;
  const OFFLINE_AFTER_MS = 3 * 60 * 1000;
  const LANYARD_MS = 30000;
  const HISTORY_DAYS = 4;
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); }
    n.append(...kids.flat(2).filter((k) => k != null && k !== false));
    return n;
  };
  const fine = matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;

  let status = null;
  let lanyard = null;
  let entered = false;
  let page = location.hash.replace('#', '') || 'profil';
  let showAllHistory = false, showAllLinks = false;
  let lib = 'steam', animeStatus = 'watching';

  const DEFAULTS = { enLigne: false, enLigneDepuis: null, majLe: null, pseudo: '', avatar: '', description: '', humeur: '', badges: [], discordId: '', liens: [], fond: '', musiqueFond: '', curseur: '', accent: '', entree: '', jeu: { actif: false }, musique: { actif: false }, activites: [], portfolio: '', projets: [], steam: null, roblox: null, anime: null, compteur: false };
  const normalize = (raw) => {
    const s = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
    for (const k of ['jeu', 'musique']) if (!s[k] || typeof s[k] !== 'object') s[k] = { actif: false };
    for (const k of ['badges', 'liens', 'activites', 'projets']) if (!Array.isArray(s[k])) s[k] = [];
    if (!s.steam || !Array.isArray(s.steam.jeux)) s.steam = null;
    if (!s.roblox || !Array.isArray(s.roblox.jeux)) s.roblox = null;
    if (!s.anime || !Array.isArray(s.anime.liste)) s.anime = null;
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
  const dur = (sec) => { const m = Math.round(sec / 60); return m < 1 ? '< 1 min' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad(m % 60)}`; };
  const since = (iso) => dur((Date.now() - Date.parse(iso)) / 1000);
  const hours = (h) => h >= 1 ? `${Math.round(h * 10) / 10} h` : h > 0 ? `${Math.round(h * 60)} min` : 'jamais lancé';
  const clock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  const dateTime = (iso) => { const t = Date.parse(iso); return isToday(iso) ? `aujourd’hui à ${clock.format(t)}` : `le ${dateFmt.format(t)} à ${clock.format(t)}`; };
  const ago = (iso) => { const t = Date.parse(iso); if (!t) return ''; const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.floor(m / 60)} h` : m < 1440 * 30 ? `il y a ${Math.floor(m / 1440)} j` : new Date(t).toLocaleDateString('fr-FR'); };
  const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();
  const dayKey = (iso) => new Date(iso).toDateString();
  const dayLabel = (iso) => { const d = new Date(iso); const diff = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000); return diff === 0 ? 'Aujourd’hui' : diff === 1 ? 'Hier' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); };
  const isVideo = (u) => /\.(mp4|webm)(\?|$)/i.test(u);
  const svg = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = d; return s; };
  const ICONS = {
    jeu: '<path d="M7.5 8h9a4.5 4.5 0 0 1 4.4 5.5l-.8 3.5a2.2 2.2 0 0 1-3.8 1l-2-2.2h-4.6l-2 2.2a2.2 2.2 0 0 1-3.8-1l-.8-3.5A4.5 4.5 0 0 1 7.5 8z"/>',
    musique: '<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };
  // Réseaux : couleur et lettre choisies d'après le nom (pas de logo de marque).
  const SOCIAL = { discord: '#5865f2', twitch: '#9146ff', youtube: '#ff2d2d', github: '#8b949e', x: '#cfd3d8', twitter: '#1d9bf0', instagram: '#e1306c', tiktok: '#69c9d0', steam: '#66c0f4', spotify: '#1db954', roblox: '#e2231a', reddit: '#ff4500', kick: '#53fc18', myanimelist: '#2e51a2', anilist: '#3db4f2', bluesky: '#0085ff', mastodon: '#6364ff', linkedin: '#0a66c2', patreon: '#ff424d', kofi: '#ff5e5b', deezer: '#a238ff', soundcloud: '#ff5500', site: '#a9c59b', mail: '#a9c59b' };
  const colorOf = (name) => SOCIAL[String(name).toLowerCase().replace(/[^a-z]/g, '')] || (status && status.accent) || '#a9c59b';
  const openExternal = (url) => el('a', { href: url, target: '_blank', rel: 'noopener' });

  /** Markdown minimal et sûr (tout est échappé, puis balisé) : titres, listes, gras/italique, liens, code, citations. */
  function markdown(src) {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<s>$1</s>')
      .replace(/!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|\s)(https:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    const lines = String(src || '').replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0, para = [], list = null;
    const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
    const flushL = () => { if (list) { out.push(`<${list.tag}>${list.items.map((x) => `<li>${inline(x)}</li>`).join('')}</${list.tag}>`); list = null; } };
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) { flushP(); flushL(); const code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); i++; continue; }
      const h = l.match(/^(#{1,3})\s+(.*)/);
      if (h) { flushP(); flushL(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
      if (/^(-{3,}|\*{3,})\s*$/.test(l)) { flushP(); flushL(); out.push('<hr>'); i++; continue; }
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

  /* ---------------- Apparence ---------------- */
  function applyLook(s) {
    document.documentElement.style.setProperty('--accent', s.accent || '#a9c59b');
    const bg = $('bg');
    if (bg.dataset.src !== s.fond) {
      bg.dataset.src = s.fond;
      bg.replaceChildren();
      if (s.fond) {
        if (isVideo(s.fond)) { const v = el('video', { autoplay: '', muted: '', loop: '', playsinline: '' }); v.muted = true; v.src = s.fond; bg.append(v); }
        else bg.append(el('img', { src: s.fond, alt: '' }));
      }
    }
    document.body.style.cursor = s.curseur === 'paw' ? 'url(cursor.svg) 3 2, auto' : s.curseur ? `url(${s.curseur}) 4 4, auto` : '';
    const a = $('ambiance');
    if (a.dataset.src !== s.musiqueFond) {
      a.dataset.src = s.musiqueFond;
      if (s.musiqueFond) { a.src = s.musiqueFond; a.volume = Number($('ambVolume').value) / 100; if (entered) a.play().catch(() => {}); } else { a.removeAttribute('src'); a.pause(); }
    }
    $('ambianceBox').hidden = !s.musiqueFond;
    $('sound').hidden = !s.musiqueFond;
  }

  function presence(s) {
    const age = s.majLe ? Date.now() - Date.parse(s.majLe) : Infinity;
    const kp = !!s.enLigne && age < OFFLINE_AFTER_MS;
    const dc = lanyard && lanyard.discord_status && lanyard.discord_status !== 'offline' ? lanyard.discord_status : null;
    return { kp, dc };
  }

  /** Jeu et musique effectifs : KuroPurr d'abord, sinon ce que Discord (Lanyard) voit. */
  function activity(s, pr) {
    let game = pr.kp && s.jeu.actif ? { nom: s.jeu.nom, plateforme: s.jeu.plateforme, depuis: s.jeu.depuis, url: s.jeu.url, image: s.jeu.image } : null;
    let music = pr.kp && s.musique.actif && s.musique.debut && s.musique.fin ? { titre: s.musique.titre, artiste: s.musique.artiste, debut: Date.parse(s.musique.debut), fin: Date.parse(s.musique.fin), source: s.musique.source } : null;
    if (!game && lanyard && Array.isArray(lanyard.activities)) {
      const a = lanyard.activities.find((x) => x.type === 0 && x.name);
      if (a) game = { nom: a.name, plateforme: 'Discord', depuis: a.timestamps && a.timestamps.start ? new Date(a.timestamps.start).toISOString() : null };
    }
    if (!music && lanyard && lanyard.listening_to_spotify && lanyard.spotify && lanyard.spotify.timestamps) {
      music = { titre: lanyard.spotify.song, artiste: lanyard.spotify.artist, debut: lanyard.spotify.timestamps.start, fin: lanyard.spotify.timestamps.end, source: 'Spotify' };
    }
    return { game, music };
  }

  /* ---------------- Rendu ---------------- */
  let current = null;
  function render() {
    const s = status;
    applyLook(s);
    document.title = s.pseudo ? `${s.pseudo} · profil` : 'Profil';
    $('enterName').textContent = s.pseudo || 'Profil';
    $('enterText').textContent = s.entree || 'clique pour entrer';
    typewrite(s.pseudo || 'Quelqu’un');

    const pr = presence(s);
    $('dot').className = `dot ${pr.kp ? 'on' : ''}`;
    $('presenceText').textContent = pr.kp
      ? `En ligne sur KuroPurr${s.enLigneDepuis ? ` · depuis ${since(s.enLigneDepuis)}` : ''}`
      : s.majLe ? `Hors ligne · vu ${dateTime(s.majLe)}` : 'Hors ligne';

    // Carte profil
    const dcAvatar = lanyard && lanyard.discord_user && lanyard.discord_user.avatar ? `https://cdn.discordapp.com/avatars/${lanyard.discord_user.id}/${lanyard.discord_user.avatar}.png?size=256` : '';
    const avatar = s.avatar || dcAvatar;
    const img = $('avatarImg');
    if (avatar && img.dataset.src !== avatar) { img.dataset.src = avatar; img.src = avatar; }
    if (!avatar) img.src = 'logo.png';
    img.onerror = () => { img.src = 'logo.png'; };
    $('ring').className = `ring ${pr.dc || (pr.kp ? 'online' : '')}`;
    $('badges').replaceChildren(...s.badges.map((b) => el('span', { class: 'badge' }, b)));
    $('mood').hidden = !s.humeur; $('mood').textContent = s.humeur || '';
    $('description').innerHTML = markdown(s.description);
    renderDiscord(s, pr);

    // Activité
    const { game, music } = activity(s, pr);
    current = music;
    const rows = [];
    if (game) rows.push(el('div', { class: 'row live' }, el('span', { class: 'ico' }, game.image ? el('img', { src: game.image, alt: '' }) : svg(ICONS.jeu)),
      el('div', { class: 'row-text' }, el('strong', {}, game.url ? Object.assign(openExternal(game.url), { textContent: game.nom, style: 'color:inherit;text-decoration:none' }) : game.nom), el('span', { class: 'muted' }, `${game.plateforme} · en jeu${game.depuis ? ` depuis ${since(game.depuis)}` : ''}`))));
    if (music) rows.push(el('div', { class: 'row live' }, el('span', { class: 'ico' }, svg(ICONS.musique)),
      el('div', { class: 'row-text' }, el('strong', {}, music.titre), el('span', { class: 'muted' }, [music.artiste, music.source].filter(Boolean).join(' · ')), el('div', { class: 'bar' }, el('div', { class: 'fill', id: 'musicFill' })), el('span', { class: 'times' }, el('span', { id: 'musicPos' }, '0:00'), el('span', { id: 'musicLen' }, '0:00')))));
    $('now').replaceChildren(...rows);
    renderHistory(s);
    renderLinks(s);

    // Autres pages
    $('portfolio').innerHTML = markdown(s.portfolio);
    renderProjects(s);
    renderGames(s);
    renderAnime(s);
    renderMusic(s, music);
    progress();

    $('updated').textContent = s.majLe ? `Dernière mise à jour ${dateTime(s.majLe)}` : '';
    renderTabs(s);
    loadLanyard(s.discordId);
    views(s.compteur);
  }

  function renderTabs(s) {
    const list = [['profil', 'Profil'], ['projets', 'Projets & Portfolio'], ['jeux', 'Jeux']];
    if (s.anime) list.push(['anime', 'Anime']);
    list.push(['musique', 'Musique']);
    if (!list.some(([id]) => id === page)) page = 'profil';
    $('tabs').replaceChildren(...list.map(([id, label]) => el('button', { class: `tab ${id === page ? 'on' : ''}`, type: 'button', onclick: () => { page = id; history.replaceState(null, '', `#${id}`); renderTabs(status); } }, label)));
    for (const p of document.querySelectorAll('[data-page]')) p.hidden = p.dataset.page !== page;
  }

  function histItem(a) {
    const end = a.fin ? Date.parse(a.fin) : Date.now();
    const length = (end - Date.parse(a.debut)) / 1000;
    const name = a.url ? Object.assign(openExternal(a.url), { textContent: a.nom }) : a.nom;
    return el('li', {}, el('span', { class: 'k' }, a.image ? el('img', { src: a.image, alt: '', loading: 'lazy' }) : svg(ICONS[a.type] || ICONS.jeu)),
      el('span', { class: 't' }, name, el('span', {}, ` · ${[a.detail, a.source].filter(Boolean).join(' · ')}${a.fin ? '' : ' · en cours'}`)),
      el('time', { datetime: a.debut, title: new Date(a.debut).toLocaleString('fr-FR') }, `${clock.format(Date.parse(a.debut))} · ${dur(length)}`));
  }
  function renderHistory(s) {
    const limit = Date.now() - HISTORY_DAYS * 86400000;
    const all = s.activites.filter((a) => a.debut).sort((a, b) => Date.parse(b.debut) - Date.parse(a.debut));
    const recent = all.filter((a) => Date.parse(a.fin || a.debut) >= limit);
    const shown = showAllHistory ? all : recent;
    const days = [];
    for (const a of shown) { const k = dayKey(a.debut); let d = days.find((x) => x.k === k); if (!d) { d = { k, label: dayLabel(a.debut), items: [] }; days.push(d); } d.items.push(a); }
    $('history').replaceChildren(...(days.length ? days.map((d) => el('div', { class: 'day' }, el('h3', {}, d.label), el('ul', { class: 'hist' }, d.items.map(histItem)))) : [el('p', { class: 'empty' }, 'Rien ces derniers jours.')]));
    const more = $('historyMore');
    more.hidden = all.length <= recent.length;
    more.textContent = showAllHistory ? 'Afficher moins' : `Afficher plus (${all.length - recent.length})`;
  }
  $('historyMore').addEventListener('click', () => { showAllHistory = !showAllHistory; renderHistory(status); });

  function linkTile(l) {
    const c = colorOf(l.nom);
    return el('a', { class: 'link-tile', href: l.url, target: '_blank', rel: 'noopener', style: `--c:${c}` },
      el('span', { class: 'pic' }, l.image ? el('img', { src: l.image, alt: '', loading: 'lazy' }) : l.nom.charAt(0).toUpperCase()),
      el('span', { class: 'lt' }, el('strong', {}, l.nom), l.description ? el('span', {}, l.description) : el('span', {}, l.url.replace(/^https:\/\/(www\.)?/, ''))));
  }
  function renderLinks(s) {
    const featured = s.liens.filter((l) => l.avant);
    const shown = showAllLinks || !featured.length ? s.liens : featured;
    $('links').replaceChildren(...(shown.length ? shown.map(linkTile) : [el('p', { class: 'empty' }, 'Aucun lien pour l’instant.')]));
    const more = $('linksMore');
    more.hidden = !featured.length || featured.length === s.liens.length;
    more.textContent = showAllLinks ? 'Afficher moins' : `Afficher plus (${s.liens.length - featured.length})`;
  }
  $('linksMore').addEventListener('click', () => { showAllLinks = !showAllLinks; renderLinks(status); });

  /* ---------------- Projets ---------------- */
  const logoOf = (p, big) => el('span', { class: `logo ${big ? 'big' : ''}` }, p.logo ? el('img', { src: p.logo, alt: '' }) : p.nom.charAt(0).toUpperCase());
  function renderProjects(s) {
    $('projects').replaceChildren(...(s.projets.length ? s.projets.map((p) => el('button', { class: 'project', type: 'button', onclick: () => openProject(p) },
      el('div', { class: 'project-head' }, logoOf(p), el('strong', {}, p.nom)),
      p.description ? el('p', {}, p.description) : null,
      p.tags && p.tags.length ? el('div', { class: 'tags' }, p.tags.map((t) => el('span', { class: 'tag' }, t))) : null,
      p.liens && p.liens.length ? el('div', { class: 'chips' }, p.liens.map((l) => el('a', { class: 'chip', href: l.url, target: '_blank', rel: 'noopener', onclick: (e) => e.stopPropagation() }, svg(ICONS.link), l.nom))) : null))
      : [el('p', { class: 'empty' }, 'Pas encore de projet.')]));
  }
  function openProject(p) {
    const members = (p.membres || []).map((m) => el(m.url ? 'a' : 'span', { class: 'member', href: m.url || null, target: m.url ? '_blank' : null, rel: 'noopener' },
      m.avatar ? el('img', { src: m.avatar, alt: '' }) : el('span', { class: 'ini' }, m.nom.charAt(0).toUpperCase()), m.nom));
    const body = $('modalBody');
    body.replaceChildren(...[
      el('div', { class: 'project-head' }, logoOf(p, true), el('div', {}, el('h1', { style: 'font-size:22px' }, p.nom), p.description ? el('p', { class: 'muted', style: 'margin:2px 0 0' }, p.description) : null)),
      p.tags && p.tags.length ? el('div', { class: 'tags', style: 'margin-top:10px' }, p.tags.map((t) => el('span', { class: 'tag' }, t))) : null,
      el('div', { class: 'md' }),
      p.liens && p.liens.length ? [el('h3', {}, 'Liens'), el('div', { class: 'chips' }, p.liens.map((l) => el('a', { class: 'chip', href: l.url, target: '_blank', rel: 'noopener' }, svg(ICONS.link), l.nom)))] : null,
      members.length ? [el('h3', {}, 'Membres'), el('div', { class: 'members' }, members)] : null].flat(2).filter(Boolean));
    body.querySelector('.md').innerHTML = markdown(p.details);
    $('modal').hidden = false;
  }
  $('modalClose').addEventListener('click', () => { $('modal').hidden = true; });
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) $('modal').hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('modal').hidden = true; });

  /* ---------------- Jeux ---------------- */
  $('gameSwitch').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; lib = b.dataset.lib; renderGames(status); });
  for (const id of ['gameSearch', 'gameSort', 'gameFilter']) $(id).addEventListener('input', () => status && renderGames(status));
  function cover(src, name, square) {
    const img = el('img', { src, alt: '', loading: 'lazy' });
    const box = el('div', { class: `cover ${square ? 'square' : ''}` }, img, el('span', { class: 'initial' }, String(name).charAt(0)));
    if (!src) box.classList.add('none'); else img.onerror = () => box.classList.add('none');
    return box;
  }
  function renderGames(s) {
    for (const b of $('gameSwitch').children) b.classList.toggle('on', b.dataset.lib === lib);
    const q = $('gameSearch').value.trim().toLowerCase();
    const sort = $('gameSort').value, filter = $('gameFilter').value;
    const stats = $('gameStats'), grid = $('games');
    $('gameTools').hidden = lib === 'minecraft';
    $('gameFilter').hidden = lib !== 'steam';
    if (lib === 'minecraft') {
      stats.replaceChildren();
      grid.replaceChildren(el('div', { class: 'wip', style: 'grid-column: 1 / -1' }, el('strong', {}, 'En cours de fabrication'), 'Le launcher Minecraft de KuroPurr arrive : cette bibliothèque s’affichera ici.'));
      return;
    }
    if (lib === 'roblox') {
      const r = s.roblox;
      if (!r) { stats.replaceChildren(); grid.replaceChildren(el('p', { class: 'empty' }, 'Pas de bibliothèque Roblox pour l’instant.')); return; }
      stats.replaceChildren(el('span', {}, el('b', {}, String(r.total)), ' jeux'), el('span', {}, el('b', {}, hours(r.heures)), ' vues par KuroPurr'));
      const playing = s.jeu.actif && s.jeu.plateforme === 'Roblox' ? String(s.jeu.nom).toLowerCase() : '';
      let list = r.jeux.filter((g) => !q || String(g.nom).toLowerCase().includes(q));
      list.sort((a, b) => sort === 'name' ? String(a.nom).localeCompare(b.nom) : sort === 'hours' ? b.heures - a.heures : Date.parse(b.dernier || 0) - Date.parse(a.dernier || 0));
      grid.replaceChildren(...(list.length ? list.map((g) => {
        const now = playing && String(g.nom).toLowerCase() === playing;
        return el(g.url ? 'a' : 'div', { class: `game ${now ? 'playing' : ''}`, href: g.url || null, target: g.url ? '_blank' : null, rel: 'noopener' },
          cover(g.image, g.nom, true), now ? el('span', { class: 'pill' }, 'en jeu') : null,
          el('div', { class: 'g' }, el('strong', {}, g.nom), el('span', {}, `${hours(g.heures)} · ${g.sessions} session${g.sessions > 1 ? 's' : ''}`), el('span', {}, g.dernier ? `dernière partie ${ago(g.dernier)}` : '')));
      }) : [el('p', { class: 'empty' }, 'Aucun jeu ne correspond.')]));
      return;
    }
    const st = s.steam;
    if (!st) { stats.replaceChildren(); grid.replaceChildren(el('p', { class: 'empty' }, 'Pas de bibliothèque Steam pour l’instant.')); return; }
    stats.replaceChildren(el('span', {}, el('b', {}, String(st.total)), ' jeux'), el('span', {}, el('b', {}, `${st.heures} h`), ' au total'), el('span', {}, el('b', {}, hours(st.heures2s || 0)), ' ces 2 semaines'), st.installes != null ? el('span', {}, el('b', {}, String(st.installes)), ' installés') : null);
    const playing = s.jeu.actif && s.jeu.plateforme === 'Steam' ? String(s.jeu.nom).toLowerCase() : '';
    let list = st.jeux.filter((g) => !q || String(g.nom).toLowerCase().includes(q));
    if (filter === 'installed') list = list.filter((g) => g.installe);
    if (filter === 'recent') list = list.filter((g) => g.heures2s > 0);
    if (filter === 'played') list = list.filter((g) => g.heures > 0);
    list.sort((a, b) => sort === 'name' ? String(a.nom).localeCompare(b.nom) : sort === 'recent' ? (b.heures2s - a.heures2s) || (b.heures - a.heures) : sort === 'last' ? Date.parse(b.dernier || 0) - Date.parse(a.dernier || 0) : b.heures - a.heures);
    grid.replaceChildren(...(list.length ? list.map((g) => {
      const now = playing && String(g.nom).toLowerCase() === playing;
      return el('a', { class: `game ${now ? 'playing' : ''}`, href: `https://store.steampowered.com/app/${g.appid}`, target: '_blank', rel: 'noopener' },
        cover(`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`, g.nom), now ? el('span', { class: 'pill' }, 'en jeu') : g.heures2s > 0 ? el('span', { class: 'pill' }, 'récent') : null,
        el('div', { class: 'g' }, el('strong', {}, g.nom), el('span', {}, `${hours(g.heures)}${g.heures2s > 0 ? ` · ${hours(g.heures2s)} récemment` : ''}`), el('span', {}, [g.installe ? 'installé' : '', g.dernier ? ago(g.dernier) : ''].filter(Boolean).join(' · '))));
    }) : [el('p', { class: 'empty' }, 'Aucun jeu ne correspond.')]));
  }

  /* ---------------- Anime ---------------- */
  $('animeSwitch').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; animeStatus = b.dataset.st; renderAnime(status); });
  function renderAnime(s) {
    const a = s.anime;
    if (!a) return;
    for (const b of $('animeSwitch').children) b.classList.toggle('on', b.dataset.st === animeStatus);
    const st = a.stats || {};
    $('animeStats').replaceChildren(el('span', {}, el('b', {}, String(st.total || 0)), ' animes'), el('span', {}, el('b', {}, String(st.termines || 0)), ' terminés'), el('span', {}, el('b', {}, String(st.episodes || 0)), ' épisodes'),
      a.utilisateur ? el('a', { href: `https://myanimelist.net/profile/${encodeURIComponent(a.utilisateur)}`, target: '_blank', rel: 'noopener' }, 'MyAnimeList ↗') : null);
    const list = a.liste.filter((x) => x.statut === animeStatus).sort((x, y) => Date.parse(y.maj || 0) - Date.parse(x.maj || 0));
    $('animeGrid').replaceChildren(...(list.length ? list.map((x) => {
      const pct = x.episodes ? Math.min(100, (x.progression / x.episodes) * 100) : 0;
      return el('a', { class: 'anime', href: `https://myanimelist.net/anime/${x.id}`, target: '_blank', rel: 'noopener', title: x.titre },
        x.image ? el('img', { src: x.image, alt: '', loading: 'lazy' }) : el('div', { style: 'aspect-ratio:2/3;background:#141716' }),
        el('div', { class: 'g' }, el('strong', {}, x.titre), el('span', {}, animeStatus === 'completed' ? (x.note ? `note ${x.note}/10` : 'terminé') : `${x.progression} / ${x.episodes || '?'} ép.`),
          animeStatus !== 'completed' && animeStatus !== 'plan_to_watch' ? el('div', { class: 'bar' }, el('div', { class: 'fill', style: `width:${pct}%` })) : null));
    }) : [el('p', { class: 'empty', style: 'grid-column:1/-1' }, 'Rien dans cette liste.')]));
  }

  /* ---------------- Musique ---------------- */
  const SRC_COLORS = { spotify: '#1db954', deezer: '#a238ff', youtube: '#ff2d2d', firefox: '#ff7139', chrome: '#4285f4', edge: '#0078d4', brave: '#fb542b', vlc: '#f28c28', soundcloud: '#ff5500', tidal: '#cfd3d8', 'apple music': '#fc3c44' };
  function renderMusic(s, music) {
    $('np').hidden = !music; $('npNothing').hidden = !!music;
    if (music) { $('npTitle').textContent = music.titre; $('npArtist').textContent = music.artiste || ''; $('npSource').textContent = music.source ? `En écoute sur ${music.source}` : 'En écoute'; }
    const songs = s.activites.filter((a) => a.type === 'musique' && a.debut).sort((a, b) => Date.parse(b.debut) - Date.parse(a.debut));
    const groups = [];
    for (const a of songs) { const name = a.source || 'Autre'; let g = groups.find((x) => x.name === name); if (!g) { g = { name, items: [] }; groups.push(g); } g.items.push(a); }
    $('music').replaceChildren(...groups.map((g) => {
      const seen = new Map();
      for (const a of g.items) { const key = `${a.nom}|${a.detail}`; const e = seen.get(key); if (e) e.n++; else seen.set(key, { ...a, n: 1 }); }
      const items = [...seen.values()].slice(0, 15);
      return el('div', { class: 'src' }, el('h3', { style: `--c:${SRC_COLORS[g.name.toLowerCase()] || (s.accent || '#a9c59b')}` }, el('i'), g.name, el('span', { class: 'muted', style: 'text-transform:none;letter-spacing:0;font-weight:400' }, ` · ${g.items.length} écoute${g.items.length > 1 ? 's' : ''}`)),
        el('ul', { class: 'hist' }, items.map((a) => el('li', {}, el('span', { class: 'k' }, svg(ICONS.musique)),
          el('span', { class: 't' }, a.nom, el('span', {}, a.detail ? ` · ${a.detail}` : '', a.n > 1 ? ` · ×${a.n}` : '')),
          el('time', {}, ago(a.debut))))));
    }), ...(groups.length ? [] : [el('p', { class: 'empty' }, 'Pas encore d’historique d’écoute.')]));
  }

  function progress() {
    const fill = $('musicFill');
    if (!current) return;
    const total = Math.max(1, current.fin - current.debut);
    const pos = Math.min(total, Math.max(0, Date.now() - current.debut));
    const w = `${(pos / total) * 100}%`;
    if (fill) { fill.style.width = w; $('musicPos').textContent = fmtTime(pos); $('musicLen').textContent = fmtTime(total); }
    $('npFill').style.width = w; $('npPos').textContent = fmtTime(pos); $('npLen').textContent = fmtTime(total);
    const dcFill = $('dcFill'); if (dcFill && lanyard && lanyard.spotify && lanyard.spotify.timestamps) { const t = lanyard.spotify.timestamps; dcFill.style.width = `${Math.min(100, ((Date.now() - t.start) / Math.max(1, t.end - t.start)) * 100)}%`; }
  }

  /* ---------------- Pseudo animé, carte inclinée ---------------- */
  let typed = '', typing = null;
  function typewrite(text) {
    if (typed === text || !entered) return;
    typed = text;
    clearInterval(typing);
    const out = $('pseudo');
    out.textContent = '';
    let i = 0;
    typing = setInterval(() => { out.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typing); }, 70);
  }
  if (fine) {
    const card = $('card');
    card.style.transition = 'transform .15s ease-out';
    card.addEventListener('mousemove', (e) => { const r = card.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; card.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`; });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  }

  /* ---------------- Discord (Lanyard) ---------------- */
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
  // Badges Discord : bit de public_flags, nom, icône officielle (CDN Discord).
  const FLAGS = [
    [1, 'Staff Discord', '5e74e9b61934fc1f67c65515d1f7e60d'], [2, 'Partenaire', '3f9748e53446a137a052f3454e2de41e'], [4, 'HypeSquad Events', 'bf01d1073931f921909045f3a39fd264'],
    [8, 'Bug Hunter', '2717692c7dca7289b35297368a940dd0'], [64, 'HypeSquad Bravery', '8a88d63823d8a71cd5e390baa45efa02'], [128, 'HypeSquad Brilliance', '011940fd013da3f7fb926e4a1cd2e618'],
    [256, 'HypeSquad Balance', '3aa41de486fa12454c3761e8e223442e'], [512, 'Early Supporter', '7060786766c9c840eb3019e725d2b358'], [16384, 'Bug Hunter Gold', '848f79194d4be5ff5f81505cbd0ce1e6'],
    [131072, 'Développeur de bot vérifié', '6df5892e0f35b866c5edb2cd7a01ab16'], [262144, 'Modérateur certifié', 'fee1624003e2fee35cb398e125dc479b'], [4194304, 'Développeur actif', '6bdc42827a38498929a4920da12695d9'],
  ];
  const NITRO_ICON = '2ba85e8026a8614b640c2837bcdfe21b';
  function discordBadges() {
    const u = lanyard && lanyard.discord_user;
    if (!u) return [];
    const out = FLAGS.filter(([bit]) => Number(u.public_flags || 0) & bit).map(([, name, icon]) => ({ name, icon }));
    if (u.premium_type) out.push({ name: 'Nitro', icon: NITRO_ICON });
    return out;
  }
  const badgeImg = (b) => el('img', { src: `https://cdn.discordapp.com/badge-icons/${b.icon}.png`, alt: b.name, title: b.name, onerror: (e) => { e.target.replaceWith(el('span', { class: 'badge discord' }, b.name)); } });
  /** Carte Discord à droite (via Lanyard) : photo, nom, badges, statut, activité en cours. */
  function renderDiscord(s, pr) {
    const card = $('discordCard');
    card.hidden = !s.discordId;
    if (!s.discordId) return;
    const u = lanyard && lanyard.discord_user;
    if (!u) {
      $('dcName').textContent = 'Discord';
      $('dcTag').textContent = '';
      $('dcBadges').replaceChildren();
      $('dcState').textContent = 'Profil Discord indisponible pour le moment.';
      $('dcActivity').hidden = true;
      return;
    }
    const avatar = u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${String(u.avatar).startsWith('a_') ? 'gif' : 'png'}?size=128` : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) >> 22n) % 6}.png`;
    const img = $('dcAvatar');
    if (img.dataset.src !== avatar) { img.dataset.src = avatar; img.src = avatar; img.onerror = () => { img.src = 'logo.png'; }; }
    const deco = u.avatar_decoration_data && u.avatar_decoration_data.asset ? `https://cdn.discordapp.com/avatar-decoration-presets/${u.avatar_decoration_data.asset}.png?size=96&passthrough=true` : '';
    $('dcDeco').hidden = !deco;
    if (deco && $('dcDeco').dataset.src !== deco) { $('dcDeco').dataset.src = deco; $('dcDeco').src = deco; }
    $('dcRing').className = `ring ${pr.dc || ''}`;
    const clan = u.primary_guild && u.primary_guild.tag ? el('span', { class: 'dc-clan' }, u.primary_guild.badge && u.primary_guild.identity_guild_id ? el('img', { src: `https://cdn.discordapp.com/clan-badges/${u.primary_guild.identity_guild_id}/${u.primary_guild.badge}.png?size=16`, alt: '' }) : null, u.primary_guild.tag) : null;
    $('dcName').replaceChildren(u.global_name || u.username, clan);
    $('dcTag').textContent = `@${u.username}`;
    $('dcBadges').replaceChildren(...discordBadges().map(badgeImg));
    $('dcState').textContent = pr.dc ? ({ online: 'En ligne', idle: 'Absent', dnd: 'Ne pas déranger' })[pr.dc] : 'Hors ligne';
    // Activité vue par Discord : Spotify d'abord (avec la pochette), sinon le premier jeu
    const act = $('dcActivity');
    let node = null;
    if (lanyard.listening_to_spotify && lanyard.spotify) {
      const sp = lanyard.spotify;
      node = [sp.album_art_url ? el('img', { src: sp.album_art_url, alt: '' }) : el('span', { class: 'ph' }, svg(ICONS.musique)),
        el('div', { class: 't' }, el('strong', {}, sp.song), el('span', {}, `${sp.artist || ''}${sp.album ? ' · ' + sp.album : ''}`), el('span', {}, 'Écoute Spotify'),
          sp.timestamps ? el('div', { class: 'bar' }, el('div', { class: 'fill', id: 'dcFill' })) : null)];
    } else {
      const a = (lanyard.activities || []).find((x) => x.type === 0 && x.name);
      if (a) {
        const asset = a.assets && a.assets.large_image ? (String(a.assets.large_image).startsWith('mp:') ? `https://media.discordapp.net/${String(a.assets.large_image).slice(3)}` : `https://cdn.discordapp.com/app-assets/${a.application_id}/${a.assets.large_image}.png`) : '';
        node = [asset ? el('img', { src: asset, alt: '', onerror: (e) => e.target.replaceWith(el('span', { class: 'ph' }, svg(ICONS.jeu))) }) : el('span', { class: 'ph' }, svg(ICONS.jeu)),
          el('div', { class: 't' }, el('strong', {}, a.name), a.details ? el('span', {}, a.details) : null, a.state ? el('span', {}, a.state) : null,
            el('span', {}, a.timestamps && a.timestamps.start ? `Joue depuis ${dur((Date.now() - a.timestamps.start) / 1000)}` : 'Joue'))];
      }
    }
    act.hidden = !node;
    if (node) act.replaceChildren(...node);
  }

  /* ---------------- Compteur de vues (hits.sh) ---------------- */
  let viewsDone = false;
  async function views(enabled) {
    if (!enabled || viewsDone) return;
    viewsDone = true;
    const box = $('views');
    const key = `${location.host}${location.pathname}`.replace(/\/+$/, '');
    try {
      const r = await fetch(`https://hits.sh/${key}.json`);
      const j = await r.json();
      const n = Number(j.total ?? j.count ?? j.hits);
      if (!Number.isFinite(n)) throw new Error();
      box.textContent = `${n.toLocaleString('fr-FR')} vues`;
    } catch {
      box.replaceChildren(el('img', { src: `https://hits.sh/${key}.svg?label=vues&color=${encodeURIComponent((status && status.accent) || '#a9c59b')}&labelColor=1a1f1c&style=flat-square`, alt: 'vues' }));
    }
    box.hidden = false;
  }

  /* ---------------- Entrée, son ---------------- */
  function enter() {
    if (entered) return;
    entered = true;
    $('enter').classList.add('gone');
    $('app').hidden = false;
    const a = $('ambiance');
    if (a.getAttribute('src')) a.play().catch(() => {});
    if (status) typewrite(status.pseudo || 'Quelqu’un');
  }
  $('enter').addEventListener('click', enter);
  $('enter').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') enter(); });
  const amb = $('ambiance');
  const syncSound = () => { $('sound').classList.toggle('off', amb.paused); $('ambToggle').textContent = amb.paused ? 'Lecture' : 'Pause'; };
  const toggleAmb = () => { if (amb.paused) amb.play().catch(() => {}); else amb.pause(); };
  $('sound').addEventListener('click', toggleAmb);
  $('ambToggle').addEventListener('click', toggleAmb);
  $('ambVolume').addEventListener('input', () => { amb.volume = Number($('ambVolume').value) / 100; });
  amb.addEventListener('play', syncSound); amb.addEventListener('pause', syncSound);

  load();
  setInterval(load, REFRESH_MS);
  setInterval(progress, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
