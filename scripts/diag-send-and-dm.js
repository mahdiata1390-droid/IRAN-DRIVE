/**
 * Diagnostic probe for the two reported failures:
 *  A. typing + pressing send in a room does nothing
 *  B. opening a DM fails (dm_participants 500)
 *
 * Runs against the local preview by default: node scripts/diag-send-and-dm.js [BASE_URL]
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:8081';
const USER = 'diag_' + Math.random().toString(36).slice(2, 10);
const PASS = 'Passw0rd123';
const MARK = 'diag-' + Math.random().toString(36).slice(2, 8);

(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      '/home/daytona/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const responses = [];
  page.on('response', async (r) => {
    const url = r.url();
    if (url.includes('supabase.co/rest')) {
      let body = '';
      if (r.status() >= 400) {
        try { body = (await r.text()).slice(0, 300); } catch {}
      }
      responses.push(`${r.status()} ${r.request().method()} ${url.split('rest/v1/')[1]?.slice(0, 90)} ${body}`);
    }
  });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)));

  // ---- signup ----
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const skip = page.getByText(/Skip|رد کردن/i).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.getByText(/Get Started|شروع کن/i).first().click();
  await page.waitForTimeout(1200);

  const inputs = page.locator('input:not([type=hidden])');
  const n = await inputs.count();
  const vals = [USER, 'Diag Bot', PASS, PASS];
  for (let i = 0; i < n && i < vals.length; i++) {
    await inputs.nth(i).click();
    await inputs.nth(i).pressSequentially(vals[i], { delay: 10 });
  }
  await page.getByText('ثبت‌نام', { exact: true }).first().click({ timeout: 15000 });
  await page.waitForTimeout(5000);

  // ---- open Clan Chat room ----
  await page.getByText('Clan Chat', { exact: true }).first().click({ timeout: 15000 });
  await page.waitForTimeout(4000);

  // RNW renders a multiline TextInput as a <textarea> — target it directly
  const composer = page.locator('textarea').locator('visible=true').last();
  await composer.waitFor({ state: 'visible', timeout: 10000 });
  await composer.click();
  await composer.pressSequentially(MARK, { delay: 30 });
  await page.waitForTimeout(500);

  // check React state actually updated: input value must equal MARK
  const value = await composer.inputValue().catch(() => '<error>');
  console.log('\ncomposer value after typing:', JSON.stringify(value));

  // The send button appears when text is non-empty (mic swaps to send).
  // RNW renders it as a div with an <svg> inside; find by class-free structure:
  const sendCandidates = await page.evaluate(() => {
    const divs = [...document.querySelectorAll('div')];
    return divs
      .filter((d) => d.querySelector('svg') && d !== d.querySelector('svg').closest('div'))
      .filter((d) => d.style?.borderRadius === '21px' || d.getAttribute('style')?.includes('21px'))
      .map((d) => d.outerHTML.slice(0, 120));
  });
  console.log('send-button candidates:', sendCandidates.length);
  for (const c of sendCandidates.slice(0, 3)) console.log('   ', c);

  // Click the LAST candidate (send/mic button is right-most), then watch for the POST
  const before = responses.length;
  if (sendCandidates.length > 0) {
    const btn = page.locator('div[style*="21px"]').last();
    await btn.click().catch((e) => console.log('click failed', e.message));
  } else {
    await composer.press('Enter');
  }
  await page.waitForTimeout(4000);

  console.log('\n== responses after send attempt ==');
  for (const r of responses.slice(before)) console.log('   ', r);

  const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('\nmessage visible:', text.includes(MARK) ? 'YES ✅' : 'NO ❌');

  // ---- DM flow: call create_dm from the page with real auth, then load dm_participants ----
  console.log('\n== DM probe ==');
  const dmResult = await page.evaluate(async () => {
    const prof = await fetch(`${location.protocol}//hizjqkuacgotbooelitd.supabase.co/rest/v1/profiles?select=id,username&limit=5`, {
      headers: {
        apikey: 'sb_publishable_BZQVa1wpuo80SlWv4pZs1w_vyu5XjQ2',
      },
    });
    // auth token is inside the supabase-js storage key; use supabase client from window instead
    return { status: prof.status };
  });
  console.log('profiles fetch (no auth header):', dmResult);

  // Reproduce exactly what dm/[id].tsx does after create_dm returns:
  // GET dm_participants with the session token. Grab the token from localStorage.
  const storage = await page.evaluate(() => JSON.stringify(Object.keys(localStorage)));
  console.log('localStorage keys:', storage);

  await browser.close();
  console.log('\nDONE');
})().catch((e) => {
  console.error('PROBE FAILED:', e);
  process.exit(1);
});
