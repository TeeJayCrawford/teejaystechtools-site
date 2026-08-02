(function () {
  const header = document.querySelector('[data-site-header]');
  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.primary-nav');

  if (menuButton && nav) {
    menuButton.addEventListener('click', function () {
      const open = nav.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.lastChild.textContent = open ? ' Close' : ' Menu';
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.lastChild.textContent = ' Menu';
      });
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
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'select_content', {
          content_type: 'site_cta',
          item_id: node.getAttribute('data-track')
        });
      }
    });
  });

  const intakeForm = document.querySelector('[data-intake-form]');
  if (intakeForm) {
    const service = intakeForm.querySelector('[name="serviceCode"]');
    const params = new URLSearchParams(window.location.search);
    const requestedService = params.get('service');
    if (service && requestedService) {
      const matchingOption = Array.from(service.options).find(function (option) {
        return option.value === requestedService;
      });
      if (matchingOption) service.value = requestedService;
    }

    intakeForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(intakeForm).entries());
      const status = intakeForm.querySelector('[data-form-status]');
      const button = intakeForm.querySelector('button[type="submit"]');
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
        if (status) status.textContent = 'Received. TeeJay’s Tech Tools will review the brief and follow up directly.';
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'generate_lead', { method: 'private_intake', service: values.serviceCode });
        }
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
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'begin_checkout', { currency: 'USD', value: 497, items: [{ item_id: values.serviceCode, item_name: 'Profit & Systems Working Session', price: 497, quantity: 1 }] });
        }
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
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'begin_checkout', { currency: 'USD', value: 49.95, items: [{ item_id: 'dealerlister-lite', item_name: 'DealerLister Lite', price: 49.95, quantity: 1 }] });
      }
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
