const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3000/slide-create';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1512, height: 904 });
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'C:/Users/Administrator/Documents/AUDE/EduA-system/fe/.slide-create.png', fullPage: false });
  console.log('Screenshot saved');
  await browser.close();
})();
