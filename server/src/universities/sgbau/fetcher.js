const axios = require('axios');
const cheerio = require('cheerio');
const config = require('./config');
const logger = require('../../utils/logger');

class SgbauBlockedError extends Error {
  constructor(reason) {
    super(`SGBAU portal presented an access control we will not bypass: ${reason}`);
    this.name = 'SgbauBlockedError';
    this.reason = reason;
  }
}

const client = axios.create({
  timeout: config.REQUEST_TIMEOUT_MS,
  headers: { 'User-Agent': config.USER_AGENT },
  withCredentials: true,
  validateStatus: (s) => s < 500 // let us inspect 4xx bodies ourselves
});

/**
 * Loads the SGBAU result search page to obtain a fresh CSRF token and any
 * session cookie the portal issues. We do NOT solve or bypass any CAPTCHA —
 * if one is present on this page, we stop and surface SgbauBlockedError so
 * the caller can fall back to the manual-upload flow.
 */
async function loadSearchPage() {
  const res = await client.get(config.RESULT_PAGE_URL);
  const html = res.data;
  const $ = cheerio.load(html);

  const captchaPresent =
    $('[class*="captcha" i]').length > 0 ||
    $('[id*="captcha" i]').length > 0 ||
    /recaptcha|hcaptcha|g-recaptcha/i.test(html);

  if (captchaPresent) {
    throw new SgbauBlockedError('CAPTCHA detected on the search page');
  }

  const csrfToken =
    $('meta[name="csrf-token"]').attr('content') ||
    $('meta[name="meta-csrf-token"]').attr('content') ||
    $('input[name="_token"]').attr('value') ||
    null;

  const setCookie = res.headers['set-cookie'] || [];
  const cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');

  return { csrfToken, cookieHeader, html };
}

/**
 * Submits the result search form. Returns the raw HTML of the results
 * response so the parser module can interpret it. Retries transient network
 * failures with exponential backoff; never retries on 4xx (those indicate a
 * definitive answer or an access-control response, not a transient fault).
 */
async function submitSearch(formFields, session) {
  const body = new URLSearchParams(formFields).toString();

  let lastError;
  for (let attempt = 1; attempt <= config.MAX_RETRIES; attempt += 1) {
    try {
      const res = await client.post(config.SEARCH_ENDPOINT, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: session.cookieHeader || '',
          Referer: config.RESULT_PAGE_URL,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (res.status === 429) {
        throw new SgbauBlockedError('rate limited by the portal (HTTP 429)');
      }
      if (res.status === 403) {
        throw new SgbauBlockedError('access forbidden by the portal (HTTP 403) — likely anti-bot protection');
      }

      let html = '';
      if (res.data && typeof res.data === 'object' && res.data.html) {
        html = res.data.html;
      } else if (typeof res.data === 'string') {
        html = res.data;
      } else {
        html = JSON.stringify(res.data);
      }
      if (/recaptcha|hcaptcha|g-recaptcha|verify you are human/i.test(html)) {
        throw new SgbauBlockedError('CAPTCHA/verification challenge returned with the search response');
      }

      return html;
    } catch (err) {
      if (err instanceof SgbauBlockedError) throw err;
      lastError = err;
      const backoffMs = 500 * 2 ** (attempt - 1);
      logger.warn(`SGBAU search attempt ${attempt}/${config.MAX_RETRIES} failed: ${err.message}. Retrying in ${backoffMs}ms.`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error('SGBAU search failed for an unknown reason.');
}

module.exports = { loadSearchPage, submitSearch, SgbauBlockedError };
