/* header-loader.js — fetch and inject `assets/components/header.html` into pages
  This enables a single header component maintained separately from static pages.
*/
(async function(){
  try{
    console.log('header-loader: fetching /assets/components/header.html');
    const resp = await fetch('/assets/components/header.html', {cache: 'no-cache'});
    if(!resp.ok){ console.warn('header-loader: fetch failed', resp.status); return; }
    const html = await resp.text();
    console.log('header-loader: fetched header, size', html.length);

    function inject(){
      // replace existing <header> if present, otherwise prepend to .wrap
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newHeader = doc.querySelector('header');
      if(!newHeader) return;

      const existing = document.querySelector('header');
      if(existing){
        existing.replaceWith(newHeader.cloneNode(true));
      } else {
        const wrap = document.querySelector('.wrap');
        if(wrap){ wrap.prepend(newHeader.cloneNode(true)); }
      }

      // execute any scripts contained in the fetched fragment
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
        }catch(e){ console.warn('failed to run header script', e); }
      });
      // if a theme manager is present, re-run its init to bind handlers to injected elements
      try{
        if(window.theme && typeof window.theme.init === 'function'){
          window.theme.init();
          console.log('header-loader: re-ran window.theme.init()');
        }
      }catch(e){ console.warn('header-loader: theme.init() failed', e); }
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();
    console.log('header-loader: scheduled inject');
  }catch(e){ console.warn('header-loader failed:', e); }
})();
