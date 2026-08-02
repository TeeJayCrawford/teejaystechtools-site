(function () {
  'use strict';

  const CHOICE_COOKIE = 'ttt_privacy_choice';
  const CHOICE_MAX_AGE = 60 * 60 * 24 * 365;
  const ANALYTICS_ID = 'G-3SJM8C4RF2';
  const scriptUrl = document.currentScript && document.currentScript.src
    ? new URL(document.currentScript.src)
    : new URL('/privacy.js', window.location.origin);
  const privacyUrl = new URL('privacy.html', scriptUrl).href;
  const gpcEnabled = navigator.globalPrivacyControl === true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted'
  });
  window.gtag('set', 'ads_data_redaction', true);
  window.gtag('set', 'url_passthrough', false);

  function readChoice() {
    const entry = document.cookie.split('; ').find(function (item) {
      return item.indexOf(CHOICE_COOKIE + '=') === 0;
    });
    if (!entry) return null;
    const value = decodeURIComponent(entry.split('=').slice(1).join('='));
    return value === 'allow' || value === 'reject' ? value : null;
  }

  function saveChoice(choice) {
    document.cookie = CHOICE_COOKIE + '=' + encodeURIComponent(choice)
      + '; Max-Age=' + CHOICE_MAX_AGE
      + '; Path=/; SameSite=Lax; Secure';
  }

  function effectiveChoice() {
    if (gpcEnabled) return 'reject';
    return readChoice();
  }

  function deleteAnalyticsCookies() {
    const analyticsCookies = document.cookie.split(';').map(function (item) {
      return item.trim().split('=')[0];
    }).filter(function (name) {
      return name === '_ga' || name === '_gid' || name === '_gat' || name.indexOf('_ga_') === 0;
    });
    const rootDomain = window.location.hostname.replace(/^www\./, '');

    analyticsCookies.forEach(function (name) {
      document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure';
      if (rootDomain && rootDomain.indexOf('.') !== -1) {
        document.cookie = name + '=; Max-Age=0; Path=/; Domain=.' + rootDomain + '; SameSite=Lax; Secure';
      }
    });
  }

  function updateGoogleConsent(analyticsAllowed) {
    window.gtag('consent', 'update', {
      analytics_storage: analyticsAllowed ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }

  function loadAnalytics() {
    if (window.__tttAnalyticsLoaded || effectiveChoice() !== 'allow') return;
    window.__tttAnalyticsLoaded = true;
    updateGoogleConsent(true);
    window.gtag('js', new Date());
    window.gtag('config', ANALYTICS_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: CHOICE_MAX_AGE
    });

    const analyticsScript = document.createElement('script');
    analyticsScript.async = true;
    analyticsScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ANALYTICS_ID);
    analyticsScript.dataset.optionalAnalytics = 'true';
    document.head.appendChild(analyticsScript);
  }

  function track(eventName, parameters) {
    if (effectiveChoice() !== 'allow' || !window.__tttAnalyticsLoaded) return;
    window.gtag('event', eventName, parameters || {});
  }

  window.TTTAnalytics = { track: track };

  function buildPrivacyPanel() {
    const panel = document.createElement('section');
    panel.className = 'privacy-panel';
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'privacy-panel-title');
    panel.innerHTML = '<div class="privacy-panel-copy">'
      + '<span class="privacy-kicker">Privacy choices</span>'
      + '<h2 id="privacy-panel-title">Optional analytics are your choice.</h2>'
      + '<p data-privacy-message></p>'
      + '<p class="privacy-detail">We use one necessary cookie to remember your choice for 12 months. Advertising storage and personalization stay off.</p>'
      + '<a class="privacy-policy-link" href="' + privacyUrl + '#notice-at-collection">Read the privacy notice</a>'
      + '</div>'
      + '<div class="privacy-panel-actions" data-privacy-actions></div>';
    document.body.appendChild(panel);
    return panel;
  }

  function privacyButton(label, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'privacy-choice-button';
    button.textContent = label;
    button.dataset.privacyAction = action;
    return button;
  }

  let panel;
  let trigger;

  function hidePanel() {
    if (!panel) return;
    panel.hidden = true;
    document.body.classList.remove('privacy-panel-open');
    if (trigger) trigger.focus({ preventScroll: true });
  }

  function applyChoice(choice) {
    if (choice === 'allow' && gpcEnabled) return;
    const analyticsWasLoaded = Boolean(window.__tttAnalyticsLoaded);
    saveChoice(choice);

    if (choice === 'allow') {
      loadAnalytics();
      hidePanel();
      return;
    }

    updateGoogleConsent(false);
    window.__tttAnalyticsLoaded = false;
    deleteAnalyticsCookies();
    hidePanel();

    // Reload after revocation so an already-loaded Google tag is removed from memory.
    if (analyticsWasLoaded) window.location.reload();
  }

  function showPanel() {
    if (!panel) panel = buildPrivacyPanel();
    const message = panel.querySelector('[data-privacy-message]');
    const actions = panel.querySelector('[data-privacy-actions]');
    actions.replaceChildren();

    if (gpcEnabled) {
      message.textContent = 'Your browser is sending Global Privacy Control. We are honoring it, so Google Analytics is off and cannot be enabled while that signal is active.';
      actions.appendChild(privacyButton('Keep analytics off', 'reject'));
    } else {
      const stored = readChoice();
      message.textContent = stored === 'allow'
        ? 'Analytics is currently allowed. You can turn it off just as easily without changing access to the site.'
        : stored === 'reject'
          ? 'Analytics is currently off. You can leave it off or allow aggregate measurement.'
          : 'Google Analytics stays completely off unless you allow it. Rejecting optional analytics will not change your access to this site.';
      actions.appendChild(privacyButton('Reject optional', 'reject'));
      actions.appendChild(privacyButton('Allow analytics', 'allow'));
    }

    const closeButton = privacyButton('Close', 'close');
    closeButton.classList.add('privacy-close-button');
    actions.appendChild(closeButton);

    panel.hidden = false;
    document.body.classList.add('privacy-panel-open');
    panel.focus({ preventScroll: true });
  }

  function initPrivacyUi() {
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'privacy-settings-trigger';
    trigger.textContent = gpcEnabled ? 'GPC honored · Privacy choices' : 'Do Not Sell or Share / Privacy Choices';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.addEventListener('click', showPanel);
    document.body.appendChild(trigger);

    document.querySelectorAll('[data-privacy-open]').forEach(function (button) {
      button.addEventListener('click', showPanel);
    });

    document.body.addEventListener('click', function (event) {
      const button = event.target.closest('[data-privacy-action]');
      if (!button) return;
      const action = button.dataset.privacyAction;
      if (action === 'close') hidePanel();
      if (action === 'allow' || action === 'reject') applyChoice(action);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel && !panel.hidden) hidePanel();
    });

    if (!readChoice()) showPanel();
  }

  if (effectiveChoice() === 'allow') {
    loadAnalytics();
  } else {
    updateGoogleConsent(false);
    deleteAnalyticsCookies();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPrivacyUi, { once: true });
  } else {
    initPrivacyUi();
  }
})();
