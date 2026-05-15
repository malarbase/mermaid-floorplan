import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://whiteblossom-floorplan.vercel.app/login');
  
  await page.click('button:has-text("Continue with Google")');
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  console.log("Current URL:", currentUrl);
  
  if (currentUrl.includes('accounts.google.com')) {
    const errorText = await page.evaluate(() => {
      const el = document.querySelector('body');
      return el ? el.innerText.substring(0, 1000) : '';
    });
    console.log("PAGE TEXT:", errorText.trim());
  }

  await browser.close();
})();
