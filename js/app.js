// Contenitore: schermata principale con le app + navigazione tra le pagine.
import { apps } from './apps.js';
import { esc, toast, exportAll, importAll } from './core.js';

const HUB_COLOR = '#4f46e5';
const main = document.getElementById('main');
const titleEl = document.getElementById('title');
const backEl = document.getElementById('back');
const themeMeta = document.querySelector('meta[name="theme-color"]');
let lastHash = null;

const ctx = {
  go: (hash) => (location.hash === hash ? route() : (location.hash = hash)),
  refresh: () => route(),
  toast,
};

function setAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  themeMeta.setAttribute('content', color);
}

function setHeader(title, back) {
  titleEl.textContent = title;
  backEl.hidden = !back;
  if (back) backEl.href = back;
}

const isNative = () => !!window.Capacitor?.isNativePlatform?.();

function route() {
  // Cambiando pagina (anche col tasto "indietro" di Android) chiudi i pannelli aperti.
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  const hash = location.hash || '#/';
  const [id, ...rest] = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  const app = apps.find((a) => a.id === id);
  const scroll = hash === lastHash ? window.scrollY : 0;

  const view = document.createElement('div');
  view.className = 'view';
  main.replaceChildren(view);

  if (app) {
    setAccent(app.color);
    const res = app.render(view, rest, ctx) || {};
    const title = res.title || app.name;
    setHeader(title, res.back ?? (rest.length ? `#/${app.id}` : '#/'));
    document.title = `${title} · Hub`;
  } else {
    setAccent(HUB_COLOR);
    renderHub(view);
    setHeader('Hub', null);
    document.title = 'Hub';
  }
  window.scrollTo(0, scroll);
  lastHash = hash;
}

function saluto() {
  const h = new Date().getHours();
  return h < 12 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
}

function renderHub(root) {
  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  root.innerHTML = `
    <p class="hello">${saluto()} <span class="muted">· ${esc(oggi)}</span></p>
    <div class="grid">
      ${apps.map((a) => `
        <a class="tile" href="#/${a.id}" style="--tile:${a.color}">
          <span class="tile-icon" aria-hidden="true">${a.icon}</span>
          <span class="tile-name">${esc(a.name)}</span>
          <span class="tile-sub">${esc(a.summary?.() ?? a.description)}</span>
        </a>`).join('')}
    </div>
    <section class="card backup">
      <h2>Backup dati</h2>
      <p class="muted small">I dati restano solo su questo dispositivo. Esporta un backup ogni tanto per non perderli o per spostarli su un altro telefono.</p>
      <div class="row">
        <button class="btn" data-act="export">Esporta backup</button>
        <label class="btn ghost">Importa backup<input type="file" accept="application/json,.json" hidden data-act="import"></label>
      </div>
    </section>`;

  root.querySelector('[data-act=export]').onclick = async () => {
    const json = JSON.stringify(exportAll(), null, 2);
    const name = `hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    if (isNative()) {
      // Nell'app Android: salva il file e apri "Condividi" (Drive, WhatsApp, email, File…).
      try {
        const { Filesystem, Share } = window.Capacitor.Plugins;
        const { uri } = await Filesystem.writeFile({ path: name, data: json, directory: 'CACHE', encoding: 'utf8' });
        await Share.share({ title: 'Backup Hub', files: [uri] });
      } catch (e) {
        if (!/cancel/i.test(e?.message || '')) toast('Esportazione non riuscita');
      }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  root.querySelector('[data-act=import]').onchange = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      if (!confirm('Importare il backup? I dati attuali verranno sostituiti da quelli del file.')) return;
      importAll(obj);
      toast('Backup importato');
      route();
    } catch (e) {
      toast(e.message || 'File non valido');
    }
  };
}

window.addEventListener('hashchange', route);
route();

// Il service worker serve solo alla versione web: nell'app Android i file sono già sul telefono.
if ('serviceWorker' in navigator && !isNative()) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline non disponibile */ });
}
