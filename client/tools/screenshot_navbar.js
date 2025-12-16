/* eslint-env node */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5173');
  await page.screenshot({ path: 'navbar-desktop.png', fullPage: false });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: 'navbar-mobile.png', fullPage: false });
  await browser.close();
  console.log('Saved navbar-desktop.png and navbar-mobile.png');
})();

// To install Playwright and its dependencies, run the following commands:
// cd client
// npm i -D playwright
// npx playwright install
