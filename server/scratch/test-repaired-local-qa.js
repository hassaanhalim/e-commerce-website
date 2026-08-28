const http = require("http");

function sendChat(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
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

async function runRepairedQATests() {
  console.log("==================================================");
  console.log("RUNNING REPAIRED QA VALIDATION ON LOCAL SERVER (3001)");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  // Test 1: Black loafers for men (Should return Loafers/Moccasins, NOT sports sneakers)
  total++;
  const res1 = await sendChat({ message: "I need black loafers for men", preferences: {} });
  const pNames1 = (res1.data.products || []).map((p) => p.name.toLowerCase());
  const hasOnlyLoafers = pNames1.length > 0 && pNames1.every((n) => n.includes("loafer") || n.includes("moccasin") || n.includes("slip-on"));
  const noSneakers = !pNames1.some((n) => n.includes("air max") || n.includes("ultraboost"));
  if (hasOnlyLoafers && noSneakers) {
    console.log(`[PASS] Test 1: Black loafers for men -> ${res1.data.products.map((p) => p.name).join(", ")}`);
    passed++;
  } else {
    console.error(`[FAIL] Test 1: Black loafers for men -> Products:`, res1.data.products);
  }

  // Test 2: Women's heels (Should return multiple heels)
  total++;
  const res2 = await sendChat({ message: "Show me women's heels", preferences: {} });
  const pNames2 = (res2.data.products || []).map((p) => p.name.toLowerCase());
  const hasHeels = pNames2.length >= 2 && pNames2.some((n) => n.includes("heel") || n.includes("pump") || n.includes("stiletto"));
  if (hasHeels) {
    console.log(`[PASS] Test 2: Women's heels -> Found ${res2.data.products.length} heels: ${res2.data.products.map((p) => p.name).join(", ")}`);
    passed++;
  } else {
    console.error(`[FAIL] Test 2: Women's heels -> Products:`, res2.data.products);
  }

  // Test 3: Standalone number 90 without context (Must NOT claim it is an invalid shoe size)
  total++;
  const res3 = await sendChat({ message: "90", preferences: {} });
  const isNotInvalidSizeError3 = !res3.data.message.toLowerCase().includes("not be a valid shoe size") && !res3.data.message.toLowerCase().includes("uses eu sizes from 36 to 44");
  if (isNotInvalidSizeError3) {
    console.log(`[PASS] Test 3: Input "90" -> Reply: "${res3.data.message.slice(0, 60)}"`);
    passed++;
  } else {
    console.error(`[FAIL] Test 3: Input "90" -> Reply: "${res3.data.message}"`);
  }

  // Test 4: Standalone number 999999 without context (Must NOT claim it is an invalid shoe size)
  total++;
  const res4 = await sendChat({ message: "999999", preferences: {} });
  const isNotInvalidSizeError4 = !res4.data.message.toLowerCase().includes("not be a valid shoe size") && !res4.data.message.toLowerCase().includes("uses eu sizes from 36 to 44");
  if (isNotInvalidSizeError4) {
    console.log(`[PASS] Test 4: Input "999999" -> Reply: "${res4.data.message.slice(0, 60)}"`);
    passed++;
  } else {
    console.error(`[FAIL] Test 4: Input "999999" -> Reply: "${res4.data.message}"`);
  }

  // Test 5: 10 km walking (10 must NOT become shoe size)
  total++;
  const res5 = await sendChat({ message: "I walk around 10 km every day and my feet get tired, what would you recommend?", preferences: {} });
  const sizeNot10 = res5.data.preferences?.size !== 10;
  if (sizeNot10) {
    console.log(`[PASS] Test 5: 10 km walking -> Size is ${res5.data.preferences?.size || "null (correct)"} | Reply: "${res5.data.message.slice(0, 60)}"`);
    passed++;
  } else {
    console.error(`[FAIL] Test 5: 10 km walking -> Size became:`, res5.data.preferences?.size);
  }

  // Test 6: Third-party wearer pronouns ("shoes for my sister")
  total++;
  const res6 = await sendChat({ message: "I need shoes for my sister", preferences: {} });
  const usesSheHer = res6.data.message.toLowerCase().includes("she") || res6.data.message.toLowerCase().includes("her") || res6.data.message.toLowerCase().includes("sister");
  if (usesSheHer) {
    console.log(`[PASS] Test 6: Third-party "for my sister" -> Reply: "${res6.data.message}"`);
    passed++;
  } else {
    console.error(`[FAIL] Test 6: Third-party "for my sister" -> Reply: "${res6.data.message}"`);
  }

  // Test 7: Context switch ("forget that, now I need running shoes for myself")
  total++;
  const res7 = await sendChat({
    message: "Actually forget that, now I need running shoes for myself",
    preferences: {
      wearer: { type: "OTHER", relation: "sister", gender: "WOMEN" },
      gender: "women",
      purpose: "FORMAL",
      style: "heels",
    },
  });
  const switchedToSelf = res7.data.preferences?.wearer?.type === "SELF";
  const purposeIsRunning = res7.data.preferences?.purpose === "RUNNING";
  if (switchedToSelf && purposeIsRunning) {
    console.log(`[PASS] Test 7: Context reset -> Wearer: ${res7.data.preferences?.wearer?.type}, Purpose: ${res7.data.preferences?.purpose}`);
    passed++;
  } else {
    console.error(`[FAIL] Test 7: Context reset -> Preferences:`, res7.data.preferences);
  }

  console.log("==================================================");
  console.log(`SUMMARY: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");
}

runRepairedQATests().catch(console.error);
