// App Palestra: schede di allenamento, registrazione allenamenti, storico e progressi.
import { load, save, remove, uid, esc, formDialog, toast, fmtDate, fmtTime, empty } from '../js/core.js';

const K_SCHEDE = 'palestra.schede';
const K_STORICO = 'palestra.storico';
const K_BOZZA = 'palestra.bozza'; // allenamento in corso, salvato a ogni modifica

const getSchede = () => load(K_SCHEDE, []);
const setSchede = (v) => save(K_SCHEDE, v);
const getStorico = () => load(K_STORICO, []);
const setStorico = (v) => save(K_STORICO, v.sort((a, b) => b.data.localeCompare(a.data)));
const getBozza = () => load(K_BOZZA, null);
const setBozza = (v) => (v ? save(K_BOZZA, v) : remove(K_BOZZA));
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const fmtKg = (n) => (n == null ? '' : String(n).replace('.', ','));

const campiEsercizio = (e = {}) => [
  { name: 'nome', label: 'Esercizio', value: e.nome, required: true, placeholder: 'es. Panca piana' },
  { name: 'serie', label: 'Serie', type: 'number', value: e.serie ?? 3, half: true, required: true },
  { name: 'ripetizioni', label: 'Ripetizioni', value: e.ripetizioni ?? '10', half: true, placeholder: 'es. 8-10' },
  { name: 'carico', label: 'Carico (kg)', type: 'number', value: e.carico, half: true },
  { name: 'recupero', label: 'Recupero', value: e.recupero, half: true, placeholder: 'es. 90"' },
  { name: 'note', label: 'Note', type: 'textarea', value: e.note, placeholder: 'Tecnica, varianti…' },
];

export default {
  id: 'palestra',
  name: 'Palestra',
  icon: '🏋️',
  color: '#ea580c',
  color2: '#e11d48',
  description: 'Schede e allenamenti',
  summary() {
    if (getBozza()) return 'Allenamento in corso';
    const n = getSchede().length;
    const last = getStorico()[0];
    return n ? `${n} ${n === 1 ? 'scheda' : 'schede'}${last ? ' · ultimo ' + fmtDate(last.data) : ''}` : 'Schede e allenamenti';
  },
  render(root, [view, id], ctx) {
    switch (view) {
      case 'scheda': return viewScheda(root, id, ctx);
      case 'allena': return viewAllena(root, id, ctx);
      case 'storico': return viewStorico(root);
      case 'sessione': return viewSessione(root, id, ctx);
      case 'esercizio': return viewEsercizio(root, id);
      default: return viewLista(root, ctx);
    }
  },
};

function sessionCards(list) {
  return `<div class="list">${list.map((s) => `
    <a class="card link" href="#/palestra/sessione/${s.id}">
      <div class="card-title">${esc(s.schedaNome)}</div>
      <div class="muted small">${fmtDate(s.data)} · ${s.esercizi.length} esercizi${s.durataMin ? ` · ${s.durataMin} min` : ''}</div>
    </a>`).join('')}</div>`;
}

function bannerBozza() {
  const b = getBozza();
  return b ? `<a class="banner" href="#/palestra/allena/${b.schedaId}">⏱ Allenamento in corso: <b>${esc(b.schedaNome)}</b> — tocca per riprendere</a>` : '';
}

