const { chromium } = require("playwright");

async function testPlaywright() {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://e-commerce-website-theta-two-93.vercel.app", { timeout: 30000 });
  console.log("Page title:", await page.title());
  await browser.close();
  console.log("Browser test success!");
}

testPlaywright().catch(async (err) => {
  console.error("Chromium launch error:", err.message);
  // Try with channel: 'msedge' or 'chrome'
  try {
    console.log("Retrying with system Edge/Chrome...");
    const browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage();
    await page.goto("https://e-commerce-website-theta-two-93.vercel.app", { timeout: 30000 });
    console.log("Page title with msedge:", await page.title());
    await browser.close();
    console.log("System Edge launch success!");
  } catch (err2) {
    console.error("System Edge error:", err2.message);
  }
});
