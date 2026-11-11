// App Cibo: piano alimentare settimanale (giorni × pasti).
import { load, save, uid, esc, formDialog, toast } from '../js/core.js';

const K_PIANO = 'cibo.piano';
const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const PASTI = [
  { k: 'colazione', n: 'Colazione', i: '☕' },
  { k: 'spuntino', n: 'Spuntino', i: '🍎' },
  { k: 'pranzo', n: 'Pranzo', i: '🍝' },
  { k: 'merenda', n: 'Merenda', i: '🥛' },
  { k: 'cena', n: 'Cena', i: '🍽️' },
];

const oggi = () => (new Date().getDay() + 6) % 7; // 0 = lunedì
const kcal = (items) => items.reduce((a, x) => a + (Number(x.kcal) || 0), 0);
const nomePasto = (k) => PASTI.find((m) => m.k === k)?.n ?? k;

function getPiano() {
  const p = load(K_PIANO, {});
  for (let d = 0; d < 7; d++) {
    p[d] ??= {};
    PASTI.forEach((m) => { p[d][m.k] ??= []; });
  }
  return p;
}

const campiVoce = (v = {}) => [
  { name: 'nome', label: 'Alimento', value: v.nome, required: true, placeholder: 'es. Riso basmati' },
  { name: 'quantita', label: 'Quantità', value: v.quantita, half: true, placeholder: 'es. 80 g' },
  { name: 'kcal', label: 'Kcal (facoltativo)', type: 'number', value: v.kcal, half: true },
  { name: 'note', label: 'Note', type: 'textarea', value: v.note, placeholder: 'Alternative, preparazione…' },
];

export default {
  id: 'cibo',
  name: 'Cibo',
  icon: '🥗',
  color: '#059669',
  color2: '#0d9488',
  description: 'Piano alimentare settimanale',
  summary() {
    const day = getPiano()[oggi()];
    const n = PASTI.filter((m) => day[m.k].length).length;
    return n ? `Oggi: ${n} ${n === 1 ? 'pasto' : 'pasti'} in programma` : 'Piano alimentare settimanale';
  },
  render(root, [view, arg], ctx) {
    if (view === 'settimana') return viewSettimana(root);
    const d = view === 'giorno' && /^[0-6]$/.test(arg) ? Number(arg) : oggi();
    return viewGiorno(root, d, ctx);
  },
};

