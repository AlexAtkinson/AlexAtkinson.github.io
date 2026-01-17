/* footer-loader.js — fetch and inject `assets/components/footer.html` into pages */
(async function(){
  try{
    const resp = await fetch('/assets/components/footer.html', {cache: 'no-cache'});
    if(!resp.ok) return;
    const html = await resp.text();

    function inject(){
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newFooter = doc.querySelector('footer');
      if(!newFooter) return;

      const existing = document.querySelector('footer');
      if(existing){ existing.replaceWith(newFooter.cloneNode(true)); }
      else {
        const wrap = document.querySelector('.wrap');
        if(wrap) wrap.appendChild(newFooter.cloneNode(true));
      }
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
    else inject();
  }catch(e){ console.warn('footer-loader failed', e); }
})();