// ---------- Elenco schede ----------
function viewLista(root, ctx) {
  const schede = getSchede();
  const storico = getStorico();
  root.innerHTML = `
    ${bannerBozza()}
    <div class="section-head" style="margin-top:0!important"><h2>Le mie schede</h2><button class="btn small primary" data-act="nuova">+ Nuova</button></div>
    ${schede.length ? `<div class="list">${schede.map((s) => {
      const last = storico.find((x) => x.schedaId === s.id);
      return `<a class="card link" href="#/palestra/scheda/${s.id}">
        <div class="card-title">${esc(s.nome)}</div>
        <div class="muted small">${s.esercizi.length} esercizi${last ? ' · ultimo allenamento ' + fmtDate(last.data) : ''}</div>
      </a>`;
    }).join('')}</div>` : empty('Nessuna scheda', 'Crea la tua prima scheda con il pulsante “+ Nuova”.')}
    <div class="section-head"><h2>Ultimi allenamenti</h2>${storico.length ? '<a class="btn small ghost" href="#/palestra/storico">Storico completo</a>' : ''}</div>
    ${storico.length ? sessionCards(storico.slice(0, 3)) : '<p class="muted">Ancora nessun allenamento registrato.</p>'}`;

  root.querySelector('[data-act=nuova]').onclick = async () => {
    const r = await formDialog({
      title: 'Nuova scheda',
      fields: [
        { name: 'nome', label: 'Nome', required: true, placeholder: 'es. Scheda A – Petto e tricipiti' },
        { name: 'note', label: 'Note', type: 'textarea', placeholder: 'Giorni, obiettivo…' },
      ],
      submit: 'Crea',
    });
    if (!r) return;
    const s = { id: uid(), nome: r.nome, note: r.note, esercizi: [], creata: new Date().toISOString() };
    setSchede([...getSchede(), s]);
    ctx.go('#/palestra/scheda/' + s.id);
  };
  return { title: 'Palestra', back: '#/' };
}

// ---------- Dettaglio / modifica scheda ----------
function viewScheda(root, id, ctx) {
  const schede = getSchede();
  const s = schede.find((x) => x.id === id);
  if (!s) { root.innerHTML = empty('Scheda non trovata'); return { title: 'Palestra' }; }
  const persist = () => { setSchede(schede); ctx.refresh(); };
  const bozza = getBozza();

  root.innerHTML = `
    ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
    <button class="btn primary block" data-act="allena" ${s.esercizi.length ? '' : 'disabled'}>
      ${bozza?.schedaId === s.id ? '⏱ Riprendi allenamento' : '▶ Inizia allenamento'}
    </button>
    <div class="section-head"><h2>Esercizi</h2><button class="btn small" data-act="add">+ Esercizio</button></div>
    ${s.esercizi.length ? `<div class="list">${s.esercizi.map((e, i) => `
      <div class="card ex">
        <div class="ex-main" role="button" tabindex="0" data-act="edit" data-i="${i}">
          <div class="card-title">${esc(e.nome)}</div>
          <div class="chips">
            <span class="chip">${e.serie} × ${esc(e.ripetizioni || '–')}</span>
            ${e.carico != null ? `<span class="chip">${fmtKg(e.carico)} kg</span>` : ''}
            ${e.recupero ? `<span class="chip">⏱ ${esc(e.recupero)}</span>` : ''}
          </div>
          ${e.note ? `<div class="muted small">${esc(e.note)}</div>` : ''}
        </div>
        <div class="ex-side">
          <button class="icon-btn" data-act="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Sposta su">↑</button>
          <a class="icon-btn" href="#/palestra/esercizio/${encodeURIComponent(e.nome)}" aria-label="Progressi">📈</a>
          <button class="icon-btn" data-act="down" data-i="${i}" ${i === s.esercizi.length - 1 ? 'disabled' : ''} aria-label="Sposta giù">↓</button>
        </div>
      </div>`).join('')}</div>
      <p class="muted small">Tocca un esercizio per modificarlo o eliminarlo.</p>`
    : empty('Scheda vuota', 'Aggiungi gli esercizi con “+ Esercizio”.')}
    <div class="row end" style="margin-top:24px">
      <button class="btn ghost small" data-act="rename">Modifica nome/note</button>
      <button class="btn ghost small" data-act="dup">Duplica</button>
      <button class="btn ghost small danger" data-act="del">Elimina</button>
    </div>`;

  root.onclick = async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const i = Number(b.dataset.i);
    switch (b.dataset.act) {
      case 'allena':
        if (prepareWorkout(s)) ctx.go('#/palestra/allena/' + s.id);
        break;
      case 'add': {
        const r = await formDialog({ title: 'Nuovo esercizio', fields: campiEsercizio(), submit: 'Aggiungi' });
        if (r) { s.esercizi.push({ id: uid(), ...r }); persist(); }
        break;
      }
      case 'edit': {
        const r = await formDialog({ title: 'Modifica esercizio', fields: campiEsercizio(s.esercizi[i]), danger: 'Elimina' });
        if (r === 'delete') {
          if (confirm(`Eliminare “${s.esercizi[i].nome}” dalla scheda?`)) { s.esercizi.splice(i, 1); persist(); }
        } else if (r) { Object.assign(s.esercizi[i], r); persist(); }
        break;
      }
      case 'up':
      case 'down': {
        const j = b.dataset.act === 'up' ? i - 1 : i + 1;
        [s.esercizi[i], s.esercizi[j]] = [s.esercizi[j], s.esercizi[i]];
        persist();
        break;
      }
      case 'rename': {
        const r = await formDialog({
          title: 'Modifica scheda',
          fields: [
            { name: 'nome', label: 'Nome', value: s.nome, required: true },
            { name: 'note', label: 'Note', type: 'textarea', value: s.note },
          ],
        });
        if (r) { Object.assign(s, r); persist(); }
        break;
      }
      case 'dup': {
        const c = JSON.parse(JSON.stringify(s));
        c.id = uid();
        c.nome = s.nome + ' (copia)';
        c.esercizi.forEach((e) => { e.id = uid(); });
        schede.push(c);
        setSchede(schede);
        toast('Scheda duplicata');
        ctx.go('#/palestra/scheda/' + c.id);
        break;
      }
      case 'del':
        if (confirm(`Eliminare la scheda “${s.nome}”? Gli allenamenti già registrati restano nello storico.`)) {
          setSchede(schede.filter((x) => x.id !== s.id));
          if (getBozza()?.schedaId === s.id) setBozza(null);
          ctx.go('#/palestra');
        }
        break;
    }
  };
  root.onkeydown = (ev) => { if (ev.key === 'Enter' && ev.target.matches('[role=button]')) ev.target.click(); };
  return { title: s.nome, back: '#/palestra' };
}

