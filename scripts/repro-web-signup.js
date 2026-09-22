/**
 * Repros the web white-screen: creates a REAL account through the sign-up form,
 * then follows the exact post-signup path. Captures errors + screenshots.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:8081';
const USER = 'bot_' + Math.random().toString(36).slice(2, 10);
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
    if (r.url().includes('supabase.co')) {
      logs.push(`[supabase ${r.status()}] ${r.request().method()} ${r.url().replace('https://hizjqkuacgotbooelitd.supabase.co', '')}`);
    }
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
  await shot('S1-loaded');

  // Skip onboarding if present
  const skip = page.getByText(/Skip|رد کردن/i).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(1000);
    await shot('S2-skipped');
  }

  // Welcome -> "Get Started" (links to sign-up)
  const create = page.getByText(/Get Started|شروع کن/i).first();
  await create.click();
  console.log('clicked Create account');
  await page.waitForTimeout(1000);
  await shot('S3-signup-screen');

  // Fill the four inputs: username, display name, password, confirm
  const inputs = page.locator('input:not([type=hidden])');
  const n = await inputs.count();
  console.log('inputs:', n);
  const vals = [USER, 'Bot Tester', PASS, PASS];
  for (let i = 0; i < n && i < vals.length; i++) {
    await inputs.nth(i).fill(vals[i]);
  }
  await shot('S4-filled');

  // Submit — click the leaf div carrying the exact register label.
  // (The "haveOne" line contains ثبت‌نام too, so anchor on exact text.)
  const candidates = page.getByText(/^(ثبت\u200dنام|Register|Sign Up)$/i);
  const cn = await candidates.count();
  console.log('candidates:', cn);
  for (let i = 0; i < Math.min(cn, 6); i++) {
    console.log(`  [${i}] <${await candidates.nth(i).evaluate((el) => el.tagName.toLowerCase())}> ${JSON.stringify(await candidates.nth(i).innerText())}`);
  }
  if (cn === 0) throw new Error('register button not found');
  await candidates.last().click();
  console.log('submitted signup');
  for (const [i, wait] of [1500, 1500, 2000, 2500].entries()) {
    await page.waitForTimeout(wait);
    await shot(`S5-after-submit-${i}`);
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await shot('S6-after-reload');

  const cookies = await page.context().cookies();
  console.log('cookies:', cookies.map((c) => c.name).join(', ') || 'NONE');

  console.log('\n=== LOGS ===');
  for (const l of logs) console.log(l);
  await browser.close();
})().catch((e) => {
  console.error('TEST FAILED:', e.message);
  process.exit(1);
});
