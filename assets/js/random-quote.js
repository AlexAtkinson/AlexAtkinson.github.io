// Load a random quote file from assets/misc/quotes/ and place it in the footer
(function(){
  // Set this to the number of available quote files. Adjust as files are added/removed.
  // Current files are 0000_.txt .. 0109_.txt (110 files)
  const QUOTE_COUNT = 110;

  function placeQuote(text){
    try{
      const el = document.querySelector('footer div');
      if(el){ el.textContent = String(text || ''); }
    }catch(e){ /* silent */ }
  }

  function fetchAndPlace(index){
    const id = String(index).padStart(4,'0');
    const path = `assets/misc/quotes/${id}_.txt`;
    fetch(path, {cache: 'no-cache'})
      .then(r => {
        if(!r.ok) throw new Error('fetch failed');
        return r.text();
      })
      .then(text => {
        const t = (text || '').trim();
        if(!t) return;
        placeQuote(t);
      }).catch(() => {
        // If fetch fails, silently do nothing (footer remains unchanged)
      });
  }

  function chooseAndPlace(){
    if(typeof QUOTE_COUNT !== 'number' || QUOTE_COUNT <= 0) return;
    // pick integer in range [0, QUOTE_COUNT-1]
    const pick = Math.floor(Math.random() * QUOTE_COUNT);
    fetchAndPlace(pick);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', chooseAndPlace);
  else chooseAndPlace();
})();