// Crea la bozza di allenamento partendo dalla scheda e dai valori dell'ultima volta.
function prepareWorkout(s) {
  const bozza = getBozza();
  if (bozza?.schedaId === s.id) return true;
  if (bozza && !confirm(`C'è già un allenamento in corso (${bozza.schedaNome}). Vuoi scartarlo e iniziarne uno nuovo?`)) return false;
  const last = getStorico().find((x) => x.schedaId === s.id);
  setBozza({
    schedaId: s.id,
    schedaNome: s.nome,
    inizio: new Date().toISOString(),
    note: '',
    aggiornaCarichi: true,
    esercizi: s.esercizi.map((e) => {
      const prev = last?.esercizi.find((p) => same(p.nome, e.nome));
      const n = Math.max(1, Math.round(Number(e.serie)) || 1);
      const reps0 = parseInt(e.ripetizioni, 10) || null;
      return {
        nome: e.nome,
        obiettivo: `${e.serie} × ${e.ripetizioni || '–'}${e.carico != null ? ` @ ${fmtKg(e.carico)} kg` : ''}`,
        recupero: e.recupero || '',
        precedente: prev ? prev.serie.map((x) => `${x.reps}×${fmtKg(x.kg)}`).join(' · ') : '',
        serie: Array.from({ length: n }, (_, k) => ({
          kg: prev?.serie[k]?.kg ?? e.carico ?? null,
          reps: prev?.serie[k]?.reps ?? reps0,
          fatto: false,
        })),
      };
    }),
  });
  return true;
}

