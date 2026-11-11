# Hub

Web app per telefono (PWA) che contiene più app, ognuna con un compito:

- **Palestra** – schede di allenamento, registrazione degli allenamenti, storico e progressi per esercizio.
- **Cibo** – piano alimentare settimanale (giorni × pasti).

Funziona offline e si può installare sulla schermata Home. I dati restano sul dispositivo
(localStorage); dalla schermata principale si può esportare/importare un backup `.json`.

## Provarla sul PC

Dalla cartella del progetto:

```
python -m http.server 8080
```

poi apri http://localhost:8080

## Metterla sul telefono

Per installarla serve un indirizzo HTTPS. Il modo più semplice è pubblicare la cartella
gratis su GitHub Pages, Netlify (trascinando la cartella su app.netlify.com/drop) o simili,
poi aprire il link dal telefono → menu del browser → "Aggiungi a schermata Home".

## Aggiungere una nuova app

1. Crea `apps/nome.js` che esporta un oggetto:

   ```js
   export default {
     id: 'nome',               // usato nell'indirizzo: #/nome
     name: 'Nome visibile',
     icon: '📚',
     color: '#0ea5e9',         // colore del riquadro e dei pulsanti
     description: 'Breve descrizione',
     summary() { return 'Testo sotto il nome (facoltativo)'; },
     render(root, params, ctx) {
       // root: elemento in cui disegnare la pagina
       // params: parti dell'indirizzo dopo #/nome/ (es. #/nome/dettaglio/42 → ['dettaglio','42'])
       // ctx.go('#/...') per navigare, ctx.refresh() per ridisegnare, ctx.toast('msg')
       root.innerHTML = '<p>Ciao!</p>';
       return { title: 'Titolo pagina', back: '#/' };
     },
   };
   ```

2. Aggiungila alla lista in `js/apps.js`.
3. Aggiungi il file all'elenco `FILES` in `sw.js` e incrementa `CACHE` (es. `hub-v2`).

Funzioni utili in `js/core.js`: `load`/`save` (dati), `formDialog` (moduli), `uid`, `esc`, `toast`.
