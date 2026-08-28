const http = require("http");

function sendChat(message, history = [], preferences = {}, pendingQuestion = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message,
      messages: history,
      preferences,
      pendingQuestion,
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

async function testUserCasualSequence() {
  console.log("==================================================");
  console.log("TESTING USER'S EXACT CONVERSATION SEQUENCE");
  console.log("('hii' -> 'hry' -> 'k' -> 'ok')");
  console.log("==================================================");

  let history = [];
  let preferences = {};
  let pendingQuestion = null;

  const sequence = ["hii", "hry", "k", "ok"];

  for (let i = 0; i < sequence.length; i++) {
    const input = sequence[i];
    console.log(`\n--- Turn ${i + 1}: User says "${input}" ---`);

    const res = await sendChat(input, history, preferences, pendingQuestion);
    const reply = res.data.message || "(No reply)";
    const products = res.data.products || [];
    preferences = res.data.preferences || {};
    pendingQuestion = res.data.pendingQuestion || null;

    console.log(`Assistant Reply: "${reply}"`);
    console.log(`Products returned: ${products.length} ${products.length > 0 ? `(${products.map((p) => p.name).join(", ")})` : ""}`);
    console.log(`Pending Question:`, pendingQuestion);

    // Assertions
    if (products.length > 0) {
      console.error(`❌ CRITICAL FAILURE: Products were dumped unexpectedly on casual input "${input}"!`);
      process.exit(1);
    }
    if (pendingQuestion?.field === "SIZE") {
      console.error(`❌ CRITICAL FAILURE: Pending question unexpectedly set to SIZE on casual input "${input}"!`);
      process.exit(1);
    }

    history.push({ role: "user", content: input });
    history.push({ role: "assistant", content: reply });
  }

  console.log("\n==================================================");
  console.log("✅ ALL TURNS PASSED! NO PREMATURE PRODUCT DUMPS!");
  console.log("==================================================");
}

testUserCasualSequence().catch((err) => {
  console.error(err);
  process.exit(1);
});