// ---------- Allenamento in corso ----------
function viewAllena(root, id, ctx) {
  const b = getBozza();
  if (!b || b.schedaId !== id) {
    root.innerHTML = `${empty('Nessun allenamento in corso', 'Apri una scheda e premi “Inizia allenamento”.')}
      <a class="btn block" href="#/palestra/scheda/${esc(id)}">Vai alla scheda</a>`;
    return { title: 'Allenamento', back: '#/palestra' };
  }

  const stats = () => {
    const tot = b.esercizi.reduce((a, e) => a + e.serie.length, 0);
    const done = b.esercizi.reduce((a, e) => a + e.serie.filter((x) => x.fatto).length, 0);
    return { tot, done, pct: tot ? Math.round((done / tot) * 100) : 0 };
  };
  const counts = () => { const s = stats(); return `${s.done}/${s.tot}`; };

  root.innerHTML = `
    <div class="card">
      <div class="workout-head">
        <div><div class="muted small">Iniziato</div><b>${fmtTime(b.inizio)}</b></div>
        <div><div class="muted small">Durata</div><b id="elapsed">–</b></div>
        <div><div class="muted small">Serie fatte</div><b id="done">${counts()}</b></div>
      </div>
      <div class="progress" role="progressbar" aria-label="Serie completate" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats().pct}"><i id="bar"></i></div>
    </div>
    ${b.esercizi.map((e, i) => `
      <section class="card">
        <div class="card-title">${esc(e.nome)}</div>
        <div class="muted small">Obiettivo ${esc(e.obiettivo)}${e.recupero ? ' · recupero ' + esc(e.recupero) : ''}</div>
        ${e.precedente ? `<div class="muted small">Ultima volta: ${esc(e.precedente)}</div>` : ''}
        <div class="sets">
          <div class="set head"><span>#</span><span>Kg</span><span>Reps</span><span>Fatto</span></div>
          ${e.serie.map((x, k) => `
            <div class="set ${x.fatto ? 'done' : ''}">
              <span>${k + 1}</span>
              <input type="number" inputmode="decimal" step="any" min="0" data-i="${i}" data-k="${k}" data-f="kg" value="${x.kg ?? ''}" aria-label="Kg serie ${k + 1}">
              <input type="number" inputmode="numeric" min="0" data-i="${i}" data-k="${k}" data-f="reps" value="${x.reps ?? ''}" aria-label="Ripetizioni serie ${k + 1}">
              <input type="checkbox" data-i="${i}" data-k="${k}" data-f="fatto" ${x.fatto ? 'checked' : ''} aria-label="Serie ${k + 1} fatta">
            </div>`).join('')}
        </div>
        <div class="row">
          <button class="btn small ghost" data-act="addset" data-i="${i}">+ Serie</button>
          ${e.serie.length > 1 ? `<button class="btn small ghost" data-act="rmset" data-i="${i}">− Serie</button>` : ''}
        </div>
      </section>`).join('')}
    <label class="field"><span>Note sull'allenamento</span><textarea data-f="note" rows="2" placeholder="Come è andata?">${esc(b.note)}</textarea></label>
    <label class="check"><input type="checkbox" data-f="aggiorna" ${b.aggiornaCarichi ? 'checked' : ''}> Aggiorna i carichi della scheda con quelli usati oggi</label>
    <div class="row">
      <button class="btn ghost danger" data-act="discard">Annulla</button>
      <button class="btn primary grow" data-act="save">Salva allenamento</button>
    </div>`;

  const bar = root.querySelector('#bar');
  const updateBar = () => {
    const { pct } = stats();
    bar.style.width = pct + '%';
    bar.parentElement.setAttribute('aria-valuenow', pct);
  };
  requestAnimationFrame(() => requestAnimationFrame(updateBar)); // parte da 0 e si riempie

  const elapsed = root.querySelector('#elapsed');
  const tick = () => {
    if (!root.isConnected) return clearInterval(timer);
    const m = Math.floor((Date.now() - new Date(b.inizio)) / 60000);
    elapsed.textContent = m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
  };
  const timer = setInterval(tick, 15000);
  tick();

  const onEdit = (ev) => {
    const t = ev.target;
    const f = t.dataset.f;
    if (!f) return;
    if (f === 'note') b.note = t.value;
    else if (f === 'aggiorna') b.aggiornaCarichi = t.checked;
    else {
      const x = b.esercizi[t.dataset.i].serie[t.dataset.k];
      if (f === 'fatto') {
        x.fatto = t.checked;
        const row = t.closest('.set');
        row.classList.toggle('done', t.checked);
        row.classList.toggle('pop', t.checked);
        root.querySelector('#done').textContent = counts();
        updateBar();
      } else {
        x[f] = t.value === '' ? null : Number(t.value);
      }
    }
    setBozza(b);
  };
  root.addEventListener('input', onEdit);
  root.addEventListener('change', onEdit);

  root.onclick = (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const e = b.esercizi[btn.dataset.i];
    switch (btn.dataset.act) {
      case 'addset': {
        const prev = e.serie[e.serie.length - 1];
        e.serie.push({ kg: prev?.kg ?? null, reps: prev?.reps ?? null, fatto: false });
        setBozza(b); ctx.refresh();
        break;
      }
      case 'rmset':
        e.serie.pop(); setBozza(b); ctx.refresh();
        break;
      case 'discard':
        if (confirm('Annullare questo allenamento? I dati inseriti verranno persi.')) {
          setBozza(null); ctx.go('#/palestra/scheda/' + b.schedaId);
        }
        break;
      case 'save': {
        const esercizi = b.esercizi
          .map((x) => ({ nome: x.nome, serie: x.serie.filter((s) => s.fatto).map((s) => ({ kg: s.kg ?? 0, reps: s.reps ?? 0 })) }))
          .filter((x) => x.serie.length);
        if (!esercizi.length) { toast('Spunta “Fatto” su almeno una serie'); return; }
        const sess = {
          id: uid(),
          schedaId: b.schedaId,
          schedaNome: b.schedaNome,
          data: b.inizio,
          durataMin: Math.max(1, Math.round((Date.now() - new Date(b.inizio)) / 60000)),
          note: b.note.trim(),
          esercizi,
        };
        setStorico([sess, ...getStorico()]);
        if (b.aggiornaCarichi) {
          const schede = getSchede();
          const s = schede.find((x) => x.id === b.schedaId);
          if (s) {
            esercizi.forEach((x) => {
              const se = s.esercizi.find((z) => same(z.nome, x.nome));
              const max = Math.max(...x.serie.map((z) => z.kg || 0));
              if (se && max > 0) se.carico = max;
            });
            setSchede(schede);
          }
        }
        setBozza(null);
        toast('Allenamento salvato 💪');
        ctx.go('#/palestra/sessione/' + sess.id);
        break;
      }
    }
  };
  return { title: b.schedaNome, back: '#/palestra/scheda/' + b.schedaId };
}