function viewGiorno(root, d, ctx) {
  const piano = getPiano();
  const day = piano[d];
  const tot = PASTI.reduce((a, m) => a + kcal(day[m.k]), 0);

  root.innerHTML = `
    <nav class="tabs" aria-label="Giorni della settimana">
      ${GIORNI.map((g, i) => `<a href="#/cibo/giorno/${i}" class="tab ${i === d ? 'active' : ''}" ${i === d ? 'aria-current="page"' : ''}>${g.slice(0, 3)}${i === oggi() ? '<i class="dot"></i>' : ''}</a>`).join('')}
    </nav>
    <div class="section-head" style="margin-top:16px!important">
      <h2>${GIORNI[d]} ${d === oggi() ? '<span class="chip accent">oggi</span>' : ''}</h2>
      ${tot ? `<span class="chip">${tot} kcal</span>` : ''}
    </div>
    ${PASTI.map((m) => {
      const items = day[m.k];
      const k = kcal(items);
      return `
      <section class="card meal">
        <div class="meal-head">
          <span class="meal-icon" aria-hidden="true">${m.i}</span>
          <div class="card-title grow">${m.n}</div>
          ${k ? `<span class="muted small">${k} kcal</span>` : ''}
          <button class="icon-btn accent" data-act="add" data-m="${m.k}" aria-label="Aggiungi a ${m.n}">+</button>
        </div>
        ${items.length ? `<ul class="items">${items.map((x) => `
          <li><button class="item" data-act="edit" data-m="${m.k}" data-id="${x.id}">
            <span class="grow">${esc(x.nome)}${x.note ? `<small class="muted block">${esc(x.note)}</small>` : ''}</span>
            ${x.quantita ? `<span class="muted">${esc(x.quantita)}</span>` : ''}
            ${x.kcal ? `<span class="muted small">${x.kcal} kcal</span>` : ''}
          </button></li>`).join('')}</ul>`
        : '<p class="muted small">Niente in programma</p>'}
      </section>`;
    }).join('')}
    <div class="row end" style="margin-top:20px">
      <a class="btn ghost small" href="#/cibo/settimana">Vista settimana</a>
      <button class="btn ghost small" data-act="copy">Copia giorno su…</button>
      <button class="btn ghost small danger" data-act="clear">Svuota giorno</button>
    </div>`;

  root.onclick = async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const persist = () => { save(K_PIANO, piano); ctx.refresh(); };
    const list = b.dataset.m ? day[b.dataset.m] : null;
    switch (b.dataset.act) {
      case 'add': {
        const r = await formDialog({ title: `${nomePasto(b.dataset.m)} · ${GIORNI[d]}`, fields: campiVoce(), submit: 'Aggiungi' });
        if (r) { list.push({ id: uid(), ...r }); persist(); }
        break;
      }
      case 'edit': {
        const i = list.findIndex((x) => x.id === b.dataset.id);
        const r = await formDialog({ title: 'Modifica alimento', fields: campiVoce(list[i]), danger: 'Elimina' });
        if (r === 'delete') { list.splice(i, 1); persist(); }
        else if (r) { Object.assign(list[i], r); persist(); }
        break;
      }
      case 'copy': {
        const r = await formDialog({
          title: `Copia ${GIORNI[d]} su…`,
          fields: [{
            name: 'to', label: 'Il piano del giorno scelto verrà sostituito', type: 'select',
            options: [
              ...GIORNI.map((g, i) => ({ value: i, label: g })).filter((o) => o.value !== d),
              { value: 'all', label: 'Tutti gli altri giorni' },
            ],
          }],
          submit: 'Copia',
        });
        if (!r) break;
        const targets = r.to === 'all' ? [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== d) : [Number(r.to)];
        targets.forEach((t) => {
          piano[t] = JSON.parse(JSON.stringify(day));
          PASTI.forEach((m) => piano[t][m.k].forEach((x) => { x.id = uid(); }));
        });
        save(K_PIANO, piano);
        toast(r.to === 'all' ? 'Copiato su tutti i giorni' : `Copiato su ${GIORNI[targets[0]]}`);
        break;
      }
      case 'clear':
        if (confirm(`Svuotare tutto il piano di ${GIORNI[d]}?`)) {
          PASTI.forEach((m) => { day[m.k] = []; });
          persist();
        }
        break;
    }
  };
  return { title: 'Piano alimentare', back: '#/' };
}

function viewSettimana(root) {
  const piano = getPiano();
  root.innerHTML = `<div class="list">${GIORNI.map((g, d) => {
    const day = piano[d];
    const tot = PASTI.reduce((a, m) => a + kcal(day[m.k]), 0);
    const righe = PASTI.filter((m) => day[m.k].length)
      .map((m) => `<div class="week-row"><span aria-label="${m.n}">${m.i}</span><span class="muted">${esc(day[m.k].map((x) => x.nome).join(', '))}</span></div>`)
      .join('');
    return `<a class="card link" href="#/cibo/giorno/${d}">
      <div class="meal-head">
        <div class="card-title grow">${g} ${d === oggi() ? '<span class="chip accent">oggi</span>' : ''}</div>
        ${tot ? `<span class="muted small">${tot} kcal</span>` : ''}
      </div>
      ${righe || '<p class="muted small" style="margin-top:4px">Niente in programma</p>'}
    </a>`;
  }).join('')}</div>`;
  return { title: 'Settimana', back: '#/cibo' };
}
