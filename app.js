// Page du profil : lit status.json dans le dépôt GitHub et l'affiche.
// Tout est calculé à partir d'heures absolues : la barre de musique avance toute
// seule, et le profil passe « hors ligne » si le statut n'est plus rafraîchi.
(function () {
  'use strict';
  const CONFIG = window.KP_PROFIL || {};
  const REFRESH_MS = 12000;
  const OFFLINE_AFTER_MS = 3 * 60 * 1000;   // au-delà, KuroPurr est considéré fermé (PC éteint…)
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '');

  let status = null;      // dernier status.json valide
  let lastOk = 0;         // date de la dernière lecture réussie

  const DEFAULTS = { enLigne: false, majLe: null, pseudo: '', avatar: '', bio: '', humeur: '', jeu: { actif: false }, musique: { actif: false }, liens: {} };
  const normalize = (raw) => {
    const s = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
    s.jeu = s.jeu && typeof s.jeu === 'object' ? s.jeu : { actif: false };
    s.musique = s.musique && typeof s.musique === 'object' ? s.musique : { actif: false };
    s.liens = s.liens && typeof s.liens === 'object' ? s.liens : {};
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
        lastOk = Date.now();
        render();
        return;
      } catch { /* source suivante */ }
    }
    if (!status) { status = normalize(null); render(); }
    else render(); // on garde le dernier statut connu ; l'âge fera le reste
  }

  const fmtTime = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const since = (iso) => {
    const min = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
    if (min < 1) return 'moins d’une minute';
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
  };
  const clock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

  function render() {
    const s = status;
    const age = s.majLe ? Date.now() - Date.parse(s.majLe) : Infinity;
    const online = !!s.enLigne && age < OFFLINE_AFTER_MS;
    document.title = s.pseudo ? `${s.pseudo} · profil` : 'Profil';

    $('pseudo').textContent = s.pseudo || 'Quelqu’un';
    const img = $('avatarImg');
    if (s.avatar && img.dataset.src !== s.avatar) { img.dataset.src = s.avatar; img.src = s.avatar; $('avatar').classList.remove('empty'); }
    if (!s.avatar) { img.src = 'logo.png'; $('avatar').classList.add('empty'); }
    img.onerror = () => { img.src = 'logo.png'; $('avatar').classList.add('empty'); };

    $('mood').hidden = !s.humeur; $('mood').textContent = s.humeur || '';
    $('bio').hidden = !s.bio; $('bio').textContent = s.bio || '';

    $('dot').className = `dot ${online ? 'on' : ''}`;
    $('presenceText').textContent = online ? 'En ligne' : s.majLe ? `Hors ligne · vu ${isToday(s.majLe) ? 'à ' + clock.format(Date.parse(s.majLe)) : 'il y a ' + since(s.majLe)}` : 'Hors ligne';
    $('card').classList.toggle('offline', !online);

    const game = online && s.jeu.actif;
    $('gameRow').hidden = !game;
    if (game) { $('gameName').textContent = esc(s.jeu.nom); $('gamePlatform').textContent = esc(s.jeu.plateforme); $('gameSince').textContent = since(s.jeu.depuis); }

    const music = online && s.musique.actif && s.musique.debut && s.musique.fin;
    $('musicRow').hidden = !music;
    if (music) { $('musicTitle').textContent = esc(s.musique.titre); $('musicArtist').textContent = esc(s.musique.artiste); progress(); }
    $('nothing').hidden = game || music;

    const links = $('links');
    links.replaceChildren();
    for (const [name, url] of Object.entries(s.liens)) {
      if (typeof url !== 'string' || !/^https:\/\//.test(url)) continue;
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = name.charAt(0).toUpperCase() + name.slice(1);
      links.append(a);
    }
    $('updated').textContent = s.majLe ? `Mis à jour à ${clock.format(Date.parse(s.majLe))}` : '';
  }

  const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

  /** La barre de musique avance localement ; chaque lecture de status.json la resynchronise. */
  function progress() {
    const m = status && status.musique;
    if (!m || !m.actif || $('musicRow').hidden) return;
    const start = Date.parse(m.debut), end = Date.parse(m.fin);
    const total = Math.max(1, end - start);
    const pos = Math.min(total, Math.max(0, Date.now() - start));
    $('musicFill').style.width = `${(pos / total) * 100}%`;
    $('musicPos').textContent = fmtTime(pos);
    $('musicLen').textContent = fmtTime(total);
    if (pos >= total) $('musicFill').style.width = '100%';
  }

  load();
  setInterval(load, REFRESH_MS);
  setInterval(() => { progress(); if (status) { const g = $('gameRow'); if (!g.hidden) $('gameSince').textContent = since(status.jeu.depuis); } }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
