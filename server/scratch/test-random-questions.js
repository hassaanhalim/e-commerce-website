const http = require("http");

function sendChat(message, history = []) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message,
      messages: history,
      preferences: {},
    });
    const req = http.request(
      {
        hostname: "localhost",
        port: 3001,
        path: "/api/v1/shopping-assistant/chat",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          Origin: "http://localhost:5173",
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: raw });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

const RANDOM_QUESTIONS = [
  { id: 1, category: "Off-Topic General", query: "What is the weather like today in Karachi?" },
  { id: 2, category: "Bot Identity / Chit-Chat", query: "Are you a real human or an AI?" },
  { id: 3, category: "Footwear Advice", query: "What is the difference between running shoes and gym training shoes?" },
  { id: 4, category: "Foot Health / Advice", query: "I have flat feet and standing all day hurts, what should I look for?" },
  { id: 5, category: "Brand Opinion", query: "In your opinion, is Nike better than Adidas?" },
  { id: 6, category: "Store Policy / Payment", query: "Do you guys accept Bitcoin or crypto?" },
  { id: 7, category: "Casual Banter", query: "Tell me a fun fact or joke about shoes!" },
  { id: 8, category: "Lifestyle / Occasion", query: "What shoes should I wear to a semi-formal beach dinner?" },
  { id: 9, category: "Emotional Small Talk", query: "I've had such a long and tiring day today." },
  { id: 10, category: "Silly / Unconventional", query: "Can I wear running sneakers with a business suit?" },
];

async function runRandomQuestionsTest() {
  console.log("==================================================");
  console.log("TESTING CHATBOT WITH RANDOM REAL-WORLD QUESTIONS");
  console.log("==================================================");

  const results = [];

  for (const item of RANDOM_QUESTIONS) {
    process.stdout.write(`\n[${item.id}/10] [${item.category}] "${item.query}"\n`);
    const start = Date.now();
    try {
      const res = await sendChat(item.query);
      const latency = Date.now() - start;
      const reply = res.data.message || "(No message)";
      const intent = res.data.preferences?.intent || "N/A";
      const productsCount = res.data.products?.length || 0;

      console.log(`  -> Intent: ${intent} | Products: ${productsCount} | Latency: ${latency}ms`);
      console.log(`  -> Reply: "${reply}"\n`);

      results.push({
        id: item.id,
        category: item.category,
        query: item.query,
        reply,
        intent,
        productsCount,
        latency,
      });
    } catch (err) {
      console.error(`  -> Error: ${err.message}`);
    }
  }

  console.log("\n==================================================");
  console.log("SUMMARY OF RANDOM QUESTION RESPONSES");
  console.log("==================================================");
  console.table(
    results.map((r) => ({
      ID: r.id,
      Category: r.category,
      Query: r.query.length > 30 ? r.query.slice(0, 27) + "..." : r.query,
      Intent: r.intent,
      Reply: r.reply.slice(0, 60) + (r.reply.length > 60 ? "..." : ""),
    }))
  );
}

runRandomQuestionsTest().catch(console.error);
