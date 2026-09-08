/**
 * Capture desktop LinkedIn showcase screenshots for Cukuraja.
 * Viewport: 1440x900 — full browser chrome viewport, not element crops.
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.SHOT_BASE || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'docs', 'linkedin');
const VW = 1440;
const VH = 900;

async function hideChrome(page, { keepDemo = false } = {}) {
  await page.addStyleTag({
    content: `
      [data-nextjs-toast], [data-nextjs-dev-overlay], nextjs-portal,
      #__next-build-watcher, [data-sonner-toaster] { display: none !important; }
      ${keepDemo ? '' : '[aria-label*="akun uji coba"], [aria-label*="akun demo"], [aria-label*="Tutup akun"] { display: none !important; }'}
    `,
  });
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.waitForTimeout(600);
  await page.screenshot({ path: file, fullPage: false, type: 'png' });
  const stat = fs.statSync(file);
  console.log(`ok ${name} (${stat.size} bytes)`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 01 Hero
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await hideChrome(page);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, 'linkedin-01-hero.png');

  // 02 Layanan — scroll past sticky hero remnant
  await page.evaluate(() => {
    const el = document.getElementById('layanan');
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo(0, Math.max(0, y));
  });
  await shot(page, 'linkedin-02-layanan.png');

  // 03 Login
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await hideChrome(page, { keepDemo: true });
  await shot(page, 'linkedin-03-login.png');

  // 04 Demo shield open
  const shield = page.getByRole('button', { name: /akun uji coba|akun demo/i });
  if (await shield.count()) {
    await shield.first().click();
    await page.waitForTimeout(500);
  }
  await shot(page, 'linkedin-04-demo-shield.png');

  // Login as owner for dashboard shots
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await hideChrome(page);
  await page.fill('#email', 'owner@gmail.com');
  await page.fill('#password', 'owner123');
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  // dismiss success dialog if any
  const okBtn = page.getByRole('button', { name: /dashboard|OK|Lanjut/i });
  if (await okBtn.count()) {
    try {
      await okBtn.first().click({ timeout: 3000 });
    } catch {}
  }
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/dashboard/bookings`, { waitUntil: 'networkidle' });
  await hideChrome(page);
  await page.waitForTimeout(800);

  // Seed a few walk-ins so dashboard/antrean look lively for LinkedIn
  async function addWalkIn(name, timeLabel) {
    const walkInBtn = page.getByRole('button', { name: /Walk-in/i });
    if (!(await walkInBtn.count())) return false;
    await walkInBtn.first().click();
    await page.waitForTimeout(500);
    await page.getByLabel(/Nama pelanggan/i).fill(name);
    await page.getByLabel(/WhatsApp/i).fill('081234567890');
    // pick first available (non-disabled) time slot matching label if possible
    const slot = page.getByRole('button', { name: timeLabel });
    if (await slot.count()) {
      const disabled = await slot.first().isDisabled().catch(() => false);
      if (!disabled) await slot.first().click();
      else {
        const any = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
        const n = await any.count();
        for (let i = 0; i < n; i++) {
          const b = any.nth(i);
          if (!(await b.isDisabled())) {
            await b.click();
            break;
          }
        }
      }
    }
    await page.getByRole('button', { name: /Tambah ke antrean/i }).click();
    await page.waitForTimeout(1200);
    return true;
  }

  await addWalkIn('Andi Wijaya', '14:00');
  await addWalkIn('Budi Santoso', '15:00');
  await addWalkIn('Rizki Pratama', '16:00');

  await page.goto(`${BASE}/dashboard/overview`, { waitUntil: 'networkidle' });
  await hideChrome(page);
  await page.waitForTimeout(1000);
  await shot(page, 'linkedin-05-dashboard-overview.png');

  // 06 Antrean
  await page.goto(`${BASE}/dashboard/bookings`, { waitUntil: 'networkidle' });
  await hideChrome(page);
  await page.waitForTimeout(1000);
  await shot(page, 'linkedin-06-antrean.png');

  // 08 Walk-in modal (before leaving bookings)
  const walkIn = page.getByRole('button', { name: /Walk-in/i });
  if (await walkIn.count()) {
    await walkIn.first().click();
    await page.waitForTimeout(700);
    await shot(page, 'linkedin-08-walkin-modal.png');
    await page.keyboard.press('Escape');
  } else {
    console.log('skip walkin modal — button not found');
  }

  // 07 Toko publik
  await page.goto(`${BASE}/cukuraja`, { waitUntil: 'networkidle' });
  await hideChrome(page);
  await page.waitForTimeout(800);
  await shot(page, 'linkedin-07-toko-publik.png');

  await browser.close();
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
