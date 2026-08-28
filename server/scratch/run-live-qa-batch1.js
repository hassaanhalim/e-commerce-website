const { chromium } = require("playwright");

const LIVE_SCENARIOS = [
  // Group A: Normal Human Conversation
  { id: 1, group: "A", input: "Assalamualaikum", expected: "Natural greeting response (e.g. Wa Alaikum Assalam), must NOT immediately ask shoe size" },
  { id: 2, group: "A", input: "hello", expected: "Natural greeting, should not immediately force size flow" },
  { id: 3, group: "A", input: "how are you?", expected: "Normal short conversational reply, should not start product retrieval" },
  { id: 4, group: "A", input: "thanks", expected: "Natural polite acknowledgement" },
  { id: 5, group: "A", input: "what can you help me with?", expected: "Explain capabilities (product discovery, recommendations, questions, store policies)" },

  // Group B: Random / Invalid Input
  { id: 6, group: "B", input: "67", expected: "Should not crash or treat as valid shoe size without size question context" },
  { id: 7, group: "B", input: "90", expected: "Should not crash or treat as valid shoe size" },
  { id: 8, group: "B", input: "-1", expected: "Contextual clarification, not crash" },
  { id: 9, group: "B", input: "999999", expected: "Contextual clarification, not crash" },
  { id: 10, group: "B", input: "asdfgh", expected: "Polite clarification of unclear text" },
  { id: 11, group: "B", input: "???", expected: "Helpful query or guidance" },
  { id: 12, group: "B", input: "I don't know", expected: "Helpful consultative question rather than crash" },

  // Group C: Basic Product Discovery
  { id: 13, group: "C", input: "I need running shoes", expected: "Understand running purpose, ask useful missing details or show runners" },
  { id: 14, group: "C", input: "I need formal shoes for office", expected: "Formal / office intent, must not recommend sports/sneakers" },
  { id: 15, group: "C", input: "Show me women's heels", expected: "WOMEN + HEELS, must not return sneakers or men's shoes" },
  { id: 16, group: "C", input: "I need black loafers for men", expected: "MEN + loafers + black" },
  { id: 17, group: "C", input: "I need joggers for university", expected: "Casual / daily / jogger context, not unhandled random text" },

  // Group D: Complex Natural Language
  { id: 18, group: "D", input: "I walk around 10 km every day and my feet get tired, what would you recommend?", expected: "Understand walking + high distance + comfort; 10 must NOT become shoe size" },
  { id: 19, group: "D", input: "I want something I can wear to the office but also casually on weekends", expected: "Understand hybrid / multi-purpose requirement" },
  { id: 20, group: "D", input: "I'm not really sure what kind of shoes would suit me", expected: "Natural consultation with useful discovery questions" },
];

async function runLiveBatch1() {
  console.log("==================================================");
  console.log("PHASE 1: LIVE BLACK-BOX QA - BATCH 1 (PLAYWRIGHT)");
  console.log("Target: https://e-commerce-website-theta-two-93.vercel.app");
  console.log("==================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let latestApiResponse = null;
  page.on("response", async (res) => {
    if (res.url().includes("/shopping-assistant/chat")) {
      try {
        latestApiResponse = await res.json();
      } catch (e) {}
    }
  });

  await page.goto("https://e-commerce-website-theta-two-93.vercel.app", { waitUntil: "networkidle", timeout: 45000 });
  console.log("Page title:", await page.title());

  // Open Chatbot Launcher
  const launcher = page.locator("#shopping-assistant-launcher");
  await launcher.waitFor({ state: "visible", timeout: 15000 });
  await launcher.click();
  await page.waitForTimeout(1000);

  const results = [];

  for (const s of LIVE_SCENARIOS) {
    process.stdout.write(`\n[${s.id}/20] (${s.group}) "${s.input}" ... `);
    const start = Date.now();
    latestApiResponse = null;

    try {
      // Clear previous conversation
      const clearBtn = page.locator('button[title="Clear conversation"], button[aria-label="Clear conversation"]');
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        await page.waitForTimeout(300);
        const confirmBtn = page.locator('button:has-text("Clear"), button:has-text("New Chat")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await page.waitForTimeout(400);
        }
      }

      // Fill textarea and send
      const textarea = page.locator('section#shopping-assistant-panel textarea');
      await textarea.waitFor({ state: "visible", timeout: 10000 });
      await textarea.fill(s.input);
      await textarea.press("Enter");

      // Wait for response or typing indicator
      const typingIndicator = page.locator("section#shopping-assistant-panel .animate-bounce").first();
      try {
        await typingIndicator.waitFor({ state: "visible", timeout: 2000 });
        await typingIndicator.waitFor({ state: "hidden", timeout: 20000 });
      } catch (e) {
        await page.waitForTimeout(2500);
      }

      const latencyMs = Date.now() - start;

      // Extract assistant response from DOM and network
      const messageBubbles = page.locator("section#shopping-assistant-panel .bg-\\[\\#F7F5F1\\]");
      const bubbleCount = await messageBubbles.count();
      let lastText = "";
      if (bubbleCount > 0) {
        lastText = (await messageBubbles.last().innerText()).trim();
      }

      // Check product cards in DOM
      const productCardTitles = page.locator("section#shopping-assistant-panel h4");
      const cardCount = await productCardTitles.count();
      const productNames = [];
      for (let c = 0; c < cardCount; c++) {
        productNames.push(await productCardTitles.nth(c).innerText());
      }

      const apiMsg = latestApiResponse?.message || lastText;
      const apiIntent = latestApiResponse?.preferences?.intent || "UNKNOWN";
      const apiProducts = latestApiResponse?.products?.map((p) => p.name) || productNames;

      console.log(`OK in ${latencyMs}ms | Intent: ${apiIntent} | Products: ${apiProducts.length}`);
      console.log(`   Reply: "${apiMsg.slice(0, 100).replace(/\n/g, " ")}"`);
      if (apiProducts.length > 0) {
        console.log(`   Products: ${apiProducts.join(", ")}`);
      }

      results.push({
        id: s.id,
        group: s.group,
        input: s.input,
        expected: s.expected,
        actualReply: apiMsg,
        intent: apiIntent,
        productsFound: apiProducts.length,
        productNames: apiProducts.join(", "),
        latencyMs,
      });
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({
        id: s.id,
        group: s.group,
        input: s.input,
        expected: s.expected,
        actualReply: "ERROR: " + err.message,
        intent: "ERR",
        productsFound: 0,
        productNames: "None",
        latencyMs: Date.now() - start,
      });
    }
  }

  await browser.close();

  console.log("\n\n==================================================");
  console.log("PHASE 1 LIVE BATCH 1 RESULTS SUMMARY TABLE");
  console.log("==================================================");
  console.table(
    results.map((r) => ({
      ID: r.id,
      Group: r.group,
      Input: r.input.length > 25 ? r.input.slice(0, 22) + "..." : r.input,
      Intent: r.intent,
      Products: r.productsFound,
      Latency: `${r.latencyMs}ms`,
      ReplyPreview: r.actualReply.slice(0, 45).replace(/\n/g, " "),
    }))
  );

  return results;
}

runLiveBatch1().catch(console.error);
