/**
 * E2E verification for the Supabase realtime channel fixes.
 *
 * Walks the real web preview: onboarding -> sign-up (real Supabase account) ->
 * post-login screens -> reload. Captures console errors / page errors and fails
 * if any realtime channel crash appears, e.g.:
 *   "cannot add `postgres_changes` callbacks for realtime:... after `subscribe()`."
 *
 * Usage:
 *   node scripts/verify-realtime-e2e.js [BASE_URL]
 *   CHROME_PATH=/path/to/chrome node scripts/verify-realtime-e2e.js  # browser override
 *
 * Requires the preview server to be running (freebuff-preview start).
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:8081';
const USER = 'bot_' + Math.random().toString(36).slice(2, 10);
const PASS = 'Passw0rd123';

const CRASH_PATTERNS = [
  /after `subscribe\(\)`/i,
  /cannot add .* callbacks/i,
  /postgres_changes/i,
];

(async () => {
  const launchOptions = {};
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error') logs.push(`[console.error] ${m.text().slice(0, 400)}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 400)}`));
  page.on('response', (r) => {
    if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`);
    if (r.url().includes('supabase.co')) {
      logs.push(`[sb ${r.status()}] ${r.request().method()} ${r.url().replace(/^https:\/\/[a-z0-9]+\.supabase\.co/, '')}`);
    }
  });

  const shot = async (name) => {
    await page.screenshot({ path: `/tmp/shots/${name}.png` });
    const info = await page.evaluate(() => ({
      url: location.href,
      text: (document.body.innerText || '').trim().slice(0, 140),
    }));
    console.log(`--- ${name} --- url=${info.url}\n    text=${JSON.stringify(info.text)}`);
  };

  fs.mkdirSync('/tmp/shots', { recursive: true });
  console.log(`user=${USER}  base=${BASE}`);

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(7000);
  await shot('S1-loaded');

  const skip = page.getByText(/Skip|رد کردن/i).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(800);
    await shot('S2-skipped');
  }

  const create = page.getByText(/Get Started|شروع کن/i).first();
  await create.click();
  await page.waitForTimeout(1200);
  await shot('S3-signup');

  const inputs = page.locator('input:not([type=hidden])');
  const n = await inputs.count();
  console.log('inputs:', n);
  const vals = [USER, 'Bot Tester', PASS, PASS];
  for (let i = 0; i < n && i < vals.length; i++) {
    await inputs.nth(i).click();
    await inputs.nth(i).pressSequentially(vals[i], { delay: 15 });
  }

  // The register Button is a RNW Pressable div labelled exactly tr.auth.register
  // ('ثبت‌نام', with ZWNJ). Exact match avoids the 'قبلاً ثبت‌نام کرده‌ای؟' hint line.
  const reg = page.getByText('ثبت‌نام', { exact: true }).first();
  await reg.click({ timeout: 15000 });
  console.log('submitted signup');
  await page.waitForTimeout(1200);
  const fullText = await page.evaluate(() => (document.body.innerText || '').trim());
  console.log('FULL PAGE TEXT AFTER SUBMIT:\n' + fullText.slice(0, 500));
  for (const [i, w] of [1500, 1500, 2500].entries()) {
    await page.waitForTimeout(w);
    await shot(`S4-after-${i}`);
  }

  // Reload: exercises session persistence + channel re-subscription on boot.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await shot('S5-reloaded');

  console.log('=== ERRORS ===');
  const crashes = logs.filter((l) => CRASH_PATTERNS.some((p) => p.test(l)));
  const other = logs.filter((l) => !CRASH_PATTERNS.some((p) => p.test(l)));
  if (crashes.length === 0) console.log('realtime crashes: NONE');
  for (const l of crashes) console.log('CRASH:', l);
  console.log(`other messages: ${other.length}`);
  for (const l of other.slice(0, 10)) console.log(l);

  await browser.close();
  if (crashes.length > 0) process.exit(1);
  console.log('PASS: no realtime channel crashes');
})().catch((e) => {
  console.error('TEST FAILED:', e.message);
  process.exit(1);
});
