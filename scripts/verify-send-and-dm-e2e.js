/**
 * E2E: exercises the two flows the clan reported broken on production:
 *   1. open a room (Clan Chat) and SEND a message
 *   2. open a DM from Members and SEND a message
 * Captures console errors, page errors, failed HTTP, and every Supabase
 * request/response pair so any 4xx from an RLS policy is visible.
 *
 * Usage: node scripts/verify-send-and-dm-e2e.js [BASE_URL]
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:8081';
const USER = 'bot_' + Math.random().toString(36).slice(2, 10);
const PASS = 'Passw0rd123';
const MARK = 'e2e-' + Math.random().toString(36).slice(2, 8);

(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      '/home/daytona/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const logs = [];
  const sbLog = [];
  page.on('console', (m) => {
    if (m.type() === 'error') logs.push(`[console.error] ${m.text().slice(0, 500)}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 500)}`));
  page.on('response', (r) => {
    if (r.url().includes('supabase.co')) {
      const entry = `[sb ${r.status()}] ${r.request().method()} ${r
        .url()
        .replace(/^https:\/\/[a-z0-9]+\.supabase\.co/, '')}`;
      sbLog.push(entry);
      if (r.status() >= 400) logs.push(entry);
    } else if (r.status() >= 400) {
      logs.push(`[http ${r.status()}] ${r.request().method()} ${r.url().slice(0, 120)}`);
    }
  });

  const shot = async (name) => {
    fs.mkdirSync('/tmp/shots', { recursive: true });
    await page.screenshot({ path: `/tmp/shots/${name}.png` });
    const info = await page.evaluate(() => ({
      url: location.href,
      text: (document.body.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 200),
    }));
    console.log(`--- ${name} ---\n    url=${info.url}\n    text=${JSON.stringify(info.text)}`);
    return info;
  };

  console.log(`user=${USER} base=${BASE}`);

  // ---- signup (or login if the account exists) ----
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const skip = page.getByText(/Skip|رد کردن/i).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.waitForTimeout(600);
  await page.getByText(/Get Started|شروع کن/i).first().click();
  await page.waitForTimeout(1200);

  const inputs = page.locator('input:not([type=hidden])');
  const n = await inputs.count();
  const vals = [USER, 'Bot Tester', PASS, PASS];
  for (let i = 0; i < n && i < vals.length; i++) {
    await inputs.nth(i).click();
    await inputs.nth(i).pressSequentially(vals[i], { delay: 10 });
  }
  await page.getByText('ثبت‌نام', { exact: true }).first().click({ timeout: 15000 });
  await page.waitForTimeout(5000);
  await shot('T1-loggedin');

  // if signup bounced (account existed), try login instead
  if (!(await page.locator('text=/گفتگوها|Chats/').first().isVisible().catch(() => false))) {
    console.log('signup did not land on chats — trying login flow');
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const li = page.locator('input:not([type=hidden])');
    const ln = await li.count();
    const lv = [USER, PASS];
    for (let i = 0; i < ln && i < lv.length; i++) {
      await li.nth(i).click();
      await li.nth(i).pressSequentially(lv[i], { delay: 10 });
    }
    await page.getByText('ورود', { exact: true }).first().click({ timeout: 10000 });
    await page.waitForTimeout(5000);
    await shot('T1b-login');
  }

  // ---- FLOW 1: open Clan Chat room and send a message ----
  console.log('\n== FLOW 1: room send ==');
  const clanRow = page.getByText('Clan Chat', { exact: true }).first();
  await clanRow.click({ timeout: 15000 });
  await page.waitForTimeout(4000);
  await shot('T2-room-open');

  // type into composer and send
  const composer = page.locator('input:not([type=hidden]), textarea').last();
  await composer.click();
  await composer.pressSequentially(MARK, { delay: 20 });
  await page.waitForTimeout(300);

  // find a send button (icon) — try common RNW renderings
  const sendBtn = page
    .locator('[aria-label*="send" i], button:has-text("ارسال"), div[role="button"]:has-text("➤"), div[role="button"]:has-text("📨")')
    .first();
  let clickedSend = false;
  if (await sendBtn.isVisible().catch(() => false)) {
    await sendBtn.click();
    clickedSend = true;
  } else {
    await composer.press('Enter');
  }
  console.log('send clicked:', clickedSend ? 'button' : 'Enter key');
  await page.waitForTimeout(3500);
  const afterSend = await shot('T3-room-after-send');

  const sentVisible = afterSend.text.includes(MARK);
  console.log(`MESSAGE VISIBLE IN ROOM: ${sentVisible ? 'YES ✅' : 'NO ❌'}`);
  console.log('sb requests since room open (last 12):');
  for (const l of sbLog.slice(-12)) console.log('   ', l);

  // ---- FLOW 2: open a DM from Members and send ----
  console.log('\n== FLOW 2: dm open + send ==');
  await page.goBack();
  await page.waitForTimeout(1500);
  // tabs: find Members tab
  const membersTab = page.getByText(/اعضا|Members/i).first();
  await membersTab.click({ timeout: 10000 });
  await page.waitForTimeout(3500);
  await shot('T4-members');

  // click first non-self member row (a row containing @)
  const rows = page.locator('div[dir], div').filter({ hasText: /@/ });
  const memberRow = page.getByText(/@/).first();
  await memberRow.click({ timeout: 10000 });
  await page.waitForTimeout(4500);
  const dmOpen = await shot('T5-dm-open');

  // try to type + send in the DM
  const dmComposer = page.locator('input:not([type=hidden]), textarea').last();
  const dmComposerVisible = await dmComposer.isVisible().catch(() => false);
  console.log('dm composer visible:', dmComposerVisible);
  if (dmComposerVisible) {
    await dmComposer.click();
    await dmComposer.pressSequentially(MARK + '-dm', { delay: 20 });
    const dmSendBtn = page
      .locator('[aria-label*="send" i], button:has-text("ارسال"), div[role="button"]:has-text("➤")')
      .first();
    if (await dmSendBtn.isVisible().catch(() => false)) await dmSendBtn.click();
    else await dmComposer.press('Enter');
    await page.waitForTimeout(3500);
    const afterDm = await shot('T6-dm-after-send');
    console.log(`DM MESSAGE VISIBLE: ${afterDm.text.includes(MARK + '-dm') ? 'YES ✅' : 'NO ❌'}`);
  }

  console.log('\n=== ALL ERRORS / FAILED REQUESTS ===');
  if (logs.length === 0) console.log('none');
  for (const l of logs) console.log(l);

  await browser.close();
  console.log('\nDONE');
})().catch((e) => {
  console.error('TEST FAILED:', e.message);
  process.exit(1);
});
