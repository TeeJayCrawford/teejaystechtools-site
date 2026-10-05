const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const privacyScript = fs.readFileSync(path.join(__dirname, '..', 'privacy.js'), 'utf8');

function runPrivacy(initialCookie = '', options = {}) {
  const cookies = new Map();
  if (initialCookie) cookies.set('ttt_privacy_choice', initialCookie);
  const elements = {};
  const scripts = [];
  let clickHandler;
  let cookieWriteMode = options.cookieWriteMode || 'allow';
  let reloads = 0;

  function element(className = '') {
    const children = new Map();
    return {
      className,
      hidden: false,
      dataset: {},
      checked: false,
      disabled: false,
      innerHTML: '',
      setAttribute() {},
      addEventListener() {},
      focus() {},
      querySelector(selector) {
        if (!children.has(selector)) children.set(selector, element(selector));
        return children.get(selector);
      }
    };
  }

  const body = element('body');
  body.classList = { add() {}, remove() {} };
  body.appendChild = function (child) {
    elements[child.className] = child;
  };
  body.addEventListener = function (type, callback) {
    if (type === 'click') clickHandler = callback;
  };

  const document = {
    currentScript: { src: 'https://teejaystechtools.com/privacy.js' },
    readyState: 'complete',
    body,
    head: { appendChild(script) { scripts.push(script); } },
    createElement: element,
    addEventListener() {},
    querySelector(selector) {
      if (selector === 'script[data-optional-analytics="true"]') {
        return scripts.find((script) => script.dataset.optionalAnalytics === 'true') || null;
      }
      return null;
    },
    querySelectorAll() { return []; },
    get cookie() {
      return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    set cookie(raw) {
      if (cookieWriteMode === 'throw') throw new Error('Cookies blocked');
      if (cookieWriteMode === 'ignore') return;
      const [pair, ...attributes] = raw.split(';');
      const [name, value] = pair.split('=');
      if (attributes.some((attribute) => /Max-Age=0/i.test(attribute))) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    }
  };
  const window = {
    location: {
      origin: 'https://teejaystechtools.com',
      hostname: 'teejaystechtools.com',
      protocol: 'https:',
      reload() { reloads += 1; }
    }
  };
  vm.runInNewContext(privacyScript, { document, window, navigator: {}, URL, Date });

  return {
    window,
    cookies,
    scripts,
    elements,
    setCookieWriteMode(mode) { cookieWriteMode = mode; },
    reloadCount() { return reloads; },
    action(name) {
      clickHandler({ target: { closest: () => ({ dataset: { privacyAction: name }, focus() {} }) } });
    },
    consentUpdates() {
      return window.dataLayer.filter((entry) => entry[0] === 'consent' && entry[1] === 'update');
    },
    events() {
      return window.dataLayer.filter((entry) => entry[0] === 'event');
    }
  };
}

test('malformed percent-encoded choice does not abort initialization', () => {
  const page = runPrivacy('%E0%A4%A');
  assert.equal(page.elements['privacy-banner'].hidden, false);
  assert.equal(page.elements['privacy-settings-trigger'].hidden, true);
  assert.equal(page.scripts.length, 0);
  assert.equal(page.consentUpdates().at(-1)[2].analytics_storage, 'denied');
  assert.equal(page.window['ga-disable-G-3SJM8C4RF2'], true);
});

for (const mode of ['ignore', 'throw']) {
  test(`blocked cookie ${mode} cannot claim acceptance was saved`, () => {
    const page = runPrivacy('', { cookieWriteMode: mode });
    page.action('accept');
    assert.equal(page.elements['privacy-banner'].hidden, false);
    assert.equal(page.elements['privacy-banner'].querySelector('.privacy-save-error').hidden, false);
    assert.equal(page.elements['privacy-settings-trigger'].hidden, true);
    assert.equal(page.cookies.has('ttt_privacy_choice'), false);
    assert.equal(page.scripts.length, 0);
    assert.equal(page.consentUpdates().at(-1)[2].analytics_storage, 'denied');
    assert.equal(page.window['ga-disable-G-3SJM8C4RF2'], true);
  });
}

test('failed refusal denies measurement for this visit even when an old allow cookie remains', () => {
  const oldChoice = encodeURIComponent(JSON.stringify({
    analytics: true, advertising: false, gpc: false, savedAt: '2026-01-01T00:00:00.000Z', version: 1
  }));
  const page = runPrivacy(oldChoice);
  assert.equal(page.scripts.length, 1);
  page.setCookieWriteMode('ignore');
  page.action('manage');
  page.action('save');
  assert.equal(page.elements['privacy-backdrop'].hidden, false);
  assert.equal(page.elements['privacy-backdrop'].querySelector('.privacy-save-error').hidden, false);
  assert.equal(page.consentUpdates().at(-1)[2].analytics_storage, 'denied');
  assert.equal(page.window['ga-disable-G-3SJM8C4RF2'], true);
  assert.equal(page.window.__tttAnalyticsLoaded, false);
  page.window.TTTAnalytics.track('should_not_emit');
  assert.equal(page.events().length, 0);
  assert.equal(page.reloadCount(), 0);
  assert.equal(page.cookies.get('ttt_privacy_choice'), oldChoice);
  page.action('close');
  page.action('manage');
  assert.equal(page.elements['privacy-backdrop'].querySelector('.privacy-save-error').hidden, false);
  assert.equal(page.elements['privacy-backdrop'].querySelector('#privacy-analytics').checked, false);
});

test('verified cookie write applies acceptance and restores the normal saved UI', () => {
  const page = runPrivacy();
  page.action('accept');
  const stored = JSON.parse(decodeURIComponent(page.cookies.get('ttt_privacy_choice')));
  assert.equal(stored.analytics, true);
  assert.equal(stored.advertising, true);
  assert.equal(page.elements['privacy-banner'].hidden, true);
  assert.equal(page.elements['privacy-settings-trigger'].hidden, false);
  assert.equal(page.scripts.length, 1);
  assert.equal(page.consentUpdates().at(-1)[2].analytics_storage, 'granted');
  assert.equal(page.window['ga-disable-G-3SJM8C4RF2'], false);
});