// ---------- Storico ----------
function viewStorico(root) {
  const storico = getStorico();
  const nomi = [...new Map(storico.flatMap((s) => s.esercizi.map((e) => [e.nome.trim().toLowerCase(), e.nome.trim()]))).values()]
    .sort((a, b) => a.localeCompare(b, 'it'));
  root.innerHTML = storico.length ? `
    <h2>Progressi per esercizio</h2>
    <div class="chips">${nomi.map((n) => `<a class="chip" href="#/palestra/esercizio/${encodeURIComponent(n)}">📈 ${esc(n)}</a>`).join('')}</div>
    <div class="section-head"><h2>Tutti gli allenamenti (${storico.length})</h2></div>
    ${sessionCards(storico)}`
    : empty('Nessun allenamento', 'Gli allenamenti salvati compariranno qui.');
  return { title: 'Storico', back: '#/palestra' };
}

function viewSessione(root, id, ctx) {
  const s = getStorico().find((x) => x.id === id);
  if (!s) { root.innerHTML = empty('Allenamento non trovato'); return { title: 'Storico', back: '#/palestra/storico' }; }
  const volume = s.esercizi.reduce((a, e) => a + e.serie.reduce((b, x) => b + (x.kg || 0) * (x.reps || 0), 0), 0);
  root.innerHTML = `
    <div class="card workout-head">
      <div><div class="muted small">Data</div><b>${fmtDate(s.data)}</b></div>
      <div><div class="muted small">Durata</div><b>${s.durataMin} min</b></div>
      <div><div class="muted small">Volume</div><b>${Math.round(volume).toLocaleString('it-IT')} kg</b></div>
    </div>
    ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
    <div class="list">${s.esercizi.map((e) => `
      <a class="card link" href="#/palestra/esercizio/${encodeURIComponent(e.nome)}">
        <div class="card-title">${esc(e.nome)}</div>
        <div class="session-sets">${e.serie.map((x) => `<span class="chip">${x.reps} × ${fmtKg(x.kg)} kg</span>`).join('')}</div>
      </a>`).join('')}</div>
    <div class="row end"><button class="btn ghost small danger" data-act="del">Elimina allenamento</button></div>`;
  root.querySelector('[data-act=del]').onclick = () => {
    if (!confirm('Eliminare questo allenamento dallo storico?')) return;
    setStorico(getStorico().filter((x) => x.id !== id));
    ctx.go('#/palestra/storico');
  };
  return { title: s.schedaNome, back: '#/palestra/storico' };
}

