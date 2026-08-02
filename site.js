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

  const leadForm = document.querySelector('[data-lead-form]');
  if (leadForm) {
    const service = leadForm.querySelector('[name="service"]');
    const params = new URLSearchParams(window.location.search);
    const requestedService = params.get('service');
    if (service && requestedService) {
      const matchingOption = Array.from(service.options).find(function (option) {
        return option.value === requestedService;
      });
      if (matchingOption) service.value = requestedService;
    }

    leadForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(leadForm).entries());
      const subject = 'Fit check: ' + (values.business || values.name || 'new inquiry') + ' — ' + values.service;
      const body = [
        'Name: ' + values.name,
        'Business: ' + (values.business || 'Not provided'),
        'Role: ' + (values.role || 'Not provided'),
        'Email: ' + values.email,
        'Phone: ' + (values.phone || 'Not provided'),
        'Website: ' + (values.website || 'Not provided'),
        'Rooftops / locations: ' + (values.locations || 'Not provided'),
        'Requested starting point: ' + values.service,
        'Timeline: ' + values.timeline,
        '',
        'Problem to solve:',
        values.problem
      ].join('\n');

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          method: 'mailto_brief',
          service: values.service
        });
      }

      const status = leadForm.querySelector('[data-form-status]');
      if (status) status.textContent = 'Opening your email app with the brief filled in…';
      window.location.href = 'mailto:teejaycrawford@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }
})();
