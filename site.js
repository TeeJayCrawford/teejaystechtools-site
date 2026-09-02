(function () {
  const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
  const track = function (eventName, parameters) {
    if (window.TTTAnalytics && typeof window.TTTAnalytics.track === 'function') {
      window.TTTAnalytics.track(eventName, parameters);
    }
  };

  const header = document.querySelector('[data-site-header]');
  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.primary-nav');
  const rootPrefix = '/';
  const currentPath = window.location.pathname;

  function isCurrentSection(label) {
    if (label === 'Work') return /\/work(?:\.html|\/)/.test(currentPath);
    if (label === 'Small Business') return /\/small-business\.html$/.test(currentPath);
    if (label === 'About') return /\/about\.html$/.test(currentPath);
    if (label === 'Dealerships') {
      return /\/(dealerships|dealer-websites|inventory-|custom-dealer|dealer-command|autolister|reputation-|marketing-truth)/.test(currentPath);
    }
    return false;
  }

  if (nav) {
    const primaryLinks = [
      ['Dealerships', 'dealerships.html'],
      ['Small Business', 'small-business.html'],
      ['Work', 'work.html'],
      ['About', 'about.html']
    ];
    nav.innerHTML = primaryLinks.map(function (item) {
      const current = isCurrentSection(item[0]) ? ' aria-current="page"' : '';
      return '<a' + current + ' href="' + rootPrefix + item[1] + '">' + item[0] + '</a>';
    }).join('') + '<a class="mobile-nav-contact" href="' + rootPrefix + 'contact.html?service=not-sure">Talk with TeeJay</a>';
  }

  const headerCta = document.querySelector('.nav-cta');
  if (headerCta) {
    headerCta.href = rootPrefix + 'contact.html?service=not-sure';
    headerCta.textContent = 'Talk with TeeJay';
  }

  const footerLinks = document.querySelector('.footer-links');
  if (footerLinks) {
    footerLinks.innerHTML = [
      ['Dealerships', 'dealerships.html'],
      ['Small Business', 'small-business.html'],
      ['Work', 'work.html'],
      ['About', 'about.html'],
      ['Talk with TeeJay', 'contact.html?service=not-sure'],
      ['Privacy', 'privacy.html']
    ].map(function (item) {
      return '<a href="' + rootPrefix + item[1] + '">' + item[0] + '</a>';
    }).join('');
  }

  if (menuButton && nav) {
    const menuLabel = menuButton.querySelector('[data-menu-label]');

    function updateMenuLabel(text) {
      if (menuLabel) {
        menuLabel.textContent = text;
        return;
      }
      const textNode = Array.from(menuButton.childNodes).reverse().find(function (node) {
        return node.nodeType === Node.TEXT_NODE;
      });
      if (textNode) textNode.textContent = ' ' + text;
    }

    function setMenuState(open) {
      nav.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('nav-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      updateMenuLabel(open ? 'Close' : 'Menu');
    }

    menuButton.addEventListener('click', function () {
      setMenuState(!nav.classList.contains('is-open'));
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setMenuState(false);
      });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) setMenuState(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenuState(false);
        menuButton.focus();
      }
    });
  }

  if (header) {
    const updateHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 18);
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets = Array.from(document.querySelectorAll([
    '.catalog-row',
    '.lane-list > article',
    '.principle-list > article',
    '.dealer-stack-list > a',
    '.homepage-stack-list > a',
    '.proof-ledger > article',
    '.agent-map > article'
  ].join(','))).filter(function (node) {
    return !node.matches('.contact-section');
  });

  if (!reducedMotion && revealTargets.length > 0) {
    document.documentElement.classList.add('motion-ready');
    revealTargets.forEach(function (node, index) {
      node.setAttribute('data-cinematic-reveal', '');
      node.style.setProperty('--reveal-delay', String((index % 5) * 45) + 'ms');
    });

    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-cinematically-visible');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealTargets.forEach(function (node) { revealObserver.observe(node); });
    } else {
      revealTargets.forEach(function (node) { node.classList.add('is-cinematically-visible'); });
    }
  }

  const neuralHero = document.querySelector('.agent-network-hero');
  const homeHero = document.querySelector('.hero-section');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const networkField = document.querySelector('.network-field');

  if (document.body.classList.contains('motion-booting')) {
    let cinematicMotionStarted = false;
    const startCinematicMotion = function () {
      if (cinematicMotionStarted) return;
      cinematicMotionStarted = true;
      document.body.classList.remove('motion-booting');
      if (networkField && typeof networkField.unpauseAnimations === 'function') {
        networkField.unpauseAnimations();
      }
    };

    if (reducedMotion) {
      startCinematicMotion();
    } else if (coarsePointer) {
      if (networkField && typeof networkField.pauseAnimations === 'function') {
        networkField.pauseAnimations();
      }
      window.addEventListener('pointerdown', startCinematicMotion, { once: true, passive: true });
      window.setTimeout(startCinematicMotion, 5000);
    } else {
      window.requestAnimationFrame(startCinematicMotion);
    }
  }

  if (!reducedMotion && finePointer && neuralHero && homeHero) {
    let neuralFrame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const paintNeuralDepth = function () {
      neuralFrame = 0;
      neuralHero.style.setProperty('--neural-x', String(pointerX * 8) + 'px');
      neuralHero.style.setProperty('--neural-y', String(pointerY * 7) + 'px');
      neuralHero.style.setProperty('--core-x', String(pointerX * 15) + 'px');
      neuralHero.style.setProperty('--core-y', String(pointerY * 12) + 'px');
      homeHero.style.setProperty('--hero-spot-x', String(76 + (pointerX * 4)) + '%');
      homeHero.style.setProperty('--hero-spot-y', String(48 + (pointerY * 4)) + '%');
    };

    homeHero.addEventListener('pointermove', function (event) {
      const bounds = homeHero.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width) - 0.5;
      pointerY = ((event.clientY - bounds.top) / bounds.height) - 0.5;
      if (!neuralFrame) neuralFrame = window.requestAnimationFrame(paintNeuralDepth);
    }, { passive: true });

    homeHero.addEventListener('pointerleave', function () {
      pointerX = 0;
      pointerY = 0;
      if (!neuralFrame) neuralFrame = window.requestAnimationFrame(paintNeuralDepth);
    }, { passive: true });
  }

  if (!reducedMotion && neuralHero && 'IntersectionObserver' in window) {
    const neuralObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        neuralHero.classList.toggle('is-dormant', !entry.isIntersecting);
      });
    }, { threshold: 0.02 });
    neuralObserver.observe(neuralHero);
  }

  document.addEventListener('visibilitychange', function () {
    document.documentElement.classList.toggle('motion-paused', document.hidden);
  });

  document.querySelectorAll('[data-current-year]').forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  const pageParameters = new URLSearchParams(window.location.search);
  const attributionParameters = new URLSearchParams();
  ATTRIBUTION_KEYS.forEach(function (key) {
    const value = pageParameters.get(key);
    if (value) attributionParameters.set(key, value.slice(0, 120));
  });

  if (attributionParameters.size > 0) {
    document.querySelectorAll('a[href]').forEach(function (node) {
      const rawHref = node.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || /^(?:mailto:|tel:|javascript:)/i.test(rawHref)) return;
      const target = new URL(rawHref, window.location.href);
      if (target.origin !== window.location.origin) return;
      attributionParameters.forEach(function (value, key) {
        if (!target.searchParams.has(key)) target.searchParams.set(key, value);
      });
      node.setAttribute('href', target.pathname + target.search + target.hash);
    });
  }

  document.querySelectorAll('[data-track]').forEach(function (node) {
    node.addEventListener('click', function () {
      track('select_content', {
        content_type: 'site_cta',
        item_id: node.getAttribute('data-track')
      });
    });
  });

  document.querySelectorAll('a[href^="tel:"]').forEach(function (node) {
    node.addEventListener('click', function () {
      track('click_to_call', { link_location: window.location.pathname });
    });
  });

  document.querySelectorAll('a[href^="mailto:"]').forEach(function (node) {
    node.addEventListener('click', function () {
      track('click_to_email', { link_location: window.location.pathname });
    });
  });

  const productFilter = document.querySelector('[data-product-filter]');
  if (productFilter) {
    const filterButtons = Array.from(productFilter.querySelectorAll('[data-product-filter-value]'));
    const productRows = Array.from(document.querySelectorAll('[data-product-category]'));
    const businessSection = document.querySelector('[data-product-section-category="small-business"]');
    const emptyState = document.querySelector('[data-filter-empty]');

    function applyProductFilter(value) {
      let visibleCount = 0;
      productRows.forEach(function (row) {
        const categories = (row.getAttribute('data-product-category') || '').split(/\s+/);
        const visible = value === 'all' || categories.includes(value);
        row.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      if (businessSection) businessSection.hidden = !(value === 'all' || value === 'small-business');
      if (emptyState) emptyState.hidden = visibleCount > 0 || value === 'small-business';

      filterButtons.forEach(function (button) {
        const active = button.getAttribute('data-product-filter-value') === value;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }

    filterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        applyProductFilter(button.getAttribute('data-product-filter-value') || 'all');
      });
    });
  }

  const commandFilter = document.querySelector('[data-command-filter]');
  if (commandFilter) {
    const commandButtons = Array.from(commandFilter.querySelectorAll('[data-command-filter-value]'));
    const commandRows = Array.from(document.querySelectorAll('[data-command-status]'));

    function applyCommandFilter(value) {
      commandRows.forEach(function (row) {
        const statuses = (row.getAttribute('data-command-status') || '').split(/\s+/);
        row.hidden = value !== 'all' && !statuses.includes(value);
      });

      commandButtons.forEach(function (button) {
        const active = button.getAttribute('data-command-filter-value') === value;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }

    commandButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        applyCommandFilter(button.getAttribute('data-command-filter-value') || 'all');
      });
    });
  }

  const intakeForm = document.querySelector('[data-intake-form]');
  if (intakeForm) {
    const service = intakeForm.querySelector('[name="serviceCode"]');
    const sourcePage = intakeForm.querySelector('[name="sourcePage"]');
    const submitButton = intakeForm.querySelector('button[type="submit"]');
    const intakeTitle = document.querySelector('[data-intake-title]');
    const intakeLede = document.querySelector('[data-intake-lede]');
    const params = new URLSearchParams(window.location.search);
    const requestedService = params.get('service');
    if (service && service.tagName === 'SELECT') {
      service.value = 'not-sure';
      if (requestedService) {
        const matchingOption = Array.from(service.options).find(function (option) {
          return option.value === requestedService;
        });
        if (matchingOption) {
          service.value = requestedService;
          const requestedLabel = matchingOption.textContent.trim();
          if (intakeTitle) {
            intakeTitle.textContent = requestedService === 'free-ai-search-audit'
              ? 'Request your free AI Search Visibility Audit.'
              : 'Request pricing for ' + requestedLabel + '.';
          }
          if (intakeLede) {
            intakeLede.textContent = requestedService === 'free-ai-search-audit'
              ? 'Share the business and website you want reviewed. TeeJay confirms the audit scope and next step in writing.'
              : 'Share the business, current systems, and outcome you need. TeeJay reviews every request directly and confirms the next step in writing.';
          }
        }
      }
    }

    if (sourcePage) {
      const attribution = new URLSearchParams();
      ATTRIBUTION_KEYS.forEach(function (key) {
        const value = params.get(key);
        if (value) attribution.set(key, value.slice(0, 120));
      });
      if (attribution.size > 0) {
        sourcePage.value = sourcePage.value.split('?')[0] + '?' + attribution.toString();
      }
    }

    function updateIntakeAction() {
      if (!submitButton || !service || service.tagName !== 'SELECT') return;
      const freeAudit = service.value === 'free-ai-search-audit';
      submitButton.innerHTML = freeAudit
        ? 'Request my free audit <span aria-hidden="true">→</span>'
        : 'Send price request <span aria-hidden="true">→</span>';
    }

    if (service && service.tagName === 'SELECT') {
      updateIntakeAction();
      service.addEventListener('change', updateIntakeAction);
    }

    intakeForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(intakeForm).entries());
      const status = intakeForm.querySelector('[data-form-status]');
      const button = submitButton;
      button.disabled = true;
      if (status) status.textContent = 'Sending your private brief…';
      try {
        const response = await fetch('https://api.teejaystechtools.com/api/intake', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values)
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.reason || 'The brief could not be sent.');
        intakeForm.reset();
        if (status) status.textContent = payload.message || 'Received. TeeJay’s Tech Tools will review the brief and follow up directly.';
        track('generate_lead', { method: 'private_intake', service: values.serviceCode });
      } catch (error) {
        button.disabled = false;
        if (status) status.textContent = error.message + ' You can also call 573-854-1909.';
      }
    });
  }

  const serviceCheckout = document.querySelector('[data-service-checkout]');
  if (serviceCheckout) {
    serviceCheckout.addEventListener('submit', async function (event) {
      event.preventDefault();
      const status = serviceCheckout.querySelector('[data-service-checkout-status]');
      const button = serviceCheckout.querySelector('button[type="submit"]');
      const values = Object.fromEntries(new FormData(serviceCheckout).entries());
      if (!values.email || !values.terms) {
        if (status) status.textContent = 'Enter your email and accept the working-session terms.';
        return;
      }
      button.disabled = true;
      if (status) status.textContent = 'Opening secure Square checkout…';
      try {
        const response = await fetch('https://api.teejaystechtools.com/api/service-checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: values.email, serviceCode: values.serviceCode })
        });
        const payload = await response.json();
        if (!response.ok || !payload.checkoutUrl) throw new Error(payload.reason || 'Checkout is temporarily unavailable.');
        track('begin_checkout', { currency: 'USD', value: 497, items: [{ item_id: values.serviceCode, item_name: 'Profit & Systems Working Session', price: 497, quantity: 1 }] });
        window.location.assign(payload.checkoutUrl);
      } catch (error) {
        button.disabled = false;
        if (status) status.textContent = error.message + ' Call 573-854-1909 for help.';
      }
    });
  }

  const dealerListerCheckout = document.querySelector('[data-dealerlister-checkout]');
  if (dealerListerCheckout) {
    dealerListerCheckout.addEventListener('submit', async function (event) {
      event.preventDefault();
      const status = dealerListerCheckout.querySelector('[data-checkout-status]');
      const button = dealerListerCheckout.querySelector('button[type="submit"]');
      const values = Object.fromEntries(new FormData(dealerListerCheckout).entries());
      if (!values.email || !values.terms) {
        if (status) status.textContent = 'Enter your email and accept the DealerLister terms.';
        return;
      }
      button.disabled = true;
      if (status) status.textContent = 'Opening secure Square checkout…';
      track('begin_checkout', { currency: 'USD', value: 49.95, items: [{ item_id: 'dealerlister-lite', item_name: 'DealerLister Lite', price: 49.95, quantity: 1 }] });
      try {
        const hostedLink = dealerListerCheckout.getAttribute('data-square-payment-link');
        const response = await fetch('https://api.teejaystechtools.com/api/checkout/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: values.email })
        });
        const payload = await response.json();
        if (!response.ok || !payload.checkoutUrl) throw new Error(payload.reason || 'Checkout is temporarily unavailable.');
        window.location.assign(payload.checkoutUrl);
      } catch (error) {
        const hostedLink = dealerListerCheckout.getAttribute('data-square-payment-link');
        if (hostedLink) {
          if (status) status.textContent = 'Opening the Square checkout fallback…';
          window.location.assign(hostedLink);
          return;
        }
        button.disabled = false;
        if (status) status.textContent = error.message + ' Call 573-854-1909 for help.';
      }
    });
  }
})();