// ---------- Progressi di un esercizio ----------
function chart(points) {
  if (points.length < 2) return '';
  const W = 320, H = 130, P = 18;
  const vs = points.map((p) => p.v);
  const min = Math.min(...vs), max = Math.max(...vs), span = max - min || 1;
  const xy = points.map((p, i) => [
    P + (i * (W - 2 * P)) / (points.length - 1),
    H - P - ((p.v - min) / span) * (H - 2 * P - 14),
  ]);
  const line = xy.map((a) => a.join(',')).join(' ');
  const area = `${P},${H - P} ${line} ${W - P},${H - P}`;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Andamento del carico massimo">
    <defs>
      <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/>
        <stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="chart-line" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
        <stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/>
      </linearGradient>
    </defs>
    <polygon class="area" points="${area}" fill="url(#chart-fill)"/>
    <polyline class="line" pathLength="1" points="${line}" fill="none" stroke="url(#chart-line)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${xy.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4.5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2.5" style="--i:${i}"><title>${esc(points[i].label)}: ${fmtKg(points[i].v)} kg</title></circle>`).join('')}
    <text x="${W - P}" y="12" text-anchor="end" class="axis">max ${fmtKg(max)} kg</text>
    <text x="${W - P}" y="${H - 2}" text-anchor="end" class="axis">min ${fmtKg(min)} kg</text>
  </svg>`;
}

function viewEsercizio(root, nome) {
  const voci = getStorico()
    .map((s) => ({ s, e: s.esercizi.find((e) => same(e.nome, nome)) }))
    .filter((x) => x.e);
  if (!voci.length) {
    root.innerHTML = empty('Nessun dato', 'Registra un allenamento con questo esercizio per vedere i progressi.');
    return { title: nome };
  }
  const maxOf = (e) => Math.max(...e.serie.map((x) => x.kg || 0));
  const record = Math.max(...voci.map((v) => maxOf(v.e)));
  const points = [...voci].reverse().map((v) => ({ label: fmtDate(v.s.data), v: maxOf(v.e) }));
  root.innerHTML = `
    <div class="card workout-head">
      <div><div class="muted small">Record</div><b>${fmtKg(record)} kg</b></div>
      <div><div class="muted small">Ultimo</div><b>${fmtKg(maxOf(voci[0].e))} kg</b></div>
      <div><div class="muted small">Sessioni</div><b>${voci.length}</b></div>
    </div>
    ${points.length > 1 ? `<section class="card"><div class="muted small">Carico massimo per sessione</div>${chart(points.slice(-20))}</section>` : ''}
    <div class="list">${voci.map(({ s, e }) => `
      <a class="card link" href="#/palestra/sessione/${s.id}">
        <div class="muted small">${fmtDate(s.data)} · ${esc(s.schedaNome)}</div>
        <div class="session-sets">${e.serie.map((x) => `<span class="chip">${x.reps} × ${fmtKg(x.kg)} kg</span>`).join('')}</div>
      </a>`).join('')}</div>`;
  return { title: nome };
}
