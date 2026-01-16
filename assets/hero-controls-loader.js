/* hero-controls-loader.js — fetch and inject `assets/hero-controls.html` into pages
   This mirrors header-loader behavior for the hero's top-right controls.
*/
(async function(){
  try{
    const resp = await fetch('/assets/hero-controls.html', {cache: 'no-cache'});
    if(!resp.ok){ console.warn('hero-controls-loader: fetch failed', resp.status); return; }
    const html = await resp.text();

    function inject(){
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const fragment = doc.querySelector('.hero-theme');
      if(!fragment) return;

      // replace existing .hero-theme if present, otherwise insert into first .hero
      const existing = document.querySelector('.hero-theme');
      if(existing){ existing.replaceWith(fragment.cloneNode(true)); }
      else {
        const hero = document.querySelector('.hero');
        if(hero) hero.prepend(fragment.cloneNode(true));
      }

      // execute any scripts in the fragment (none expected, but keep parity with header-loader)
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
        }catch(e){ console.warn('hero-controls-loader: failed to run script', e); }
      });

      // re-run theme init if available so the theme toggle binds
      try{ if(window.theme && typeof window.theme.init === 'function'){ window.theme.init(); } }
      catch(e){ console.warn('hero-controls-loader: theme.init() failed', e); }
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();
  }catch(e){ console.warn('hero-controls-loader failed:', e); }
})();
