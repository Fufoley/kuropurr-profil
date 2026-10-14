// Page du profil : lit status.json dans le dépôt GitHub et l'affiche.
// Tout est calculé à partir d'heures absolues : la barre de musique avance toute
// seule, et le profil passe « hors ligne » si le statut n'est plus rafraîchi.
// En plus (facultatif, lu directement par la page) : statut et badges Discord via
// Lanyard, animes via AniList, compteur de vues via hits.sh.
(function () {
  'use strict';
  const CONFIG = window.KP_PROFIL || {};
  const REFRESH_MS = 12000;
  const OFFLINE_AFTER_MS = 3 * 60 * 1000;   // au-delà, KuroPurr est considéré fermé (PC éteint…)
  const LANYARD_MS = 30000;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '');
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); }
    n.append(...kids.flat().filter((k) => k != null && k !== false));
    return n;
  };
  const fine = matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;

  let status = null;      // dernier status.json valide
  let lanyard = null;     // réponse Lanyard (Discord), si discordId
  let entered = false;
  let tab = 'profil';

  const DEFAULTS = { enLigne: false, majLe: null, pseudo: '', avatar: '', bio: '', humeur: '', jeu: { actif: false }, musique: { actif: false }, liens: {}, badges: [], discordId: '', fond: '', musiqueFond: '', curseur: '', accent: '', entree: '', projets: [], anilist: '', activites: [], steam: null, compteur: false };
  const normalize = (raw) => {
    const s = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
    s.jeu = s.jeu && typeof s.jeu === 'object' ? s.jeu : { actif: false };
    s.musique = s.musique && typeof s.musique === 'object' ? s.musique : { actif: false };
    s.liens = s.liens && typeof s.liens === 'object' ? s.liens : {};
    for (const k of ['badges', 'projets', 'activites']) if (!Array.isArray(s[k])) s[k] = [];
    if (!s.steam || typeof s.steam !== 'object' || !Array.isArray(s.steam.jeux)) s.steam = null;
    return s;
  };

  function sources() {
    const list = [];
    if (CONFIG.repo) list.push(`https://raw.githubusercontent.com/${CONFIG.repo}/${CONFIG.branche || 'status'}/status.json`);
    list.push('status.json'); // secours : à côté de la page
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
    render(); // on garde le dernier statut connu ; l'âge fera le reste
  }

  /* ---------------- Outils ---------------- */
  const fmtTime = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const since = (iso) => {
    const min = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
    if (min < 1) return 'moins d’une minute';
    if (min < 60) return `${min} min`;
    if (min < 60 * 48) return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
    return `${Math.floor(min / 1440)} j`;
  };
  const ago = (iso) => { const t = Date.parse(iso); if (!t) return ''; const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.floor(m / 60)} h` : m < 1440 * 30 ? `il y a ${Math.floor(m / 1440)} j` : new Date(t).toLocaleDateString('fr-FR'); };
  const clock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();
  const isVideo = (u) => /\.(mp4|webm)(\?|$)/i.test(u);
  const svg = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = d; return s; };
  const ICONS = {
    jeu: '<path d="M7.5 8h9a4.5 4.5 0 0 1 4.4 5.5l-.8 3.5a2.2 2.2 0 0 1-3.8 1l-2-2.2h-4.6l-2 2.2a2.2 2.2 0 0 1-3.8-1l-.8-3.5A4.5 4.5 0 0 1 7.5 8z"/>',
    musique: '<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  };
  // Réseaux : une couleur et une lettre (pas de logo de marque), reconnus par le nom du lien.
  const SOCIAL = {
    discord: ['#5865f2', 'D'], twitch: ['#9146ff', 'T'], youtube: ['#ff2d2d', 'Y'], github: ['#8b949e', 'G'], x: ['#cfd3d8', 'X'], twitter: ['#1d9bf0', 'X'],
    instagram: ['#e1306c', 'I'], tiktok: ['#69c9d0', 'T'], steam: ['#66c0f4', 'S'], spotify: ['#1db954', 'S'], roblox: ['#e2231a', 'R'], reddit: ['#ff4500', 'R'],
    kick: ['#53fc18', 'K'], anilist: ['#3db4f2', 'A'], myanimelist: ['#2e51a2', 'M'], bluesky: ['#0085ff', 'B'], mastodon: ['#6364ff', 'M'], linkedin: ['#0a66c2', 'L'], patreon: ['#ff424d', 'P'], kofi: ['#ff5e5b', 'K'],
  };

  /* ---------------- Rendu ---------------- */
  function applyLook(s) {
    document.documentElement.style.setProperty('--accent', s.accent || '#a9c59b');
    // Fond
    const bg = $('bg');
    if (bg.dataset.src !== s.fond) {
      bg.dataset.src = s.fond;
      bg.replaceChildren();
      if (s.fond) {
        if (isVideo(s.fond)) {
          const v = el('video', { autoplay: '', muted: '', loop: '', playsinline: '' }); v.muted = true; v.src = s.fond; bg.append(v);
        } else {
          bg.append(el('img', { src: s.fond, alt: '' }));
        }
      }
    }
    // Curseur
    document.body.style.cursor = s.curseur === 'paw' ? 'url(cursor.svg) 3 2, auto' : s.curseur ? `url(${s.curseur}) 4 4, auto` : '';
    // Musique d'ambiance
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
    return { kp, dc, online: kp || !!dc };
  }

  /** Jeu et musique effectifs : KuroPurr d'abord, sinon ce que Discord (Lanyard) voit. */
  function activity(s, pr) {
    let game = pr.kp && s.jeu.actif ? { nom: s.jeu.nom, plateforme: s.jeu.plateforme, depuis: s.jeu.depuis } : null;
    let music = pr.kp && s.musique.actif && s.musique.debut && s.musique.fin ? { titre: s.musique.titre, artiste: s.musique.artiste, debut: Date.parse(s.musique.debut), fin: Date.parse(s.musique.fin) } : null;
    if (!game && lanyard && Array.isArray(lanyard.activities)) {
      const a = lanyard.activities.find((x) => x.type === 0 && x.name);
      if (a) game = { nom: a.name, plateforme: 'Discord', depuis: a.timestamps && a.timestamps.start ? new Date(a.timestamps.start).toISOString() : null };
    }
    if (!music && lanyard && lanyard.listening_to_spotify && lanyard.spotify && lanyard.spotify.timestamps) {
      music = { titre: lanyard.spotify.song, artiste: lanyard.spotify.artist, debut: lanyard.spotify.timestamps.start, fin: lanyard.spotify.timestamps.end };
    }
    return { game, music };
  }

  function render() {
    const s = status;
    applyLook(s);
    document.title = s.pseudo ? `${s.pseudo} · profil` : 'Profil';
    $('enterName').textContent = s.pseudo || 'Profil';
    $('enterText').textContent = s.entree || 'clique pour entrer';
    typewrite(s.pseudo || 'Quelqu’un');

    // Avatar : réglage, sinon celui de Discord, sinon le logo
    const dcAvatar = lanyard && lanyard.discord_user && lanyard.discord_user.avatar ? `https://cdn.discordapp.com/avatars/${lanyard.discord_user.id}/${lanyard.discord_user.avatar}.png?size=256` : '';
    const avatar = s.avatar || dcAvatar;
    const img = $('avatarImg');
    if (avatar && img.dataset.src !== avatar) { img.dataset.src = avatar; img.src = avatar; $('avatar').classList.remove('empty'); }
    if (!avatar) { img.src = 'logo.png'; $('avatar').classList.add('empty'); }
    img.onerror = () => { img.src = 'logo.png'; $('avatar').classList.add('empty'); };

    // Badges : les tiens, puis ceux de Discord
    const badges = s.badges.map((b) => el('span', { class: 'badge' }, esc(b)));
    for (const b of discordBadges()) badges.push(el('span', { class: 'badge discord', title: 'Badge Discord' }, b));
    $('badges').replaceChildren(...badges);

    $('mood').hidden = !s.humeur; $('mood').textContent = s.humeur || '';
    $('bio').hidden = !s.bio; $('bio').textContent = s.bio || '';

    const pr = presence(s);
    $('dot').className = `dot ${pr.online ? 'on' : ''}`;
    $('ring').className = `ring ${pr.dc || (pr.kp ? 'online' : '')}`;
    $('presenceText').textContent = pr.kp ? 'En ligne' : pr.dc ? ({ online: 'En ligne sur Discord', idle: 'Absent (Discord)', dnd: 'Ne pas déranger (Discord)' })[pr.dc]
      : s.majLe ? `Hors ligne · vu ${isToday(s.majLe) ? 'à ' + clock.format(Date.parse(s.majLe)) : 'il y a ' + since(s.majLe)}` : 'Hors ligne';
    $('card').classList.toggle('offline', !pr.online);

    const { game, music } = activity(s, pr);
    $('gameRow').hidden = !game;
    if (game) { $('gameName').textContent = esc(game.nom); $('gamePlatform').textContent = esc(game.plateforme); $('gameSince').textContent = game.depuis ? since(game.depuis) : 'un moment'; }
    $('musicRow').hidden = !music;
    if (music) { $('musicTitle').textContent = esc(music.titre); $('musicArtist').textContent = esc(music.artiste); }
    $('nothing').hidden = !!(game || music);
    // Onglet Musique
    $('np').hidden = !music; $('npNothing').hidden = !!music;
    if (music) { $('npTitle').textContent = esc(music.titre); $('npArtist').textContent = esc(music.artiste); }
    current = music;
    progress();

    // Dernières activités
    const hist = s.activites.slice(0, 8);
    $('historyTitle').hidden = !hist.length;
    $('history').replaceChildren(...hist.map((a) => el('li', {},
      el('span', { class: 'k' }, svg(ICONS[a.type] || ICONS.jeu)),
      el('span', { class: 't' }, esc(a.nom), a.detail ? el('span', {}, ` · ${esc(a.detail)}`) : null),
      el('time', { datetime: a.quand || '' }, ago(a.quand)))));
    const songs = s.activites.filter((a) => a.type === 'musique').slice(0, 10);
    $('songs').replaceChildren(...(songs.length ? songs.map((a) => el('li', {},
      el('span', { class: 'k' }, svg(ICONS.musique)),
      el('span', { class: 't' }, esc(a.nom), a.detail ? el('span', {}, ` · ${esc(a.detail)}`) : null),
      el('time', {}, ago(a.quand)))) : [el('li', { class: 'muted' }, 'Rien pour l’instant.')]));

    // Réseaux
    const links = $('links');
    links.replaceChildren();
    for (const [name, url] of Object.entries(s.liens)) {
      if (typeof url !== 'string' || !/^https:\/\//.test(url)) continue;
      const key = name.toLowerCase().replace(/[^a-z]/g, '');
      const [color, letter] = SOCIAL[key] || [s.accent || '#a9c59b', null];
      const a = el('a', { class: 'social', href: url, target: '_blank', rel: 'noopener', title: name.charAt(0).toUpperCase() + name.slice(1), style: `--c:${color}` }, letter || svg(ICONS.link));
      links.append(a);
    }

    renderProjects(s);
    renderGames(s);
    $('updated').textContent = s.majLe ? `Mis à jour à ${clock.format(Date.parse(s.majLe))}` : '';
    renderTabs(s);
    loadAnime(s.anilist);
    loadLanyard(s.discordId);
    views(s.compteur);
  }

  function renderTabs(s) {
    const list = [['profil', 'Profil']];
    if (s.projets.length) list.push(['projets', 'Projets']);
    if (s.steam) list.push(['gaming', 'Gaming']);
    if (s.musiqueFond || s.musique.actif || s.activites.some((a) => a.type === 'musique')) list.push(['musique', 'Musique']);
    if (s.anilist) list.push(['anime', 'Anime']);
    if (!list.some(([id]) => id === tab)) tab = 'profil';
    $('tabs').replaceChildren(...list.map(([id, label]) => el('button', { class: `tab ${id === tab ? 'on' : ''}`, type: 'button', onclick: () => { tab = id; renderTabs(status); } }, label)));
    for (const p of document.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== tab;
  }

  function renderProjects(s) {
    $('projects').replaceChildren(...s.projets.map((p) => {
      const kids = [el('strong', {}, esc(p.nom)), p.description ? el('p', {}, esc(p.description)) : null,
        Array.isArray(p.tags) && p.tags.length ? el('div', { class: 'tags' }, p.tags.map((t) => el('span', { class: 'tag' }, esc(t)))) : null];
      return p.url ? el('a', { class: 'project', href: p.url, target: '_blank', rel: 'noopener' }, kids) : el('div', { class: 'project' }, kids);
    }));
  }

  let gamesCache = '';
  function renderGames(s) {
    if (!s.steam) return;
    const q = $('gameSearch').value.trim().toLowerCase();
    const playing = s.jeu.actif && s.jeu.plateforme === 'Steam' ? String(s.jeu.nom).toLowerCase() : '';
    const key = JSON.stringify([s.steam, q, playing]);
    if (key === gamesCache) return;
    gamesCache = key;
    $('steamStats').replaceChildren(el('span', {}, el('b', {}, String(s.steam.total || 0)), ' jeux'), el('span', {}, el('b', {}, String(s.steam.heures || 0)), ' h de jeu'));
    const list = s.steam.jeux.filter((g) => !q || String(g.nom).toLowerCase().includes(q));
    $('games').replaceChildren(...(list.length ? list.map((g) => {
      const now = playing && String(g.nom).toLowerCase() === playing;
      const img = el('img', { src: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`, alt: '', loading: 'lazy' });
      const cover = el('div', { class: 'cover' }, img, el('span', { class: 'initial' }, String(g.nom).charAt(0)));
      img.onerror = () => { cover.classList.add('none'); };
      return el('a', { class: `game ${now ? 'playing' : ''}`, href: `https://store.steampowered.com/app/${g.appid}`, target: '_blank', rel: 'noopener' },
        cover, now ? el('span', { class: 'pill' }, 'en jeu') : g.recent ? el('span', { class: 'pill' }, 'récent') : null,
        el('div', { class: 'g' }, el('strong', {}, esc(g.nom)), el('span', {}, g.heures >= 1 ? `${g.heures} h` : g.heures > 0 ? `${Math.round(g.heures * 60)} min` : 'jamais lancé', g.dernier ? ` · ${ago(g.dernier)}` : '')));
    }) : [el('p', { class: 'muted quiet' }, 'Aucun jeu ne correspond.')]));
  }
  $('gameSearch').addEventListener('input', () => status && renderGames(status));

  /** La barre de musique avance localement ; chaque lecture de status.json la resynchronise. */
  let current = null;
  function progress() {
    if (!current) return;
    const total = Math.max(1, current.fin - current.debut);
    const pos = Math.min(total, Math.max(0, Date.now() - current.debut));
    const w = `${(pos / total) * 100}%`;
    $('musicFill').style.width = w; $('npFill').style.width = w;
    $('musicPos').textContent = fmtTime(pos);
    $('musicLen').textContent = fmtTime(total);
  }

  /* ---------------- Pseudo animé ---------------- */
  let typed = '';
  let typing = null;
  function typewrite(text) {
    if (typed === text || !entered) return;
    typed = text;
    clearInterval(typing);
    const out = $('pseudo');
    out.textContent = '';
    let i = 0;
    typing = setInterval(() => { out.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typing); }, 70);
  }

  /* ---------------- Carte qui s'incline ---------------- */
  const card = $('card');
  if (fine) {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  }

  /* ---------------- Discord (Lanyard) ---------------- */
  // Lanyard donne le statut, les badges et l'activité Discord d'un compte qui a rejoint discord.gg/lanyard.
  let lanyardAt = 0;
  async function loadLanyard(id) {
    if (!/^\d{15,22}$/.test(id) || Date.now() - lanyardAt < LANYARD_MS) return;
    lanyardAt = Date.now();
    try {
      const r = await fetch(`https://api.lanyard.rest/v1/users/${id}`);
      const j = await r.json();
      if (j && j.success && j.data) { lanyard = j.data; render(); }
    } catch { /* pas grave : la page marche sans */ }
  }
  const FLAGS = [[1, 'Staff Discord'], [2, 'Partenaire'], [4, 'HypeSquad Events'], [8, 'Bug Hunter'], [64, 'HypeSquad Bravery'], [128, 'HypeSquad Brilliance'], [256, 'HypeSquad Balance'], [512, 'Early Supporter'], [16384, 'Bug Hunter Gold'], [131072, 'Dév. de bot vérifié'], [262144, 'Modérateur certifié'], [4194304, 'Développeur actif']];
  function discordBadges() {
    const flags = lanyard && lanyard.discord_user ? Number(lanyard.discord_user.public_flags || 0) : 0;
    const out = FLAGS.filter(([bit]) => flags & bit).map(([, name]) => name);
    if (lanyard && lanyard.discord_user && lanyard.discord_user.premium_type) out.push('Nitro');
    return out;
  }

  /* ---------------- AniList ---------------- */
  let animeFor = null;
  async function loadAnime(user) {
    if (!user || animeFor === user) return;
    animeFor = user;
    const body = $('animeBody');
    const query = `query($u:String){ User(name:$u){ name siteUrl statistics{ anime{ count minutesWatched episodesWatched meanScore } } }
      MediaListCollection(userName:$u, type:ANIME, status_in:[CURRENT,COMPLETED,PLANNING], sort:[UPDATED_TIME_DESC]){ lists{ status entries{ progress score updatedAt media{ id title{ romaji english } episodes coverImage{ large } siteUrl } } } } }`;
    try {
      const r = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables: { u: user } }) });
      const j = await r.json();
      if (!j.data || !j.data.User) throw new Error('inconnu');
      const st = j.data.User.statistics.anime;
      $('animeStats').replaceChildren(el('span', {}, el('b', {}, String(st.count)), ' animes'), el('span', {}, el('b', {}, String(st.episodesWatched)), ' épisodes'), el('span', {}, el('b', {}, String(Math.round(st.minutesWatched / 60 / 24))), ' jours de visionnage'),
        el('a', { href: j.data.User.siteUrl, target: '_blank', rel: 'noopener' }, 'AniList ↗'));
      const lists = (j.data.MediaListCollection && j.data.MediaListCollection.lists) || [];
      const entries = (status) => lists.filter((l) => l.status === status).flatMap((l) => l.entries).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const cardOf = (e, withBar) => {
        const t = e.media.title.english || e.media.title.romaji;
        const pct = e.media.episodes ? Math.min(100, (e.progress / e.media.episodes) * 100) : 0;
        return el('a', { class: 'anime', href: e.media.siteUrl, target: '_blank', rel: 'noopener', title: t },
          el('img', { src: e.media.coverImage.large, alt: '', loading: 'lazy' }),
          el('div', { class: 'g' }, el('strong', {}, t), el('span', {}, withBar ? `${e.progress} / ${e.media.episodes || '?'}` : e.score ? `note ${e.score}` : 'terminé'),
            withBar ? el('div', { class: 'bar' }, el('div', { class: 'fill', style: `width:${pct}%` })) : null));
      };
      const cur = entries('CURRENT'), done = entries('COMPLETED').slice(0, 12), plan = entries('PLANNING').slice(0, 6);
      body.replaceChildren(
        cur.length ? el('h3', {}, 'En cours') : null, cur.length ? el('div', { class: 'anime-grid' }, cur.map((e) => cardOf(e, true))) : null,
        done.length ? el('h3', {}, 'Terminés récemment') : null, done.length ? el('div', { class: 'anime-grid' }, done.map((e) => cardOf(e, false))) : null,
        plan.length ? el('h3', {}, 'À voir') : null, plan.length ? el('div', { class: 'anime-grid' }, plan.map((e) => cardOf(e, false))) : null,
        !cur.length && !done.length && !plan.length ? el('p', { class: 'muted quiet' }, 'Liste vide ou privée.') : null);
    } catch {
      body.replaceChildren(el('p', { class: 'muted quiet' }, 'Impossible de lire la liste AniList (pseudo inconnu ou liste privée).'));
    }
  }

  /* ---------------- Compteur de vues (hits.sh, sans compte) ---------------- */
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
    if (status) { typewrite(status.pseudo || 'Quelqu’un'); }
  }
  $('enter').addEventListener('click', enter);
  $('enter').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') enter(); });
  const amb = $('ambiance');
  const syncSound = () => { $('sound').classList.toggle('off', amb.paused || amb.muted); $('ambToggle').textContent = amb.paused ? 'Lecture' : 'Pause'; };
  $('sound').addEventListener('click', () => { if (amb.paused) amb.play().catch(() => {}); else amb.pause(); });
  $('ambToggle').addEventListener('click', () => { if (amb.paused) amb.play().catch(() => {}); else amb.pause(); });
  $('ambVolume').addEventListener('input', () => { amb.volume = Number($('ambVolume').value) / 100; });
  amb.addEventListener('play', syncSound); amb.addEventListener('pause', syncSound);

  load();
  setInterval(load, REFRESH_MS);
  setInterval(() => { progress(); if (status && !$('gameRow').hidden && status.jeu.depuis) $('gameSince').textContent = since(status.jeu.depuis); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
