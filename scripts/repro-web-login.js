/**
 * Repros the web white-screen via the LOGIN flow (the post-signup path).
 * welcome -> login -> submit -> observe where the app lands.
 * Captures console errors, page errors, failed requests, and screenshots.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:8081';
const USER = process.env.TEST_USER || 'bot_' + Math.random().toString(36).slice(2, 8);
const PASS = 'Passw0rd123';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') logs.push(`[console.${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${(e.stack || '').slice(0, 2000)}`));
  page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.method()} ${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`);
  });

  const shot = async (name) => {
    await page.screenshot({ path: `/tmp/shots/${name}.png` });
    const info = await page.evaluate(() => ({
      url: location.href,
      text: (document.body.innerText || '').trim().slice(0, 150),
    }));
    console.log(`--- ${name} --- url=${info.url}\n    text=${JSON.stringify(info.text)}`);
  };

  fs.mkdirSync('/tmp/shots', { recursive: true });
  console.log(`user=${USER}`);

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(6500);
  await shot('L1-loaded');

  // Skip onboarding if present
  const skip = page.getByText(/Skip|رد کردن/i).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(1000);
    await shot('L2-skipped');
  }

  // Click "Log in" on welcome
  const loginLink = page.getByText(/^ورود$|^Log ?in$/i).first();
  await loginLink.click();
  console.log('clicked Log in');
  await page.waitForTimeout(1000);
  await shot('L3-login-screen');

  // Fill username + password
  const inputs = page.locator('input:not([type=hidden])');
  const n = await inputs.count();
  console.log('inputs:', n);
  await inputs.nth(0).fill(USER);
  await inputs.nth(1).fill(PASS);
  await shot('L4-filled');

  // Submit — the login button text ("ورود" also appears as link, pick last)
  const btn = page.getByText(/^ورود$|ورود به قبیله|Sign in|Log in/i).last();
  await btn.click();
  console.log('submitted login');
  await page.waitForTimeout(6000);
  await shot('L5-after-submit');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await shot('L6-after-reload');

  console.log('\n=== LOGS ===');
  for (const l of logs) console.log(l);
  await browser.close();
})().catch((e) => {
  console.error('TEST FAILED:', e.message);
  process.exit(1);
});
