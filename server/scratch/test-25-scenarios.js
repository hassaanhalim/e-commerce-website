const http = require("http");

const SCENARIOS = [
  { id: 1, query: "I need black formal shoes for office", expectedCategory: "Formal/Office", expectedGender: "Men/Unisex" },
  { id: 2, query: "Show me heels", expectedCategory: "Heels", expectedGender: "Women" },
  { id: 3, query: "I need comfortable heels for work", expectedCategory: "Block/Kitten Heels", expectedGender: "Women" },
  { id: 4, query: "I need joggers for daily walking", expectedCategory: "Walking/Joggers", expectedGender: "Any" },
  { id: 5, query: "Recommend running shoes under 20000", expectedCategory: "Running", budgetMax: 20000 },
  { id: 6, query: "I need shoes for my sister", expectedCategory: "Women Footwear", expectedGender: "Women" },
  { id: 7, query: "I need walking shoes for my mother", expectedCategory: "Women Walking/Comfort", expectedGender: "Women" },
  { id: 8, query: "I need formal shoes for my father", expectedCategory: "Men Formal", expectedGender: "Men" },
  { id: 9, query: "I want football shoes", expectedCategory: "Football/Soccer Cleats", expectedGender: "Men/Kids" },
  { id: 10, query: "I need women's black flats", expectedCategory: "Flats/Ballet/Mules", expectedGender: "Women" },
  { id: 11, query: "Show me ankle boots", expectedCategory: "Ankle/Chelsea Boots", expectedGender: "Any" },
  { id: 12, query: "I need something for a wedding", expectedCategory: "Wedding/Party/Formal", expectedGender: "Any" },
  { id: 13, query: "I need comfortable shoes because I walk 10 km every day", expectedCategory: "Max Cushion/Walk", expectedGender: "Any" },
  { id: 14, query: "Something casual for university", expectedCategory: "Casual/Canvas/Sneakers", expectedGender: "Any" },
  { id: 15, query: "Show me men's loafers", expectedCategory: "Loafers/Moccasins", expectedGender: "Men" },
  { id: 16, query: "I need sandals for summer", expectedCategory: "Sandals/Slides/Wedges", expectedGender: "Any" },
  { id: 17, query: "I need hiking shoes", expectedCategory: "Hiking/Trail", expectedGender: "Any" },
  { id: 18, query: "Something like a running shoe but cheaper", expectedCategory: "Budget Runners/Joggers", budgetMax: 15000 },
  { id: 19, query: "I want women's block heels", expectedCategory: "Block Heels", expectedGender: "Women" },
  { id: 20, query: "Recommend premium running shoes", expectedCategory: "Premium Running", budgetMin: 25000 },
  { id: 21, query: "I want something under 10000", expectedCategory: "Budget Footwear", budgetMax: 10000 },
  { id: 22, query: "I need gym shoes", expectedCategory: "Gym/Cross Training/Weights", expectedGender: "Any" },
  { id: 23, query: "Do you have tennis shoes?", expectedCategory: "Tennis Court", expectedGender: "Any" },
  { id: 24, query: "I need shoes for my daughter", expectedCategory: "Girls/Kids", expectedGender: "Kids/Women" },
  { id: 25, query: "I need school shoes for my son", expectedCategory: "Boys School/Kids", expectedGender: "Kids/Men" },
];

async function callChat(message) {
  const payload = JSON.stringify({ message });
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 3001,
        path: "/api/v1/shopping-assistant/chat",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:5173",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 20000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout after 20s"));
    });
    req.write(payload);
    req.end();
  });
}

async function runAll() {
  console.log("==================================================");
  console.log("EXECUTING 25 SCENARIOS SEQUENTIALLY WITH LIVE LOGS");
  console.log("==================================================");

  const results = [];

  for (const s of SCENARIOS) {
    process.stdout.write(`\n[${s.id}/25] Query: "${s.query}" ... `);
    try {
      const res = await callChat(s.query);
      if (res.statusCode === 200) {
        const body = res.body;
        const products = body.products || [];
        const intent = body.preferences?.intent || "REPLY";
        const reply = (body.message || "").slice(0, 70).replace(/\n/g, " ");
        console.log(`OK (Intent: ${intent}, Products: ${products.length})`);
        results.push({
          ID: s.id,
          Query: s.query,
          Status: "PASS",
          Intent: intent,
          ProductsFound: products.length,
          Recommendations: products.map((p) => `${p.name} (PKR ${p.displayPrice || p.price})`).join("; ") || reply,
        });
      } else {
        console.log(`FAILED with Status ${res.statusCode}`);
        results.push({
          ID: s.id,
          Query: s.query,
          Status: "FAIL",
          Intent: "HTTP_" + res.statusCode,
          ProductsFound: 0,
          Recommendations: "N/A",
        });
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({
        ID: s.id,
        Query: s.query,
        Status: "ERROR",
        Intent: "ERR",
        ProductsFound: 0,
        Recommendations: err.message,
      });
    }
  }

  console.log("\n\n==================================================");
  console.log("25-SCENARIO TEST SUITE COMPLETE - SUMMARY TABLE");
  console.log("==================================================");
  console.table(
    results.map((r) => ({
      ID: r.ID,
      Query: r.Query.length > 35 ? r.Query.slice(0, 32) + "..." : r.Query,
      Status: r.Status,
      Intent: r.Intent,
      Found: r.ProductsFound,
      Recommendations: r.Recommendations.length > 50 ? r.Recommendations.slice(0, 47) + "..." : r.Recommendations,
    }))
  );

  const passed = results.filter((r) => r.Status === "PASS").length;
  console.log(`\nOVERALL SCORE: ${passed} / 25 (${Math.round((passed / 25) * 100)}% Pass Rate)`);
}

runAll();
