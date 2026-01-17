/* footer-loader.js — fetch and inject `assets/components/footer.html` into pages */
(function(){
  // Create a minimal footer placeholder synchronously so other scripts
  // (e.g. random-quote.js) can find and populate it on DOMContentLoaded.
  function ensurePlaceholder(){
    const existing = document.querySelector('footer');
    if(existing) return existing;
    const wrap = document.querySelector('.wrap') || document.body;
    const f = document.createElement('footer');
    const d = document.createElement('div');
    d.textContent = '';
    f.appendChild(d);
    wrap.appendChild(f);
    return f;
  }

  // Fetch the real component and merge it in without stomping on any
  // content already written into the placeholder (preserve populated innerHTML).
  async function fetchAndMerge(){
    try{
      const resp = await fetch('/assets/components/footer.html', {cache: 'no-cache'});
      if(!resp.ok) return;
      const html = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newFooter = doc.querySelector('footer');
      if(!newFooter) return;

      const existing = document.querySelector('footer');
      if(!existing){
        // nothing was on the page, just append
        const clone = newFooter.cloneNode(true);
        (document.querySelector('.wrap') || document.body).appendChild(clone);
        return;
      }

      // preserve any content already set by other scripts (e.g. random-quote)
      const existingDiv = existing.querySelector('div');
      const newDiv = newFooter.querySelector('div');
      if(newDiv && existingDiv && existingDiv.innerHTML && existingDiv.innerHTML.trim() !== ''){
        // copy the existing content into the fetched fragment
        newDiv.innerHTML = existingDiv.innerHTML;
      }

      // replace existing footer with merged clone
      existing.replaceWith(newFooter.cloneNode(true));

      // execute any scripts included in the fetched fragment
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(s => {
        try{
          if(s.src){
            const injected = document.createElement('script');
            injected.src = s.src;
            injected.async = false;
            document.head.appendChild(injected);
          } else if(s.textContent){
            const injected = document.createElement('script');
            injected.textContent = s.textContent;
            document.head.appendChild(injected);
          }
        }catch(e){ console.warn('failed to run footer script', e); }
      });
    }catch(e){ console.warn('footer-loader failed', e); }
  }

  // ensure placeholder immediately so other scripts can target it
  ensurePlaceholder();

  // perform fetch/merge after load; we don't wait synchronously.
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fetchAndMerge);
  } else {
    // already loaded — still fetch and merge
    fetchAndMerge();
  }
})();
