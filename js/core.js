// Funzioni condivise da tutte le app dell'Hub: salvataggio dati, dialog, utilità.

const PREFIX = 'hub:';

export function load(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    toast('Impossibile salvare i dati su questo dispositivo');
    return false;
  }
}

export function remove(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignorato */ }
}

export function exportAll() {
  const dati = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) dati[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
  }
  return { app: 'hub', versione: 1, esportato: new Date().toISOString(), dati };
}

export function importAll(obj) {
  if (!obj || obj.app !== 'hub' || typeof obj.dati !== 'object') throw new Error('File di backup non valido');
  Object.entries(obj.dati).forEach(([k, v]) => save(k, v));
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const fmtDate = (iso) => new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

export const empty = (title, sub = '') => `<div class="empty"><b>${esc(title)}</b>${sub ? `<p class="muted">${esc(sub)}</p>` : ''}</div>`;

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function fieldHtml(f) {
  const id = 'f_' + f.name;
  const req = f.required ? 'required' : '';
  let input;
  if (f.type === 'select') {
    input = `<select id="${id}" name="${f.name}">${f.options.map((o) =>
      `<option value="${esc(o.value)}" ${String(o.value) === String(f.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="${id}" name="${f.name}" rows="2" placeholder="${esc(f.placeholder ?? '')}">${esc(f.value ?? '')}</textarea>`;
  } else {
    const num = f.type === 'number' ? 'inputmode="decimal" step="any" min="0"' : '';
    input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" ${num} value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder ?? '')}" ${req} autocomplete="off">`;
  }
  return `<label class="field ${f.half ? 'half' : ''}" for="${id}"><span>${esc(f.label)}</span>${input}</label>`;
}

/**
 * Apre un pannello con un modulo. Restituisce:
 *  - un oggetto {campo: valore} se l'utente salva
 *  - la stringa 'delete' se preme il pulsante rosso (solo se `danger` è indicato)
 *  - null se annulla
 */
export function formDialog({ title, fields, submit = 'Salva', danger = null }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'sheet';
    // Solo "Salva" è di tipo submit: così il tasto Invio salva e non può mai eliminare.
    d.innerHTML = `
      <form>
        <h3>${esc(title)}</h3>
        <div class="fields">${fields.map(fieldHtml).join('')}</div>
        <div class="row">
          ${danger ? `<button type="button" class="btn danger ghost" data-res="delete">${esc(danger)}</button>` : ''}
          <button type="button" class="btn ghost grow" data-res="cancel">Annulla</button>
          <button type="submit" class="btn primary grow">${esc(submit)}</button>
        </div>
      </form>`;
    document.body.append(d);

    let done = false;
    const finish = (out) => {
      if (done) return;
      done = true;
      if (d.open) d.close();
      d.remove();
      resolve(out);
    };
    const form = d.querySelector('form');
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const values = {};
      fields.forEach((f) => {
        const raw = String(fd.get(f.name) ?? '').trim();
        values[f.name] = f.type === 'number' ? (raw === '' ? null : Number(raw.replace(',', '.'))) : raw;
      });
      finish(values);
    });
    form.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-res]');
      if (b) finish(b.dataset.res === 'delete' ? 'delete' : null);
    });
    d.addEventListener('close', () => finish(null)); // tasto Esc / "indietro"
    d.showModal();
  });
}
