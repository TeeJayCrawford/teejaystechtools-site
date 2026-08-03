(function () {
  const track = function (eventName, parameters) {
    if (window.TTTAnalytics && typeof window.TTTAnalytics.track === 'function') {
      window.TTTAnalytics.track(eventName, parameters);
    }
  };

  const header = document.querySelector('[data-site-header]');
  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.primary-nav');

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
  }

  if (header) {
    const updateHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 18);
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  document.querySelectorAll('[data-current-year]').forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll('[data-track]').forEach(function (node) {
    node.addEventListener('click', function () {
      track('select_content', {
        content_type: 'site_cta',
        item_id: node.getAttribute('data-track')
      });
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
    const params = new URLSearchParams(window.location.search);
    const requestedService = params.get('service');
    if (service && service.tagName === 'SELECT' && requestedService) {
      const matchingOption = Array.from(service.options).find(function (option) {
        return option.value === requestedService;
      });
      if (matchingOption) service.value = requestedService;
    }

    if (sourcePage) {
      const attribution = new URLSearchParams();
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (key) {
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
