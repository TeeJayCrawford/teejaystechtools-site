(function () {
  'use strict';

  const CHOICE_COOKIE = 'ttt_privacy_choice';
  const CHOICE_MAX_AGE = 60 * 60 * 24 * 365;
  const ANALYTICS_ID = 'G-3SJM8C4RF2';
  const scriptUrl = document.currentScript && document.currentScript.src
    ? new URL(document.currentScript.src)
    : new URL('/privacy.js', window.location.origin);
  const privacyUrl = new URL('privacy.html', scriptUrl).href;
  const assetUrl = function (filename) {
    return new URL('assets/' + filename, scriptUrl).href;
  };
  const gpcEnabled = navigator.globalPrivacyControl === true;
  const deniedPreferences = { analytics: false, advertising: false };

  let analyticsLoaded = false;
  let banner;
  let backdrop;
  let trigger;
  let closeButton;
  let analyticsInput;
  let advertisingInput;
  let draft = { analytics: false, advertising: false };
  let lastPrivacyControl;

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
    personalization_storage: 'denied',
    security_storage: 'granted'
  });
  window.gtag('set', 'ads_data_redaction', true);
  window.gtag('set', 'url_passthrough', false);

  function privacyCookieDomain() {
    const hostname = window.location.hostname.toLowerCase();
    return hostname === 'teejaystechtools.com' || hostname.endsWith('.teejaystechtools.com')
      ? '; Domain=.teejaystechtools.com'
      : '';
  }

  function readPreferences() {
    const encoded = document.cookie.split(';').map(function (entry) {
      return entry.trim();
    }).find(function (entry) {
      return entry.indexOf(CHOICE_COOKIE + '=') === 0;
    });
    if (!encoded) return null;

    const value = decodeURIComponent(encoded.slice(CHOICE_COOKIE.length + 1));
    if (value === 'allow' || value === 'reject') {
      return {
        analytics: value === 'allow',
        advertising: false,
        gpc: false,
        savedAt: '',
        version: 1
      };
    }

    try {
      const parsed = JSON.parse(value);
      if (
        parsed.version !== 1
        || typeof parsed.analytics !== 'boolean'
        || typeof parsed.advertising !== 'boolean'
        || typeof parsed.gpc !== 'boolean'
        || typeof parsed.savedAt !== 'string'
      ) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writePreferences(preferences) {
    const value = encodeURIComponent(JSON.stringify({
      analytics: preferences.analytics,
      advertising: preferences.advertising,
      gpc: gpcEnabled,
      savedAt: new Date().toISOString(),
      version: 1
    }));
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';

    // Remove a legacy host-only cookie before writing the shared apex/www cookie.
    document.cookie = CHOICE_COOKIE + '=; Max-Age=0; Path=/; SameSite=Lax' + secure;
    document.cookie = CHOICE_COOKIE + '=' + value
      + '; Max-Age=' + CHOICE_MAX_AGE
      + '; Path=/; SameSite=Lax'
      + privacyCookieDomain()
      + secure;
  }

  function deleteOptionalGoogleCookies() {
    const names = document.cookie.split(';').map(function (entry) {
      return entry.trim().split('=')[0];
    }).filter(function (name) {
      return /^_(?:ga|gid|gat|gac_|gcl_)/i.test(name);
    });
    const hostname = window.location.hostname.toLowerCase();
    const domains = ['', hostname];
    if (hostname === 'teejaystechtools.com' || hostname.endsWith('.teejaystechtools.com')) {
      domains.push('.teejaystechtools.com');
    }

    names.forEach(function (name) {
      domains.forEach(function (domain) {
        document.cookie = name + '=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/'
          + (domain ? '; Domain=' + domain : '') + '; SameSite=Lax';
      });
    });
  }

  function effectivePreferences(requested) {
    return {
      analytics: Boolean(requested.analytics),
      advertising: Boolean(requested.advertising) && !gpcEnabled
    };
  }

  function updateGoogleConsent(preferences) {
    window.gtag('consent', 'update', {
      analytics_storage: preferences.analytics ? 'granted' : 'denied',
      ad_storage: preferences.advertising ? 'granted' : 'denied',
      ad_user_data: preferences.advertising ? 'granted' : 'denied',
      ad_personalization: preferences.advertising ? 'granted' : 'denied',
      functionality_storage: 'granted',
      personalization_storage: 'denied',
      security_storage: 'granted'
    });
  }

  function loadAnalytics() {
    if (analyticsLoaded || document.querySelector('script[data-optional-analytics="true"]')) return;
    analyticsLoaded = true;
    window.__tttAnalyticsLoaded = true;
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

  function applyPreferences(requested) {
    const effective = effectivePreferences(requested);
    updateGoogleConsent(effective);
    if (effective.analytics) {
      loadAnalytics();
    } else {
      window.__tttAnalyticsLoaded = false;
      deleteOptionalGoogleCookies();
    }
    return effective;
  }

  function track(eventName, parameters) {
    const stored = readPreferences();
    if (!stored || !stored.analytics || !window.__tttAnalyticsLoaded) return;
    window.gtag('event', eventName, parameters || {});
  }

  window.TTTAnalytics = { track: track };

  function icon(filename, className) {
    return '<img alt="" aria-hidden="true" class="' + className + '" src="'
      + assetUrl(filename) + '" />';
  }

  function buildBanner() {
    const section = document.createElement('section');
    section.className = 'privacy-banner';
    section.hidden = true;
    section.setAttribute('aria-label', 'Privacy choices');
    section.innerHTML = '<div class="privacy-banner-icon">'
      + icon('privacy-shield-check.svg', 'privacy-icon')
      + '</div><div class="privacy-banner-copy">'
      + '<span class="privacy-kicker">YOUR PRIVACY, YOUR CHOICE</span>'
      + '<h2>Choose how TeeJay\'s Tech Tools uses cookies.</h2>'
      + '<p>Essential cookies keep the site secure and remember your choice. Analytics and advertising stay off unless you allow them. Square scheduling and checkout load only when you choose those services. Read our <a href="'
      + privacyUrl + '#website-analytics">Cookie &amp; Privacy Policy</a>.</p>'
      + (gpcEnabled
        ? '<strong class="privacy-gpc-notice">' + icon('privacy-shield-check.svg', 'privacy-inline-icon') + 'Global Privacy Control detected and honored. Advertising remains off.</strong>'
        : '')
      + '</div><div class="privacy-banner-actions">'
      + '<button data-privacy-action="accept" type="button">' + (gpcEnabled ? 'Allow analytics' : 'Accept all') + '</button>'
      + '<button data-privacy-action="reject" type="button">Reject non-essential</button>'
      + '<button class="privacy-manage-button" data-privacy-action="manage" type="button">Manage choices '
      + icon('privacy-chevron-right.svg', 'privacy-chevron-icon') + '</button>'
      + '</div>';
    document.body.appendChild(section);
    return section;
  }

  function preferenceRow(id, label, description, options) {
    return '<label class="privacy-preference-row" for="' + id + '"><span><strong>' + label
      + '</strong><small>' + description + '</small></span><input id="' + id + '" type="checkbox"'
      + (options.checked ? ' checked' : '') + (options.disabled ? ' disabled' : '')
      + ' /><i aria-hidden="true"></i></label>';
  }

  function buildPreferencesDialog() {
    const layer = document.createElement('div');
    layer.className = 'privacy-backdrop';
    layer.hidden = true;
    layer.innerHTML = '<section aria-describedby="privacy-dialog-description" aria-labelledby="privacy-dialog-title" aria-modal="true" class="privacy-dialog" role="dialog">'
      + '<header><div><span class="privacy-kicker">PRIVACY PREFERENCES</span><h2 id="privacy-dialog-title">Control optional cookies</h2></div>'
      + '<button aria-label="Close privacy choices" class="privacy-dialog-close" data-privacy-action="close" type="button">'
      + icon('privacy-close.svg', 'privacy-close-icon') + '</button></header>'
      + '<p class="privacy-dialog-intro" id="privacy-dialog-description">Turning a category off updates Google Consent Mode immediately and removes first-party Google measurement cookies that this site can access. Essential security and preference storage cannot be disabled.</p>'
      + (gpcEnabled
        ? '<div class="privacy-gpc-card" role="status">' + icon('privacy-shield-check.svg', 'privacy-card-icon') + '<span><strong>Global Privacy Control is active.</strong>We are treating it as a request to opt out of sale, sharing, profiling, and advertising cookies.</span></div>'
        : '')
      + '<div class="privacy-preference-list">'
      + preferenceRow('privacy-essential', 'Essential', 'Required for site security and remembering this privacy choice.', { checked: true, disabled: true })
      + preferenceRow('privacy-service-tools', 'Booking &amp; payment tools', 'Square scheduling and checkout load only on pages where you request those services. Square\'s provider notices and controls also apply.', { checked: true, disabled: true })
      + preferenceRow('privacy-analytics', 'Analytics', 'Helps us understand page and site interactions in aggregate through GA4. No form fields or customer contact details are sent.', { checked: false, disabled: false })
      + preferenceRow('privacy-advertising', 'Advertising', 'Reserved for future advertising measurement. No advertising pixels are active in this release.', { checked: false, disabled: gpcEnabled })
      + '</div><footer><div><a href="' + privacyUrl + '">Privacy Policy</a><a href="' + privacyUrl + '#notice-at-collection">Notice at Collection</a></div>'
      + '<button data-privacy-action="save" type="button">Save choices</button></footer></section>';
    document.body.appendChild(layer);
    return layer;
  }

  function buildTrigger() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'privacy-settings-trigger';
    button.setAttribute('aria-label', 'Open privacy choices');
    button.innerHTML = icon('privacy-cookie.svg', 'privacy-cookie-icon') + '<span>Privacy choices</span>';
    button.addEventListener('click', function () {
      lastPrivacyControl = button;
      openPreferences();
    });
    document.body.appendChild(button);
    return button;
  }

  function showBanner() {
    banner.hidden = false;
    trigger.hidden = true;
  }

  function showTrigger() {
    banner.hidden = true;
    trigger.hidden = false;
  }

  function renderDraft() {
    analyticsInput.checked = Boolean(draft.analytics);
    advertisingInput.checked = Boolean(draft.advertising) && !gpcEnabled;
    advertisingInput.disabled = gpcEnabled;
  }

  function openPreferences() {
    const stored = readPreferences();
    draft = stored
      ? { analytics: stored.analytics, advertising: stored.advertising && !gpcEnabled }
      : { analytics: false, advertising: false };
    renderDraft();
    backdrop.hidden = false;
    document.body.classList.add('privacy-modal-open');
    closeButton.focus({ preventScroll: true });
  }

  function closePreferences() {
    backdrop.hidden = true;
    document.body.classList.remove('privacy-modal-open');
    if (lastPrivacyControl) lastPrivacyControl.focus({ preventScroll: true });
  }

  function save(requested) {
    const analyticsWasLoaded = analyticsLoaded || Boolean(document.querySelector('script[data-optional-analytics="true"]'));
    const effective = applyPreferences(requested);
    writePreferences(effective);
    draft = effective;
    closePreferences();
    showTrigger();

    // Reload after revocation so an already-loaded Google tag is removed from memory.
    if (analyticsWasLoaded && !effective.analytics) window.location.reload();
  }

  function handleAction(action, control) {
    if (action === 'accept') {
      save({ analytics: true, advertising: !gpcEnabled });
    } else if (action === 'reject') {
      save(deniedPreferences);
    } else if (action === 'manage') {
      lastPrivacyControl = control;
      openPreferences();
    } else if (action === 'close') {
      closePreferences();
    } else if (action === 'save') {
      save({ analytics: analyticsInput.checked, advertising: advertisingInput.checked });
    }
  }

  function initPrivacyUi() {
    banner = buildBanner();
    backdrop = buildPreferencesDialog();
    trigger = buildTrigger();
    closeButton = backdrop.querySelector('.privacy-dialog-close');
    analyticsInput = backdrop.querySelector('#privacy-analytics');
    advertisingInput = backdrop.querySelector('#privacy-advertising');

    analyticsInput.addEventListener('change', function () {
      draft.analytics = analyticsInput.checked;
    });
    advertisingInput.addEventListener('change', function () {
      draft.advertising = advertisingInput.checked && !gpcEnabled;
    });

    document.querySelectorAll('[data-privacy-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        lastPrivacyControl = button;
        openPreferences();
      });
    });

    document.body.addEventListener('click', function (event) {
      const control = event.target.closest('[data-privacy-action]');
      if (!control) return;
      handleAction(control.dataset.privacyAction, control);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && backdrop && !backdrop.hidden) closePreferences();
    });

    const stored = readPreferences();
    if (stored) {
      const effective = applyPreferences(stored);
      if (gpcEnabled && stored.advertising) writePreferences(effective);
      showTrigger();
    } else {
      applyPreferences(deniedPreferences);
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPrivacyUi, { once: true });
  } else {
    initPrivacyUi();
  }
})();
