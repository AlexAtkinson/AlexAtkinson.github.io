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
    // Attempt to load a site-wide notice component and, if marked active,
    // insert it immediately after the injected header so it appears on every page.
    async function loadSiteNotice(){
      try{
        // Fetch the component first so we can compute a fingerprint. If the
        // component changed since last visit we will clear any dismissal state
        // so updated notices re-present to the user.
        const resp = await fetch('/assets/components/site-notice.html', {cache: 'no-cache'});
        if(!resp.ok){ console.log('site-notice: not present', resp.status); return; }
        const html = await resp.text();
        const parser2 = new DOMParser();
        const doc2 = parser2.parseFromString(html, 'text/html');
        const notice = doc2.querySelector('.site-notice');
        if(!notice) return;
        const active = (notice.getAttribute('data-active') || '').toLowerCase();
        if(!(active === 'true' || active === '1' || notice.classList.contains('active'))) return;

        // compute a stable hash of the component content. Prefer SHA-256 via
        // Web Crypto; fall back to a lightweight checksum if unavailable.
        function fallbackHash(s){
          let a = 0x9e3779b1;
          for(let i=0;i<s.length;i++){ a = (a ^ s.charCodeAt(i)) + 0x9e3779b1 + (a<<6) + (a>>2); a = a >>> 0; }
          return a.toString(16);
        }

        async function computeComponentHash(nodeHtml){
          const payload = (nodeHtml || '').trim();
          try{
            if(window.crypto && crypto.subtle){
              const enc = new TextEncoder();
              const data = enc.encode(payload);
              const buf = await crypto.subtle.digest('SHA-256', data);
              const arr = Array.from(new Uint8Array(buf));
              return arr.map(b => b.toString(16).padStart(2,'0')).join('');
            }
          }catch(e){ /* fall through */ }
          return fallbackHash(payload);
        }

        // Build a normalized string representing the notice: include active flag
        // and the innerHTML so cosmetic differences elsewhere in the file don't
        // affect the fingerprint as much.
        const noticePayload = ((notice.getAttribute('data-active')||'') + '|' + (notice.innerHTML || '')).trim();
        const compHash = await computeComponentHash(noticePayload);
        console.log('site-notice: compHash', compHash);

        // If component changed since last stored hash, reset dismissal state
        try{
          if(window.localStorage){
            const prev = localStorage.getItem('siteNoticeComponentHash') || '';
            const until = parseInt(localStorage.getItem('siteNoticeDismissedUntil') || '0', 10) || 0;
            console.log('site-notice: prevHash=', prev, 'dismissUntil=', until);
            if(prev !== compHash){
              console.log('site-notice: component changed, clearing dismissal');
              localStorage.removeItem('siteNoticeDismissedUntil');
              localStorage.setItem('siteNoticeComponentHash', compHash);
            }
            // Do not show if the user has previously dismissed the notice and the
            // dismissal has not yet expired.
            if(until && Date.now() < until) return;
          }
        }catch(e){ console.warn('site-notice: localStorage error', e); }

        // Insert after header if present, otherwise place at top of .wrap
        const existingHeader = document.querySelector('header');
        const wrap = document.querySelector('.wrap');
        const toInsert = notice.cloneNode(true);
        if(existingHeader && existingHeader.parentNode){
          existingHeader.parentNode.insertBefore(toInsert, existingHeader.nextSibling);
        }else if(wrap){
          const firstChild = wrap.firstElementChild;
          wrap.insertBefore(toInsert, firstChild ? firstChild : wrap.firstChild);
        }else{
          document.body.insertBefore(toInsert, document.body.firstChild);
        }

        // Wire up dismiss button (per-user dismissal persisted to localStorage)
        try{
          const dismiss = toInsert.querySelector('.site-notice-dismiss');
          if(dismiss){
            dismiss.addEventListener('click', function(){
              // persist dismissal for 24 hours
              try{
                if(window.localStorage){
                  const until = Date.now() + (24 * 60 * 60 * 1000);
                  localStorage.setItem('siteNoticeDismissedUntil', String(until));
                  // record the component hash so we know dismissal applies to this version
                  if(compHash) localStorage.setItem('siteNoticeComponentHash', compHash);
                }
              }catch(e){}
              try{ toInsert.setAttribute('aria-hidden','true'); }catch(e){}
              // small delay to allow any CSS fade before removal
              setTimeout(() => { try{ if(toInsert.parentNode) toInsert.parentNode.removeChild(toInsert); }catch(e){} }, 180);
            }, {passive:true});
          }
        }catch(e){ /* ignore */ }
      }catch(e){ console.warn('site-notice load failed', e); }
    }
    // run now and also when DOMContentLoaded in case inject runs later
    try{ loadSiteNotice(); }catch(e){}
  }catch(e){ console.warn('header-loader failed:', e); }
})();
