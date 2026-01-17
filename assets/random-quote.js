// Load a random quote from assets/movie-quotes.csv and place it in the footer
(function(){
  function parseCSV(text){
    const rows = [];
    let i=0, len=text.length;
    const parseLine = ()=>{
      const fields = [];
      let field='';
      let inQuotes=false;
      while(i<len){
        const ch = text[i++];
        if(inQuotes){
          if(ch === '"'){
            if(text[i] === '"'){ field += '"'; i++; continue; }
            inQuotes = false;
            continue;
          }
          field += ch;
        } else {
          if(ch === ','){ fields.push(field); field=''; continue; }
          if(ch === '"'){ inQuotes = true; continue; }
          if(ch === '\r') continue;
          if(ch === '\n') { fields.push(field); break; }
          field += ch;
        }
      }
      // handle EOF without newline
      if(i>=len && field !== '') fields.push(field);
      return fields;
    };

    // read header
    const headerFields = (function(){
      const hdr = parseLine();
      return hdr && hdr.length ? hdr : null;
    })();
    if(!headerFields) return [];

    // read remaining lines
    while(i < len){
      // skip stray newlines
      if(text[i] === '\n') { i++; continue; }
      const vals = parseLine();
      if(!vals || vals.length === 0) break;
      const obj = {};
      for(let j=0;j<headerFields.length;j++) obj[headerFields[j].trim()] = vals[j] !== undefined ? vals[j] : '';
      rows.push(obj);
    }
    return rows;
  }

  function isValidQuote(q){ return q && q.trim() && q.trim().toUpperCase() !== 'N/A'; }

  function escapeHtml(str){
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function placeQuote(textHtml){
    try{
      const el = document.querySelector('footer div');
      if(el){ el.innerHTML = textHtml; }
    }catch(e){ /* silent */ }
  }

  function chooseAndPlace(rows){
    const candidates = rows.filter(r => isValidQuote(r['Quote 1']));
    if(candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random()*candidates.length)];
    const quote = (pick['Quote 1'] || '').trim();
    const name = (pick['Name'] || pick['name'] || '').trim();
    const qEsc = escapeHtml(quote);
    const nameEsc = escapeHtml(name);
    // wrap quote in double quotes and italicize
    const html = `<em>"${qEsc}"</em> - ${nameEsc}`;
    placeQuote(html);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  function init(){
    fetch('assets/movie-quotes.csv', {cache: 'no-store'})
      .then(r => r.ok ? r.text() : Promise.reject('fetch-failed'))
      .then(txt => {
        const rows = parseCSV(txt);
        chooseAndPlace(rows);
      })
      .catch(()=>{/* fail silently */});
  }
})();
