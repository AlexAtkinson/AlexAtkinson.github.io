/* Minimal theme manager
   - Reads `theme` from localStorage ("dark" or "light").
   - Applies it by setting `data-theme` on <html>.
   - Exposes `toggleTheme()` to switch and persist.
*/
/* Make init idempotent: listeners attach only once while state is always applied */
(function(){
  // Set a CSS variable `--vh` representing 1% of the viewport height. This helps
  // avoid `100vh` issues on mobile where the browser chrome (address bar) toggles.
  function setVh() {
    try{
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }catch(e){}
  }
  setVh();
  window.addEventListener('resize', setVh, {passive:true});
  window.addEventListener('orientationchange', setVh, {passive:true});

  let __theme_listeners_attached = false;
  function setButtonState(theme){
    const btns = document.querySelectorAll('[data-theme-toggle]');
    btns.forEach(btn => {
      const isDark = theme === 'dark';
      // data-state keeps the current theme name
      btn.setAttribute('data-state', theme);
      // aria-pressed reflects whether dark mode is active (pressed = dark)
      btn.setAttribute('aria-pressed', String(isDark));
      // set accessible label and title
      btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';

      // SVG icons (sun for light, moon for dark). Button shows the action (what will happen when clicked)
      const sunSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
      // slimmer crescent moon (stroked) for a more crescent-like appearance
      const moonSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 1 7 7 0 0021 12.79z"/></svg>';

      // Show the action icon: if currently dark, show sun (action: switch to light); if currently light, show moon
      btn.innerHTML = isDark ? sunSVG : moonSVG;
      // add a helper class when the moon icon is shown so we can nudge it with CSS
      if(!isDark) btn.classList.add('icon-moon'); else btn.classList.remove('icon-moon');
    });
  }

  function apply(theme){
    if(theme === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    setButtonState(theme);
  }

  function init(){
    try{
      const stored = localStorage.getItem('theme');
      const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      const chosen = stored || prefers || 'dark';
      apply(chosen);
    }catch(e){ apply('dark'); }
    // attach global listeners only once; re-running init will still apply state
    if(!__theme_listeners_attached){
      __theme_listeners_attached = true;
      // helper to close all open avatar popups and cleanup per-wrap resources
      function closeAllAvatarPopups(){
        const open = document.querySelectorAll('.avatar-popup.open');
        if(!open.length) return;
        open.forEach(p => {
          try{ p.classList.remove('open'); }catch(e){}
          try{
            const wrap = p.closest && p.closest('.avatar-wrap');
            if(wrap){
              if(wrap._bubbleEl){ try{ if(wrap._bubbleEl.parentNode) wrap._bubbleEl.parentNode.removeChild(wrap._bubbleEl); }catch(e){} wrap._bubbleEl = null; }
              if(wrap._bubbleTail){ try{ if(wrap._bubbleTail.parentNode) wrap._bubbleTail.parentNode.removeChild(wrap._bubbleTail); }catch(e){} wrap._bubbleTail = null; }
              if(wrap._overlayEl){ try{ if(wrap._overlayEl.parentNode) wrap._overlayEl.parentNode.removeChild(wrap._overlayEl); }catch(e){} wrap._overlayEl = null; }
              if(wrap._bubbleEarlyTimer){ try{ clearTimeout(wrap._bubbleEarlyTimer); }catch(e){} wrap._bubbleEarlyTimer = null; }
              if(wrap._bubbleTimer){ try{ clearTimeout(wrap._bubbleTimer); }catch(e){} wrap._bubbleTimer = null; }
              if(wrap._bubbleRemoveTimer){ try{ clearTimeout(wrap._bubbleRemoveTimer); }catch(e){} wrap._bubbleRemoveTimer = null; }
              if(wrap._bubbleReposition){ try{ window.removeEventListener('scroll', wrap._bubbleReposition); window.removeEventListener('resize', wrap._bubbleReposition); }catch(e){} wrap._bubbleReposition = null; }
              if(wrap._bubbleTailReposition){ try{ window.removeEventListener('scroll', wrap._bubbleTailReposition); window.removeEventListener('resize', wrap._bubbleTailReposition); }catch(e){} wrap._bubbleTailReposition = null; }
              if(wrap._bubbleTailObserver){ try{ wrap._bubbleTailObserver.disconnect(); }catch(e){} wrap._bubbleTailObserver = null; }
              if(wrap._bubbleTailRaf){ try{ wrap._bubbleTailRaf(); }catch(e){} wrap._bubbleTailRaf = null; }
            }
          }catch(e){}
        });
      }

      // handle interactions (pointerdown/click/touchstart) to toggle theme or close popups
      function docInteractionHandler(e){
        const btn = e.target && e.target.closest && e.target.closest('[data-theme-toggle]');
        if(btn){ toggleTheme(); return; }
        // if interaction occurs inside an avatar-wrap, ignore (user interacting with avatar)
        const inWrap = e.target && e.target.closest && e.target.closest('.avatar-wrap');
        if(!inWrap) closeAllAvatarPopups();
      }

      document.addEventListener('pointerdown', docInteractionHandler, {passive:true});
      document.addEventListener('touchstart', docInteractionHandler, {passive:true});
      document.addEventListener('click', docInteractionHandler);

      // Do not close popups on scroll; keep them open while the user scrolls.
      // Keep pointercancel and visibilitychange handlers to handle aborted gestures
      // and backgrounding the page.
      document.addEventListener('pointercancel', function(){ closeAllAvatarPopups(); }, {passive:true});
      document.addEventListener('visibilitychange', function(){ if(document.hidden) closeAllAvatarPopups(); });
      // close when focus moves outside avatar wraps (keyboard or programmatic focus)
      document.addEventListener('focusin', function(e){ if(! (e.target && e.target.closest && e.target.closest('.avatar-wrap')) ) closeAllAvatarPopups(); });
    }

    // Avatar popup behavior: toggle on click, auto-close after delay on mouseleave (like the menu)
    document.querySelectorAll('.avatar-wrap').forEach(wrap => {
      // Avoid wiring the same wrap multiple times when `init()` is re-run after header injection
      if(wrap.dataset.avatarInit) return;
      wrap.dataset.avatarInit = '1';
      const img = wrap.querySelector('img.avatar');
      if(!img) return;
      // per-wrap auto-close timer so popup closes after pointer leaves
      let closeTimer = null;
      // how long before the avatar popup auto-closes
      const AVATAR_CLOSE_DELAY = 3500; // ms
      // how much earlier the speech bubble should hide before the popup closes (at least 100ms)
      const BUBBLE_LEAD_MS = 100;
      // timer used to fade bubble slightly before popup closes
      let bubbleEarlyTimer = null;
      function scheduleClose(){
        clearTimeout(closeTimer);
        if(bubbleEarlyTimer){ clearTimeout(bubbleEarlyTimer); bubbleEarlyTimer = null; }
        closeTimer = setTimeout(() => {
          const p = wrap.querySelector('.avatar-popup');
          // if pointer re-entered, do nothing
          if(!p) return;
          if (wrap.matches(':hover') || p.matches(':hover')) return;
          p.classList.remove('open');
        }, AVATAR_CLOSE_DELAY);
        // schedule early fade for bubble/tail
        const earlyDelay = Math.max(0, AVATAR_CLOSE_DELAY - BUBBLE_LEAD_MS);
        bubbleEarlyTimer = setTimeout(() => {
          try{ if(wrap._bubbleEl) wrap._bubbleEl.style.opacity = '0'; }catch(e){}
          try{ if(wrap._bubbleTail) wrap._bubbleTail.style.opacity = '0'; }catch(e){}
        }, earlyDelay);
        wrap._bubbleEarlyTimer = bubbleEarlyTimer;
      }
      function cancelClose(){
        clearTimeout(closeTimer); closeTimer = null;
        if(bubbleEarlyTimer){ clearTimeout(bubbleEarlyTimer); bubbleEarlyTimer = null; }
        // restore bubble opacity if it was faded
        try{ if(wrap._bubbleEl) wrap._bubbleEl.style.opacity = '1'; }catch(e){}
        try{ if(wrap._bubbleTail) wrap._bubbleTail.style.opacity = '1'; }catch(e){}
      }

      function openPopup(){
        cancelClose();
        let p = wrap.querySelector('.avatar-popup');
        // bubble timer and element per-wrap
        let bubbleTimer = wrap._bubbleTimer || null;
        let bubbleEl = wrap._bubbleEl || null;
        if(!p){
          p = document.createElement('img');
          p.className = 'avatar-popup';
          // Always use the 512px avatar for the popup regardless of the small img's src
          p.src = 'assets/images/avatar-alex-in-summer_512.webp';
          p.srcset = 'assets/images/avatar-alex-in-summer_512.webp 512w';
          p.alt = img.alt || 'Avatar (large)';
          // popup is not critical for initial paint: mark as low priority
          p.setAttribute('fetchpriority', 'low');
          wrap.appendChild(p);
          // clicking popup toggles (close)
          p.addEventListener('click', e => { e.stopPropagation(); p.classList.remove('open'); });
        }
        p.classList.add('open');
        // No overlay: rely on document-level handlers to close popups so taps
        // are not intercepted and other controls remain clickable on first tap.

        // schedule a speech bubble 450ms after popup opens
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(() => {
          // don't recreate if already present
          if(!wrap._bubbleEl){
            bubbleEl = document.createElement('div');
            bubbleEl.className = 'avatar-bubble';
            // visible text
            const text = document.createElement('div');
            text.textContent = 'Oh, hi there.';
            // tail element (use inline SVG like the moon icon for crisp rendering)
            const tail = document.createElementNS('http://www.w3.org/2000/svg','svg');
            tail.setAttribute('class','avatar-bubble-tail');
            tail.setAttribute('width','32');
            tail.setAttribute('height','32');
            tail.setAttribute('viewBox','0 0 32 32');
            // append to body so it layers above header contexts
            document.body.appendChild(bubbleEl);
            bubbleEl.appendChild(text);
            bubbleEl.appendChild(tail);
            // style bubble: enlarge ~60%, position absolutely in document so it
            // moves with the avatar popup (we update position on scroll/resize)
            Object.assign(bubbleEl.style, {
              position: 'absolute',
              left: '20px',
              top: '50px',
              background: 'rgba(255,255,255,0.98)',
              color: '#111',
              padding: '16px 22px',
              borderRadius: '26px',
              fontSize: '28px',
              whiteSpace: 'nowrap',
              boxShadow: '0 14px 56px rgba(0,0,0,0.6)',
              opacity: '0',
              transition: 'opacity 200ms ease, transform 240ms ease',
              zIndex: '99999',
              pointerEvents: 'none',
              transform: 'translateY(-6px)'
            });
            // create triangular tail path and style the svg so it points down-right
            const tri = document.createElementNS('http://www.w3.org/2000/svg','path');
            tri.setAttribute('d','M0 0 L32 0 L32 32 Z');
            // fill will be set to the bubble's computed background color so they match exactly
            tri.setAttribute('fill','rgba(255,255,255,0.98)');
            tail.appendChild(tri);
            Object.assign(tail.style, {
              position: 'absolute',
              right: '68px',
              bottom: '-22px',
              overflow: 'visible',
              pointerEvents: 'none'
            });
            // position bubble near popup (upper-left) if popup rect available
            try{
              const rect = p.getBoundingClientRect();
              const bx = Math.max(8, rect.left + 8); // small inset from left edge
              const by = Math.max(8, rect.top + 8);  // small inset from top edge
              // position absolute must account for page scroll
              bubbleEl.style.left = (window.scrollX + bx) + 'px';
              bubbleEl.style.top = (window.scrollY + by) + 'px';
            }catch(e){ /* fallback kept */ }
            // reposition handler keeps the bubble aligned to the avatar popup
            const reposition = () => {
              try{
                const rect = p.getBoundingClientRect();
                const bx = Math.max(8, rect.left + 8);
                const by = Math.max(8, rect.top + 8);
                bubbleEl.style.left = (window.scrollX + bx) + 'px';
                bubbleEl.style.top = (window.scrollY + by) + 'px';
              }catch(e){}
            };
            // listen to scroll/resize so bubble follows the avatar
            window.addEventListener('scroll', reposition, {passive:true});
            window.addEventListener('resize', reposition, {passive:true});
            // store references for cleanup (existing cleanup looks for _bubbleTailReposition)
            wrap._bubbleReposition = reposition;
            wrap._bubbleTailReposition = reposition;
            // show bubble
            void bubbleEl.offsetWidth;
            bubbleEl.style.opacity = '1';
            bubbleEl.style.transform = 'translateY(0)';
            // make the triangle exactly match the bubble's computed background color
            try{
              const bg = window.getComputedStyle(bubbleEl).backgroundColor;
              tri.setAttribute('fill', bg);
            }catch(e){}
            wrap._bubbleEl = bubbleEl;

            // schedule removal: show speech bubble for a fixed duration (2000ms)
            const bubbleVisibleMs = 2000;
            const removeTimer = setTimeout(() => {
              if(wrap._bubbleEl){
                // fade out only (no translate) so it disappears in place
                try{ wrap._bubbleEl.style.opacity = '0'; }catch(e){}
                // also fade tail
                try{ if(wrap._bubbleTail) wrap._bubbleTail.style.opacity = '0'; }catch(e){}
                setTimeout(() => {
                  // remove reposition listeners
                  try{
                    if(wrap._bubbleReposition){ window.removeEventListener('scroll', wrap._bubbleReposition); window.removeEventListener('resize', wrap._bubbleReposition); }
                    if(wrap._bubbleTailReposition){ window.removeEventListener('scroll', wrap._bubbleTailReposition); window.removeEventListener('resize', wrap._bubbleTailReposition); }
                  }catch(e){}
                  try{ if(wrap._bubbleEl && wrap._bubbleEl.parentNode) wrap._bubbleEl.parentNode.removeChild(wrap._bubbleEl); }catch(e){}
                  wrap._bubbleEl = null;
                  wrap._bubbleReposition = null;
                  wrap._bubbleTailReposition = null;
                }, 240);
              }
            }, bubbleVisibleMs);
            wrap._bubbleRemoveTimer = removeTimer;
          }
        }, 450);
        wrap._bubbleTimer = bubbleTimer;
      }

      function closePopup(){
        cancelClose();
        const p = wrap.querySelector('.avatar-popup');
        if(p) p.classList.remove('open');
        // remove overlay immediately so it doesn't block taps while bubble fades
        if(wrap._overlayEl){
          try{ if(wrap._overlayEl.parentNode) wrap._overlayEl.parentNode.removeChild(wrap._overlayEl); }catch(e){}
          try{ if(wrap._overlayEl && wrap._overlayHandler){ wrap._overlayEl.removeEventListener('pointerdown', wrap._overlayHandler); wrap._overlayEl.removeEventListener('touchstart', wrap._overlayHandler); wrap._overlayEl.removeEventListener('click', wrap._overlayHandler); } }catch(e){}
          wrap._overlayEl = null; wrap._overlayHandler = null;
        }
        // remove bubble immediately (with fade) and clear timers
        const bubble = wrap._bubbleEl;
        if(bubble){
          try{ bubble.style.opacity = '0'; bubble.style.transform = 'translateY(-6px)'; }catch(e){}
          setTimeout(() => {
            try{
              if(wrap._bubbleReposition){ window.removeEventListener('scroll', wrap._bubbleReposition); window.removeEventListener('resize', wrap._bubbleReposition); }
              if(wrap._bubbleTailReposition){ window.removeEventListener('scroll', wrap._bubbleTailReposition); window.removeEventListener('resize', wrap._bubbleTailReposition); }
            }catch(e){}
            if(bubble.parentNode) bubble.parentNode.removeChild(bubble);
            // remove overlay if present
            try{ if(wrap._overlayEl && wrap._overlayEl.parentNode) wrap._overlayEl.parentNode.removeChild(wrap._overlayEl); }catch(e){}
            try{ if(wrap._overlayEl && wrap._overlayHandler){ wrap._overlayEl.removeEventListener('pointerdown', wrap._overlayHandler); wrap._overlayEl.removeEventListener('touchstart', wrap._overlayHandler); wrap._overlayEl.removeEventListener('click', wrap._overlayHandler); } }catch(e){}
            wrap._overlayEl = null; wrap._overlayHandler = null;
          }, 240);
          wrap._bubbleEl = null;
          wrap._bubbleReposition = null;
          wrap._bubbleTailReposition = null;
        }
        if(wrap._bubbleEarlyTimer){ try{ clearTimeout(wrap._bubbleEarlyTimer); }catch(e){} wrap._bubbleEarlyTimer = null; }
        if(wrap._bubbleTimer){ clearTimeout(wrap._bubbleTimer); wrap._bubbleTimer = null; }
        if(wrap._bubbleRemoveTimer){ clearTimeout(wrap._bubbleRemoveTimer); wrap._bubbleRemoveTimer = null; }
      }

      wrap.addEventListener('click', function(e){
        e.stopPropagation();
        const p = wrap.querySelector('.avatar-popup');
        if(p && p.classList.contains('open')) closePopup(); else openPopup();
      });

      // auto-close behavior: schedule on pointer leave, cancel on enter
      wrap.addEventListener('pointerenter', cancelClose, {passive:true});
      wrap.addEventListener('pointerleave', scheduleClose, {passive:true});
      // also close if focus moves away from any controls inside the wrap
      wrap.addEventListener('focusout', scheduleClose);
      wrap.addEventListener('focusin', cancelClose);
    });
  }

  function toggleTheme(){
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    try{ localStorage.setItem('theme', next); }catch(e){}
    apply(next);
  }

  window.theme = { init, toggleTheme };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
