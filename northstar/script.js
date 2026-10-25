(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const navbar = document.getElementById('navbar');
  const megaMenu = document.getElementById('megaMenu');
  const backdrop = document.getElementById('menuBackdrop');
  const triggers = [...document.querySelectorAll('.nav-trigger[data-menu]')];
  const panels = [...document.querySelectorAll('.mega-panel[data-panel]')];
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileTabs = [...document.querySelectorAll('.mobile-menu-tab[data-menu-tab]')];
  const solutionChoices = [...document.querySelectorAll('.solution-choice[data-solution]')];
  const solutionDetails = [...document.querySelectorAll('.solution-detail[data-solution-detail]')];
  const toast = document.getElementById('toast');
  const brand = document.querySelector('.brand');
  const mobileQuery = window.matchMedia?.('(max-width: 900px)') || { matches: false };

  // Leave the page usable if this script is reused without its expected navigation markup.
  if (!header || !navbar || !megaMenu || !backdrop || !mobileToggle || !triggers.length) return;

  let activeMenu = null;
  let closeTimer = 0;
  let toastTimer = 0;
  let fitFrame = 0;
  let hoverOpenedMenu = null;
  let lastDesktopTrigger = null;

  const isMobile = () => mobileQuery.matches;

  // Dismissible announcement bar (remembered for the browser session). It is wired first, with a
  // delegated capture-phase listener, so nothing else in this file can prevent it from working.
  const BANNER_KEY = 'northstar-banner-dismissed';
  try { if (sessionStorage.getItem(BANNER_KEY)) document.querySelector('.announcement-bar')?.remove(); } catch (_) { /* storage unavailable */ }
  document.addEventListener('click', (event) => {
    const closeButton = event.target.closest?.('#announcementClose');
    if (!closeButton) return;
    event.preventDefault();
    const bar = document.querySelector('.announcement-bar');
    if (!bar || bar.classList.contains('is-hidden')) return;
    const restoreFocus = document.activeElement === closeButton;
    try { sessionStorage.setItem(BANNER_KEY, '1'); } catch (_) { /* storage unavailable */ }
    bar.style.maxHeight = `${bar.offsetHeight}px`;
    void bar.offsetHeight;
    bar.classList.add('is-hidden');
    window.setTimeout(() => {
      const shouldRestoreFocus = restoreFocus && (document.activeElement === closeButton || document.activeElement === document.body);
      bar.remove();
      if (shouldRestoreFocus) brand?.focus({ preventScroll: true });
      if (activeMenu) fitMenu();
    }, 380);
  }, true);

  // Size the menu to the space actually left under the header, so its bottom edge is never off-screen
  // (the announcement bar and mobile browser toolbars both change that space).
  function fitMenu() {
    const room = window.innerHeight - header.getBoundingClientRect().bottom - (isMobile() ? 12 : 24);
    megaMenu.style.setProperty('--menu-max', `${Math.max(0, Math.floor(room))}px`);
  }

  function scheduleFitMenu() {
    if (!activeMenu || fitFrame) return;
    fitFrame = window.requestAnimationFrame(() => {
      fitFrame = 0;
      if (activeMenu) fitMenu();
    });
  }

  function syncMenuState(name) {
    const isOpen = Boolean(name);
    header.classList.toggle('menu-open', isOpen);
    megaMenu.setAttribute('aria-hidden', String(!isOpen));
    megaMenu.inert = !isOpen;
    backdrop.setAttribute('aria-hidden', String(!isOpen));
    backdrop.classList.toggle('is-visible', isOpen);
    document.documentElement.classList.toggle('menu-lock', isOpen && isMobile());
    if (isOpen) fitMenu();

    triggers.forEach((trigger) => {
      const selected = trigger.dataset.menu === name;
      trigger.setAttribute('aria-expanded', String(selected));
      trigger.classList.toggle('is-current', selected);
      if (selected && !isMobile()) lastDesktopTrigger = trigger;
    });

    panels.forEach((panel) => {
      const selected = panel.dataset.panel === name;
      panel.classList.toggle('is-active', selected);
      panel.setAttribute('aria-hidden', String(!selected));
      panel.inert = !selected;
    });

    mobileTabs.forEach((tab) => {
      const selected = tab.dataset.menuTab === name;
      tab.classList.toggle('is-current', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
  }

  function setMenu(name, source = 'programmatic') {
    window.clearTimeout(closeTimer);
    activeMenu = name || null;

    if (source !== 'hover') hoverOpenedMenu = null;

    if (activeMenu && isMobile()) {
      // The hamburger doubles as the close control while a menu sheet is open.
      navbar.classList.remove('mobile-open');
      mobileToggle.setAttribute('aria-expanded', 'true');
      mobileToggle.setAttribute('aria-label', 'Close navigation');
    }

    if (!activeMenu) {
      navbar.classList.remove('mobile-open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.setAttribute('aria-label', 'Open navigation');
    }

    syncMenuState(activeMenu);

    // After the mobile top-level nav collapses, move focus into the visible menu controls.
    if (activeMenu && isMobile() && source === 'mobile-trigger') {
      mobileTabs.find((tab) => tab.dataset.menuTab === activeMenu)?.focus({ preventScroll: true });
    }

    if (!activeMenu && source === 'mobile-close') {
      mobileToggle.focus({ preventScroll: true });
    } else if (!activeMenu && source === 'escape') {
      const focusTarget = isMobile() ? mobileToggle : (lastDesktopTrigger || triggers[0]);
      focusTarget?.focus({ preventScroll: true });
    }
  }

  function openMenu(name, source = 'click') {
    if (!name) return;
    setMenu(activeMenu === name ? null : name, source);
  }

  function scheduleClose() {
    if (isMobile()) return;
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      const pointerStillInside = navbar.matches(':hover') || megaMenu.matches(':hover');
      const focusStillInPanel = megaMenu.contains(document.activeElement);
      if (!pointerStillInside && !focusStillInPanel) setMenu(null, 'pointer-leave');
    }, 220);
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const name = trigger.dataset.menu;
      if (activeMenu === name && hoverOpenedMenu === name) {
        // A click immediately after hover confirms the open menu rather than closing it.
        hoverOpenedMenu = null;
        return;
      }
      openMenu(name, isMobile() ? 'mobile-trigger' : 'click');
    });

    trigger.addEventListener('mouseenter', () => {
      // Keep keyboard focus in its current panel; making that panel inert would strand focus.
      if (!isMobile() && !megaMenu.contains(document.activeElement)) {
        hoverOpenedMenu = trigger.dataset.menu;
        setMenu(trigger.dataset.menu, 'hover');
      }
    });

  });

  mobileTabs.forEach((tab) => {
    tab.addEventListener('click', () => setMenu(tab.dataset.menuTab, 'mobile-tab'));
  });

  backdrop.addEventListener('click', () => setMenu(null, 'backdrop'));

  mobileToggle.addEventListener('click', () => {
    if (activeMenu) {
      setMenu(null, 'mobile-toggle');
      return;
    }
    const isOpen = navbar.classList.toggle('mobile-open');
    mobileToggle.setAttribute('aria-expanded', String(isOpen));
    mobileToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });

  navbar.addEventListener('mouseenter', () => window.clearTimeout(closeTimer));
  navbar.addEventListener('mouseleave', scheduleClose);
  megaMenu.addEventListener('mouseenter', () => window.clearTimeout(closeTimer));
  megaMenu.addEventListener('mouseleave', scheduleClose);

  document.querySelectorAll('[data-close-menu]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href') || '';
      const closingMenu = activeMenu;
      const mobileNavWasOpen = isMobile() && navbar.classList.contains('mobile-open');
      setMenu(null, 'link');
      if ((closingMenu && link.closest('.mega-menu')) || (mobileNavWasOpen && link.closest('#navLinks'))) {
        const focusTarget = isMobile() ? mobileToggle : triggers.find((trigger) => trigger.dataset.menu === closingMenu);
        focusTarget?.focus({ preventScroll: true });
      }

      // Real destinations scroll normally; missing demo destinations explain themselves.
      if (href.startsWith('#')) {
        let target = null;
        try { target = document.querySelector(href); } catch (_) { /* Ignore malformed demo fragments. */ }
        if (!target) {
          event.preventDefault();
          const label = link.textContent.trim().replace(/\s+/g, ' ');
          showToast(`${label} — connect this demo link to your destination.`);

        }
      }
    });
  });

  solutionChoices.forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.solution;
      solutionChoices.forEach((choice) => {
        const selected = choice === button;
        choice.classList.toggle('is-selected', selected);
        choice.setAttribute('aria-pressed', String(selected));
      });
      solutionDetails.forEach((detail) => {
        const selected = detail.dataset.solutionDetail === name;
        detail.classList.toggle('is-active', selected);
        detail.setAttribute('aria-hidden', String(!selected));
        detail.inert = !selected;
      });
    });
  });

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (activeMenu) {
        event.preventDefault();
        setMenu(null, 'escape');
      } else if (navbar.classList.contains('mobile-open')) {
        event.preventDefault();
        navbar.classList.remove('mobile-open');
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileToggle.setAttribute('aria-label', 'Open navigation');
        mobileToggle.focus({ preventScroll: true });
      }
      return;
    }

    if (isMobile()) return;
    const items = (name) => [...(panels.find((p) => p.dataset.panel === name)?.querySelectorAll('a[href], button:not([disabled])') || [])]
      .filter((el) => !el.closest('[inert]'));
    const trigger = document.activeElement?.closest?.('.nav-trigger[data-menu]');

    if (trigger) {
      const name = trigger.dataset.menu;
      if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey && activeMenu === name)) {
        // Menu opens on Enter/Space/click; Arrow Down opens it too, then both keys step into the panel.
        if (activeMenu !== name) setMenu(name, 'key');
        const first = items(name)[0];
        if (first) { event.preventDefault(); first.focus(); }
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const delta = event.key === 'ArrowRight' ? 1 : -1;
        const next = triggers[(triggers.indexOf(trigger) + delta + triggers.length) % triggers.length];
        next.focus();
        if (activeMenu) setMenu(next.dataset.menu, 'key');
      }
      return;
    }

    // Shift+Tab from the first panel control returns to the trigger that owns the panel.
    if (event.key === 'Tab' && event.shiftKey && activeMenu && document.activeElement === items(activeMenu)[0]) {
      event.preventDefault();
      triggers.find((t) => t.dataset.menu === activeMenu)?.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (activeMenu && !event.target.closest('.site-header')) setMenu(null, 'outside');
  });

  document.addEventListener('focusin', (event) => {
    if (activeMenu && !header.contains(event.target)) setMenu(null, 'focus-outside');
  });

  // Keep state predictable when orientation or viewport size crosses the mobile breakpoint.
  const onBreakpointChange = (event) => {
    const focused = document.activeElement;
    const focusInMenu = megaMenu.contains(focused);
    const focusInDesktopLinks = Boolean(focused.closest?.('#navLinks, .login-link'));
    const focusOnToggle = focused === mobileToggle;
    window.clearTimeout(closeTimer);
    setMenu(null, 'breakpoint-change');
    navbar.classList.remove('mobile-open');
    if (focusInMenu || focusOnToggle || (event.matches && focusInDesktopLinks)) {
      const focusTarget = event.matches ? mobileToggle : (lastDesktopTrigger || triggers[0]);
      focusTarget?.focus({ preventScroll: true });
    }
  };
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onBreakpointChange);
  else mobileQuery.addListener?.(onBreakpointChange);

  // Browser back/forward navigation should never leave the menu obscuring the page.
  window.addEventListener('hashchange', () => setMenu(null, 'navigation'));

  window.addEventListener('resize', scheduleFitMenu, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleFitMenu, { passive: true });

  // Soft shadow under the sticky header once the page has scrolled.
  let scrollTick = false;
  const onScroll = () => {
    if (scrollTick) return;
    scrollTick = true;
    window.requestAnimationFrame(() => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      scrollTick = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Subtle one-time reveal for below-the-fold content (skipped when reduced motion is requested).
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  if (typeof window.IntersectionObserver === 'function' && !prefersReducedMotion) {
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        reveal.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.below-heading').forEach((el) => { el.classList.add('reveal'); reveal.observe(el); });
    document.querySelectorAll('.capability-card').forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--d', `${(i % 3) * 0.09}s`);
      reveal.observe(el);
    });
  }

  // Establish the initial, fully accessible closed state.
  syncMenuState(null);
  solutionDetails.forEach((detail) => {
    const selected = detail.classList.contains('is-active');
    detail.setAttribute('aria-hidden', String(!selected));
    detail.inert = !selected;
  });
})();
