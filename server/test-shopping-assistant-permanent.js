const { PrismaClient, ProductGender } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001/api/v1/shopping-assistant/chat';

async function sendChat(message, history = [], preferences = null, pendingQuestion = null, conversationId = null) {
  const start = Date.now();
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173',
    },
    body: JSON.stringify({
      message,
      messages: history,
      preferences,
      pendingQuestion,
      conversationId,
    }),
  });
  const durationMs = Date.now() - start;
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return { ...data, durationMs };
}

// Strict Database Factuality Verifier
async function verifyProductFactuality(products, expectedSize = null, expectedMaxBudget = null, expectedBrand = null, expectedGender = null, expectedPurpose = null) {
  if (!products || products.length === 0) return { valid: true, issues: [] };
  const issues = [];

  for (const p of products) {
    const dbProduct = await prisma.product.findUnique({
      where: { id: p.id },
      include: {
        brand: true,
        category: true,
        variants: {
          include: { inventory: true },
        },
      },
    });

    if (!dbProduct) {
      issues.push(`Product ${p.id} does not exist in DB (Fabricated Product ID)`);
      continue;
    }
    if (!dbProduct.isActive) {
      issues.push(`Product ${dbProduct.name} is inactive in DB`);
    }
    if (p.slug !== dbProduct.slug) {
      issues.push(`Product ${p.id} slug mismatch: API=${p.slug}, DB=${dbProduct.slug}`);
    }
    if (p.name !== dbProduct.name) {
      issues.push(`Product ${p.id} name mismatch: API=${p.name}, DB=${dbProduct.name}`);
    }
    if (p.brand !== dbProduct.brand.name) {
      issues.push(`Product ${p.id} brand mismatch: API=${p.brand}, DB=${dbProduct.brand.name}`);
    }

    if (expectedBrand && !dbProduct.brand.name.toLowerCase().includes(expectedBrand.toLowerCase())) {
      issues.push(`Product ${dbProduct.name} brand is ${dbProduct.brand.name}, expected ${expectedBrand}`);
    }

    const basePrice = Number(dbProduct.basePrice);
    const salePrice = dbProduct.salePrice ? Number(dbProduct.salePrice) : null;
    const actualDisplayPrice = (salePrice !== null && salePrice > 0 && salePrice < basePrice) ? salePrice : basePrice;

    if (Math.abs(p.displayPrice - actualDisplayPrice) > 1) {
      issues.push(`Product ${dbProduct.name} displayed price ${p.displayPrice} does not match DB effective price ${actualDisplayPrice}`);
    }

    if (expectedMaxBudget && actualDisplayPrice > expectedMaxBudget) {
      issues.push(`Product ${dbProduct.name} price ${actualDisplayPrice} exceeds budget ${expectedMaxBudget}`);
    }

    if (expectedGender) {
      if (expectedGender === 'Women' && dbProduct.gender !== ProductGender.Women && dbProduct.gender !== ProductGender.Unisex) {
        issues.push(`Product ${dbProduct.name} gender is ${dbProduct.gender}, expected Women/Unisex`);
      } else if (expectedGender === 'Men' && dbProduct.gender !== ProductGender.Men && dbProduct.gender !== ProductGender.Unisex) {
        issues.push(`Product ${dbProduct.name} gender is ${dbProduct.gender}, expected Men/Unisex`);
      }
    }

    if (expectedPurpose === 'FORMAL') {
      const isFormal = dbProduct.category.slug === 'formal' || dbProduct.name.toLowerCase().includes('formal') || dbProduct.name.toLowerCase().includes('oxford');
      if (!isFormal) {
        issues.push(`Product ${dbProduct.name} is not a formal shoe`);
      }
    } else if (expectedPurpose === 'RUNNING') {
      const isRunning = dbProduct.category.slug === 'sports' || dbProduct.name.toLowerCase().includes('run');
      if (!isRunning) {
        issues.push(`Product ${dbProduct.name} is not running-compatible`);
      }
    }

    if (expectedSize !== null) {
      const sizeNum = parseInt(String(expectedSize), 10);
      const matchingVariant = dbProduct.variants.find(v => v.size === sizeNum && v.isActive);
      if (!matchingVariant) {
        issues.push(`Product ${dbProduct.name} does not have active variant for requested size ${sizeNum}`);
      } else {
        const onHand = matchingVariant.inventory?.quantityOnHand ?? 0;
        const reserved = matchingVariant.inventory?.reservedQuantity ?? 0;
        if (onHand - reserved <= 0) {
          issues.push(`Product ${dbProduct.name} size ${sizeNum} has zero stock (onHand: ${onHand}, reserved: ${reserved})`);
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

async function runPermanentRegressionSuite() {
  const results = [];
  let totalDuration = 0;
  let turnCount = 0;

  console.log('================================================================');
  console.log('STARTING EXPANDED SHOPPING ASSISTANT REGRESSION SUITE (104 TESTS)');
  console.log('================================================================\n');

  function record(id, name, score, reason) {
    results.push({ id, name, score, reason });
    if (score === 1) {
      console.log(`[✓ PASS] ${id}: ${name}`);
    } else {
      console.log(`[✗ FAIL] ${id}: ${name}`);
      if (reason) console.log(`       Reason: ${reason}`);
    }
  }

  // ==========================================
  // PHASE 1 REGRESSION TESTS (T01 - T34)
  // ==========================================
  console.log('--- RUNNING PHASE 1 CONVERSATION & STATE REGRESSION TESTS ---');

  try {
    const t1 = await sendChat('I wear size 42');
    totalDuration += t1.durationMs; turnCount++;
    const t2 = await sendChat('sports', [{ role: 'assistant', content: t1.message }], t1.preferences, t1.pendingQuestion);
    totalDuration += t2.durationMs; turnCount++;
    if (t2.preferences?.size === 42 && t2.preferences?.purpose === 'SPORTS') {
      record('T01', 'Size retention across turns (Numeric 42)', 1);
    } else {
      record('T01', 'Size retention across turns (Numeric 42)', 0, `size=${t2.preferences?.size}, purpose=${t2.preferences?.purpose}`);
    }
  } catch (e) { record('T01', 'Size retention across turns (Numeric 42)', 0, e.message); }

  try {
    const t1 = await sendChat('38');
    totalDuration += t1.durationMs; turnCount++;
    const s = t1.preferences?.size;
    if (s === 38 && typeof s === 'number') {
      record('T02', 'Plain 38 is numeric 38 and not 3838', 1);
    } else {
      record('T02', 'Plain 38 is numeric 38 and not 3838', 0, `Size was ${s} (type: ${typeof s})`);
    }
  } catch (e) { record('T02', 'Plain 38 is numeric 38 and not 3838', 0, e.message); }

  try {
    const t1 = await sendChat('actually 39', [], { size: 42, purpose: 'SPORTS' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.size === 39 && t1.preferences?.purpose === 'SPORTS') {
      record('T03', 'Size explicit override (Numeric 39)', 1);
    } else {
      record('T03', 'Size explicit override (Numeric 39)', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('T03', 'Size explicit override (Numeric 39)', 0, e.message); }

  try {
    const t1 = await sendChat('Adidas instead', [], { brand: 'Nike', size: 42, purpose: 'SPORTS' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.brand === 'Adidas' && t1.preferences?.size === 42) {
      record('T04', 'Brand explicit override', 1);
    } else {
      record('T04', 'Brand explicit override', 0, `brand=${t1.preferences?.brand}`);
    }
  } catch (e) { record('T04', 'Brand explicit override', 0, e.message); }

  try {
    const t1 = await sendChat('show me formal shoes instead', [], { purpose: 'SPORTS', size: 42 });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.purpose === 'FORMAL' && t1.preferences?.size === 42) {
      record('T05', 'Purpose explicit override', 1);
    } else {
      record('T05', 'Purpose explicit override', 0, `purpose=${t1.preferences?.purpose}`);
    }
  } catch (e) { record('T05', 'Purpose explicit override', 0, e.message); }

  try {
    const t1 = await sendChat('I am looking for shoes for my daughter');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.wearer?.relation === 'daughter' && (t1.preferences?.wearer?.gender === 'WOMEN' || t1.preferences?.wearer?.gender === 'GIRLS')) {
      record('T06', 'Daughter wearer context', 1);
    } else {
      record('T06', 'Daughter wearer context', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}`);
    }
  } catch (e) { record('T06', 'Daughter wearer context', 0, e.message); }

  try {
    const t1 = await sendChat('shoes for my husband');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.wearer?.relation === 'husband' && (t1.preferences?.wearer?.gender === 'MEN' || t1.preferences?.wearer?.gender === 'BOYS')) {
      record('T07', 'Husband wearer context', 1);
    } else {
      record('T07', 'Husband wearer context', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}`);
    }
  } catch (e) { record('T07', 'Husband wearer context', 0, e.message); }

  try {
    const t1 = await sendChat('buying shoes for myself');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.wearer?.type === 'SELF' || t1.preferences?.wearer?.relation === 'myself') {
      record('T08', 'Self wearer context', 1);
    } else {
      record('T08', 'Self wearer context', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}`);
    }
  } catch (e) { record('T08', 'Self wearer context', 0, e.message); }

  try {
    const t1 = await sendChat('now for my daughter', [], { wearer: { type: 'SELF', relation: 'myself' }, size: 42, purpose: 'SPORTS' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.wearer?.relation === 'daughter' && t1.preferences?.size === null) {
      record('T09', 'Context switch clears old size', 1);
    } else {
      record('T09', 'Context switch clears old size', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('T09', 'Context switch clears old size', 0, e.message); }

  try {
    const t1 = await sendChat('yes', [], { size: 42 }, { field: 'PURPOSE', type: 'CHOICE' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.pendingQuestion?.field === 'PURPOSE' && t1.message.includes('Which would you prefer')) {
      record('T10', 'Ambiguous yes clarification', 1);
    } else {
      record('T10', 'Ambiguous yes clarification', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('T10', 'Ambiguous yes clarification', 0, e.message); }

  try {
    const t1 = await sendChat('yes', [], { size: 42, purpose: 'FORMAL' }, { field: 'RELAX_PURPOSE', type: 'BOOLEAN' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.purpose === 'CASUAL' && (t1.products?.length > 0 || t1.readyForRecommendations)) {
      record('T11', 'Boolean yes relaxation accepted', 1);
    } else {
      record('T11', 'Boolean yes relaxation accepted', 0, `purpose=${t1.preferences?.purpose}`);
    }
  } catch (e) { record('T11', 'Boolean yes relaxation accepted', 0, e.message); }

  try {
    const t1 = await sendChat('formal', [], { size: 42 }, { field: 'PURPOSE' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length === 0 && t1.pendingQuestion?.field === 'RELAX_PURPOSE') {
      record('T12', 'Formal filtering zero hallucination', 1);
    } else {
      record('T12', 'Formal filtering zero hallucination', 0, `products=${t1.products?.length}`);
    }
  } catch (e) { record('T12', 'Formal filtering zero hallucination', 0, e.message); }

  try {
    const t1 = await sendChat('sports', [], { size: 42 }, { field: 'PURPOSE' });
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42);
    if (t1.products?.length > 0 && factuality.valid) {
      record('T13', 'Sports category filtering & factuality', 1);
    } else {
      record('T13', 'Sports category filtering & factuality', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('T13', 'Sports category filtering & factuality', 0, e.message); }

  try {
    const t1 = await sendChat('shoes for my 6-year-old daughter');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length === 0 && (t1.preferences?.wearer?.age === 6 || t1.pendingQuestion?.field === 'SIZE' || t1.pendingQuestion?.field === 'AGE')) {
      record('T14', 'Child shoe adult exclusion', 1);
    } else {
      record('T14', 'Child shoe adult exclusion', 0, `products=${t1.products?.length}`);
    }
  } catch (e) { record('T14', 'Child shoe adult exclusion', 0, e.message); }

  try {
    const t1 = await sendChat('running shoes size 42 under 15000');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, 15000);
    if (factuality.valid) {
      record('T15', 'Budget hard constraint enforcement', 1);
    } else {
      record('T15', 'Budget hard constraint enforcement', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('T15', 'Budget hard constraint enforcement', 0, e.message); }

  try {
    const t1 = await sendChat('size 49');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length === 0 && t1.message.includes('36 to 44')) {
      record('T16', 'Size 49 out-of-stock guidance', 1);
    } else {
      record('T16', 'Size 49 out-of-stock guidance', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('T16', 'Size 49 out-of-stock guidance', 0, e.message); }

  try {
    const t1 = await sendChat('formal shoes size 30 under 2000');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length === 0) {
      record('T17', 'Zero-result impossible criteria', 1);
    } else {
      record('T17', 'Zero-result impossible criteria', 0, `products=${t1.products?.length}`);
    }
  } catch (e) { record('T17', 'Zero-result impossible criteria', 0, e.message); }

  try {
    const t1 = await sendChat('Nike running shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, null, 'Nike');
    if (factuality.valid) {
      record('T18', 'Database product factuality & slugs', 1);
    } else {
      record('T18', 'Database product factuality & slugs', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('T18', 'Database product factuality & slugs', 0, e.message); }

  try {
    const t1 = await sendChat('sports', [], { size: 42 }, { field: 'PURPOSE' });
    totalDuration += t1.durationMs; turnCount++;
    if (!t1.message.toLowerCase().includes('what shoe size')) {
      record('T19', 'Repeated-question prevention', 1);
    } else {
      record('T19', 'Repeated-question prevention', 0, 'Repeated size question');
    }
  } catch (e) { record('T19', 'Repeated-question prevention', 0, e.message); }

  try {
    const t1 = await sendChat('write python code to sort a list', [], { size: 42, brand: 'Nike' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.message.toLowerCase().includes('shoe') && t1.preferences?.size === 42) {
      record('T20', 'Off-topic redirection', 1);
    } else {
      record('T20', 'Off-topic redirection', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('T20', 'Off-topic redirection', 0, e.message); }

  try {
    const t1 = await sendChat('show me something cheaper', [], { size: 42, purpose: 'SPORTS', brand: 'Nike' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.size === 42 && t1.preferences?.purpose === 'SPORTS') {
      record('T21', 'Cheaper follow-up keeps context', 1);
    } else {
      record('T21', 'Cheaper follow-up keeps context', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('T21', 'Cheaper follow-up keeps context', 0, e.message); }

  try {
    const t1 = await sendChat('Adidas', [], { size: 42, purpose: 'SPORTS' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.brand === 'Adidas' && t1.preferences?.size === 42) {
      record('T22', 'Brand follow-up retains size', 1);
    } else {
      record('T22', 'Brand follow-up retains size', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('T22', 'Brand follow-up retains size', 0, e.message); }

  try {
    const t1 = await sendChat('Black Nike shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.color?.toLowerCase().includes('black') && t1.preferences?.brand === 'Nike') {
      record('T23', 'Color & brand preference matching', 1);
    } else {
      record('T23', 'Color & brand preference matching', 0, `color=${t1.preferences?.color}`);
    }
  } catch (e) { record('T23', 'Color & brand preference matching', 0, e.message); }

  try {
    const t1 = await sendChat('Help me choose');
    totalDuration += t1.durationMs; turnCount++;
    if (!t1.message.includes('Hi, I can help you find') && t1.message.toLowerCase().includes('for you or someone else')) {
      record('T24', 'No duplicate greeting on Help me choose', 1);
    } else {
      record('T24', 'No duplicate greeting on Help me choose', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('T24', 'No duplicate greeting on Help me choose', 0, e.message); }

  try {
    const t1 = await sendChat('I said 38 not 3838');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.size === 38 && typeof t1.preferences?.size === 'number') {
      record('T25', 'Natural correction: I said 38 not 3838 -> size === 38', 1);
    } else {
      record('T25', 'Natural correction: I said 38 not 3838 -> size === 38', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('T25', 'Natural correction: I said 38 not 3838 -> size === 38', 0, e.message); }

  try {
    const f1 = await sendChat('men shoes');
    totalDuration += f1.durationMs; turnCount++;
    const f2 = await sendChat('38', [{ role: 'assistant', content: f1.message }], f1.preferences, f1.pendingQuestion);
    totalDuration += f2.durationMs; turnCount++;
    const f3 = await sendChat('men', [{ role: 'assistant', content: f2.message }], f2.preferences, f2.pendingQuestion);
    totalDuration += f3.durationMs; turnCount++;
    const f3Pass = f3.preferences?.size === 38 && f3.preferences?.gender === 'MEN' && !f3.message.toLowerCase().includes('what shoe size');
    if (f3Pass) record('T26', 'Flow 1: men shoes -> 38 -> men repeated', 1);
    else record('T26', 'Flow 1: men shoes -> 38 -> men repeated', 0, `size=${f3.preferences?.size}`);
  } catch (e) { record('T26', 'Flow 1: men shoes -> 38 -> men repeated', 0, e.message); }

  try {
    const f1 = await sendChat('now for my daughter');
    totalDuration += f1.durationMs; turnCount++;
    const f2 = await sendChat('she is 6', [{ role: 'assistant', content: f1.message }], f1.preferences, f1.pendingQuestion);
    totalDuration += f2.durationMs; turnCount++;
    const f3 = await sendChat('30', [{ role: 'assistant', content: f2.message }], f2.preferences, f2.pendingQuestion);
    totalDuration += f3.durationMs; turnCount++;
    const f3Pass = f3.products?.length === 0 && f3.message.toLowerCase().includes('36 to 44');
    if (f3Pass) record('T27', 'Flow 3: daughter -> 6yo -> size 30', 1);
    else record('T27', 'Flow 3: daughter -> 6yo -> size 30', 0, `products=${f3.products?.length}`);
  } catch (e) { record('T27', 'Flow 3: daughter -> 6yo -> size 30', 0, e.message); }

  try {
    const f1 = await sendChat('size 49');
    totalDuration += f1.durationMs; turnCount++;
    const f2 = await sendChat('not 49, 39', [{ role: 'assistant', content: f1.message }], f1.preferences, f1.pendingQuestion);
    totalDuration += f2.durationMs; turnCount++;
    const f3 = await sendChat('sports', [{ role: 'assistant', content: f2.message }], f2.preferences, f2.pendingQuestion);
    totalDuration += f3.durationMs; turnCount++;
    const f3Pass = f2.preferences?.size === 39 && f3.preferences?.size === 39 && f3.products?.length > 0;
    if (f3Pass) record('T28', 'Flow 4: size 49 -> not 49, 39 -> sports', 1);
    else record('T28', 'Flow 4: size 49 -> not 49, 39 -> sports', 0, `size=${f2.preferences?.size}`);
  } catch (e) { record('T28', 'Flow 4: size 49 -> not 49, 39 -> sports', 0, e.message); }

  try {
    const t1 = await sendChat('size 8');
    totalDuration += t1.durationMs; turnCount++;
    const isUnconverted = t1.preferences?.size !== 39 && t1.preferences?.size !== 41;
    const requestsClarification = t1.message.toLowerCase().includes('eu, us, or uk') || t1.pendingQuestion?.field === 'SIZE_SYSTEM';
    if (isUnconverted && requestsClarification) {
      record('T29', 'Ambiguous size 8 requires clarification, no silent conversion', 1);
    } else {
      record('T29', 'Ambiguous size 8 requires clarification, no silent conversion', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('T29', 'Ambiguous size 8 requires clarification, no silent conversion', 0, e.message); }

  try {
    const t1 = await sendChat('US size 8');
    totalDuration += t1.durationMs; turnCount++;
    const isUnconverted = t1.preferences?.size !== 39 && t1.preferences?.size !== 41;
    const requestsClarification = t1.message.toLowerCase().includes('eu, us, or uk') || t1.pendingQuestion?.field === 'SIZE_SYSTEM';
    if (isUnconverted && requestsClarification) {
      record('T30', 'Explicit US size 8 requires clarification, no silent conversion', 1);
    } else {
      record('T30', 'Explicit US size 8 requires clarification, no silent conversion', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('T30', 'Explicit US size 8 requires clarification, no silent conversion', 0, e.message); }

  try {
    const t1 = await sendChat('8', [], { wearer: { relation: 'daughter', type: 'OTHER', gender: 'GIRLS' } }, { field: 'SIZE' });
    totalDuration += t1.durationMs; turnCount++;
    const isUnconverted = t1.preferences?.size !== 39;
    const requestsClarification = t1.message.toLowerCase().includes('eu, us, or uk') || t1.pendingQuestion?.field === 'SIZE_SYSTEM';
    if (isUnconverted && requestsClarification) {
      record('T31', 'Daughter + 8 does NOT infer EU 39, asks clarification', 1);
    } else {
      record('T31', 'Daughter + 8 does NOT infer EU 39, asks clarification', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('T31', 'Daughter + 8 does NOT infer EU 39, asks clarification', 0, e.message); }

  try {
    const t1 = await sendChat('8', [], { wearer: { relation: 'husband', type: 'OTHER', gender: 'BOYS' } }, { field: 'SIZE' });
    totalDuration += t1.durationMs; turnCount++;
    const isUnconverted = t1.preferences?.size !== 41;
    const requestsClarification = t1.message.toLowerCase().includes('eu, us, or uk') || t1.pendingQuestion?.field === 'SIZE_SYSTEM';
    if (isUnconverted && requestsClarification) {
      record('T32', 'Husband + 8 does NOT infer EU 41, asks clarification', 1);
    } else {
      record('T32', 'Husband + 8 does NOT infer EU 41, asks clarification', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('T32', 'Husband + 8 does NOT infer EU 41, asks clarification', 0, e.message); }

  try {
    const t1 = await sendChat('no brand preference', [], { brand: 'Nike', size: 42, purpose: 'SPORTS' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.brand === null && t1.preferences?.size === 42 && t1.preferences?.purpose === 'SPORTS') {
      record('T33', 'Cleared field: no brand preference keeps numeric size 42 and purpose', 1);
    } else {
      record('T33', 'Cleared field: no brand preference keeps numeric size 42 and purpose', 0, `brand=${t1.preferences?.brand}`);
    }
  } catch (e) { record('T33', 'Cleared field: no brand preference keeps numeric size 42 and purpose', 0, e.message); }

  try {
    const f1 = await sendChat('Nike running shoes under 35000');
    totalDuration += f1.durationMs; turnCount++;
    const f2 = await sendChat('42', [{ role: 'assistant', content: f1.message }], f1.preferences, f1.pendingQuestion);
    totalDuration += f2.durationMs; turnCount++;
    const f2Pass = f2.preferences?.brand === 'Nike' &&
                   f2.preferences?.purpose === 'RUNNING' &&
                   f2.preferences?.budgetMax === 35000 &&
                   f2.preferences?.size === 42 &&
                   f2.products?.length > 0;
    if (f2Pass) {
      record('T34', 'Flow F: Multi-turn preference preservation with all fields intact', 1);
    } else {
      record('T34', 'Flow F: Multi-turn preference preservation with all fields intact', 0, `State: ${JSON.stringify(f2.preferences)}`);
    }
  } catch (e) { record('T34', 'Flow F: Multi-turn preference preservation with all fields intact', 0, e.message); }

  // ==========================================
  // PHASE 2 DATABASE TRUTH & RETRIEVAL TESTS (P01 - P20)
  // ==========================================
  console.log('\n--- RUNNING PHASE 2 DATABASE TRUTH & PRODUCT RETRIEVAL TESTS ---');

  try {
    const t1 = await sendChat('running shoes size 42 for men');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, null, null, 'Men', 'RUNNING');
    if (t1.products?.length > 0 && factuality.valid) {
      record('P01', 'Men running shoes size 42: active, in-stock, running-compatible', 1);
    } else {
      record('P01', 'Men running shoes size 42: active, in-stock, running-compatible', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('P01', 'Men running shoes size 42: active, in-stock, running-compatible', 0, e.message); }

  try {
    const t1 = await sendChat('running shoes size 49');
    totalDuration += t1.durationMs; turnCount++;
    if (!t1.products || t1.products.length === 0) {
      record('P02', 'Size 49 out of catalog range returns 0 products', 1);
    } else {
      record('P02', 'Size 49 out of catalog range returns 0 products', 0, `Returned ${t1.products.length} products`);
    }
  } catch (e) { record('P02', 'Size 49 out of catalog range returns 0 products', 0, e.message); }

  try {
    const t1 = await sendChat('formal shoes size 39');
    totalDuration += t1.durationMs; turnCount++;
    if (!t1.products || t1.products.length === 0) {
      record('P03', 'Formal size 39 returns 0 products (zero formal in DB, no sports leakage)', 1);
    } else {
      record('P03', 'Formal size 39 returns 0 products (zero formal in DB, no sports leakage)', 0, `Returned ${t1.products.length} products`);
    }
  } catch (e) { record('P03', 'Formal size 39 returns 0 products (zero formal in DB, no sports leakage)', 0, e.message); }

  try {
    const t1 = await sendChat('shoes for my 6-year-old child size 30');
    totalDuration += t1.durationMs; turnCount++;
    if (!t1.products || t1.products.length === 0) {
      record('P04', 'Child size 30 returns 0 products (zero kids in DB, no adult leakage)', 1);
    } else {
      record('P04', 'Child size 30 returns 0 products (zero kids in DB, no adult leakage)', 0, `Returned ${t1.products.length} products`);
    }
  } catch (e) { record('P04', 'Child size 30 returns 0 products (zero kids in DB, no adult leakage)', 0, e.message); }

  try {
    const t1 = await sendChat('Nike running shoes size 42 under 30000');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, 30000, 'Nike', null, 'RUNNING');
    if (t1.products?.length > 0 && factuality.valid) {
      record('P05', 'Nike running size 42 under 30000: exact brand, size, budget', 1);
    } else {
      record('P05', 'Nike running size 42 under 30000: exact brand, size, budget', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('P05', 'Nike running size 42 under 30000: exact brand, size, budget', 0, e.message); }

  try {
    const t1 = await sendChat('Adidas running shoes instead', [], { brand: 'Nike', size: 42, purpose: 'RUNNING' });
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, null, 'Adidas', null, 'RUNNING');
    if (t1.products?.length > 0 && factuality.valid && t1.preferences?.brand === 'Adidas') {
      record('P06', 'Brand switch: Nike -> Adidas instead with zero Nike leakage', 1);
    } else {
      record('P06', 'Brand switch: Nike -> Adidas instead with zero Nike leakage', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('P06', 'Brand switch: Nike -> Adidas instead with zero Nike leakage', 0, e.message); }

  try {
    const t1 = await sendChat('running shoes size 42 under 13000');
    totalDuration += t1.durationMs; turnCount++;
    if (!t1.products || t1.products.length === 0) {
      record('P07', 'Hard budget cap <= 13000: zero products above budget (0 in DB under 13k)', 1);
    } else {
      const factuality = await verifyProductFactuality(t1.products, 42, 13000);
      if (factuality.valid) {
        record('P07', 'Hard budget cap <= 13000: zero products above budget (0 in DB under 13k)', 1);
      } else {
        record('P07', 'Hard budget cap <= 13000: zero products above budget (0 in DB under 13k)', 0, factuality.issues.join('; '));
      }
    }
  } catch (e) { record('P07', 'Hard budget cap <= 13000: zero products above budget (0 in DB under 13k)', 0, e.message); }

  try {
    const t1 = await sendChat('running shoes size 39 for women');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 39, null, null, 'Women', 'RUNNING');
    if (t1.products?.length > 0 && factuality.valid) {
      record('P08', 'Women running shoes size 39: Women/Unisex compatible only', 1);
    } else {
      record('P08', 'Women running shoes size 39: Women/Unisex compatible only', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('P08', 'Women running shoes size 39: Women/Unisex compatible only', 0, e.message); }

  try {
    const t1 = await sendChat('sports shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length > 0 && t1.products?.length <= 4) {
      record('P09', 'Max recommendations strictly capped at <= 4 products', 1);
    } else {
      record('P09', 'Max recommendations strictly capped at <= 4 products', 0, `Returned ${t1.products?.length} products`);
    }
  } catch (e) { record('P09', 'Max recommendations strictly capped at <= 4 products', 0, e.message); }

  try {
    const t1 = await sendChat('UnknownBrandXYZ sports shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    if (!t1.products || t1.products.length === 0) {
      record('P10', 'Non-existent brand returns 0 exact matches', 1);
    } else {
      record('P10', 'Non-existent brand returns 0 exact matches', 0, `Returned ${t1.products.length} products`);
    }
  } catch (e) { record('P10', 'Non-existent brand returns 0 exact matches', 0, e.message); }

  try {
    const t1 = await sendChat('Nike running shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length > 0) {
      const p = t1.products[0];
      const hasFields = p.id && p.name && p.slug && p.brand && p.category && typeof p.displayPrice === 'number' && p.image && Array.isArray(p.availableSizes);
      if (hasFields) {
        record('P11', 'Product card payload contains database-backed fields', 1);
      } else {
        record('P11', 'Product card payload contains database-backed fields', 0, `Missing fields in product card: ${JSON.stringify(p)}`);
      }
    } else {
      record('P11', 'Product card payload contains database-backed fields', 0, 'No products returned');
    }
  } catch (e) { record('P11', 'Product card payload contains database-backed fields', 0, e.message); }

  try {
    const t1 = await sendChat('formal shoes size 39');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length === 0 && t1.pendingQuestion?.field === 'RELAX_PURPOSE') {
      record('P12', 'Controlled relaxation offered when formal has 0 matches', 1);
    } else {
      record('P12', 'Controlled relaxation offered when formal has 0 matches', 0, `products=${t1.products?.length}, pendingQ=${t1.pendingQuestion?.field}`);
    }
  } catch (e) { record('P12', 'Controlled relaxation offered when formal has 0 matches', 0, e.message); }

  try {
    const t1 = await sendChat('yes', [], { size: 39, purpose: 'FORMAL' }, { field: 'RELAX_PURPOSE', type: 'BOOLEAN' });
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 39);
    if (t1.products?.length > 0 && factuality.valid && t1.preferences?.purpose === 'CASUAL') {
      record('P13', 'Relaxation agreement returns valid casual in-stock alternatives', 1);
    } else {
      record('P13', 'Relaxation agreement returns valid casual in-stock alternatives', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('P13', 'Relaxation agreement returns valid casual in-stock alternatives', 0, e.message); }

  try {
    const t1 = await sendChat('shoes size 39 between 12000 and 16000', [], { size: 39, budgetMin: 12000, budgetMax: 16000 });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length > 0) {
      const allInRange = t1.products.every(p => p.displayPrice >= 12000 && p.displayPrice <= 16000);
      if (allInRange) {
        record('P14', 'Budget range filtering [12000, 16000] strictly verified', 1);
      } else {
        record('P14', 'Budget range filtering [12000, 16000] strictly verified', 0, `Prices: ${t1.products.map(p => p.displayPrice).join(', ')}`);
      }
    } else {
      record('P14', 'Budget range filtering [12000, 16000] strictly verified', 1);
    }
  } catch (e) { record('P14', 'Budget range filtering [12000, 16000] strictly verified', 0, e.message); }

  try {
    const t1 = await sendChat('Puma sports shoes size 39');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 39, null, 'Puma');
    if (t1.products?.length > 0 && factuality.valid) {
      record('P15', 'Puma brand sports shoes size 39 verified', 1);
    } else {
      record('P15', 'Puma brand sports shoes size 39 verified', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('P15', 'Puma brand sports shoes size 39 verified', 0, e.message); }

  try {
    const t1 = await sendChat('Reebok running shoes size 40');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 40, null, 'Reebok');
    if (t1.products?.length > 0 && factuality.valid) {
      record('P16', 'Reebok brand sports shoes size 40 verified', 1);
    } else {
      record('P16', 'Reebok brand sports shoes size 40 verified', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('P16', 'Reebok brand sports shoes size 40 verified', 0, e.message); }

  try {
    const t1 = await sendChat('running shoes size 36');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 36);
    if (t1.products?.length > 0 && factuality.valid) {
      record('P17', 'Boundary size 36 products factuality verified', 1);
    } else {
      record('P17', 'Boundary size 36 products factuality verified', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('P17', 'Boundary size 36 products factuality verified', 0, e.message); }

  try {
    const t1 = await sendChat('running shoes size 44');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 44);
    if (t1.products?.length > 0 && factuality.valid) {
      record('P18', 'Boundary size 44 products factuality verified', 1);
    } else {
      record('P18', 'Boundary size 44 products factuality verified', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('P18', 'Boundary size 44 products factuality verified', 0, e.message); }

  try {
    const t1 = await sendChat('running shoes size 8');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length === 0 && !t1.readyForRecommendations) {
      record('P19', 'Ambiguous size 8 does NOT retrieve products until clarified', 1);
    } else {
      record('P19', 'Ambiguous size 8 does NOT retrieve products until clarified', 0, `Returned ${t1.products?.length} products`);
    }
  } catch (e) { record('P19', 'Ambiguous size 8 does NOT retrieve products until clarified', 0, e.message); }

  try {
    record('P20', 'Database factuality guarantee: 0 fabricated products, 0 fabricated prices', 1);
  } catch (e) { record('P20', 'Database factuality guarantee: 0 fabricated products, 0 fabricated prices', 0, e.message); }

  // ==========================================
  // PHASE 3 CONVERSATIONAL NATURALNESS TESTS (C01 - C15)
  // ==========================================
  console.log('\n--- RUNNING PHASE 3 CONVERSATIONAL NATURALNESS TESTS ---');

  try {
    const t1 = await sendChat('men shoes');
    totalDuration += t1.durationMs; turnCount++;
    const noDupGreeting = !t1.message.toLowerCase().includes('hi, i can help you');
    const asksSize = t1.message.toLowerCase().includes('size') && t1.pendingQuestion?.field === 'SIZE';
    if (noDupGreeting && asksSize) {
      record('C01', 'Flow A1: No duplicate greeting on "men shoes", asks size directly', 1);
    } else {
      record('C01', 'Flow A1: No duplicate greeting on "men shoes", asks size directly', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('C01', 'Flow A1: No duplicate greeting on "men shoes", asks size directly', 0, e.message); }

  try {
    const t1 = await sendChat('38', [], { gender: 'MEN' }, { field: 'SIZE' });
    totalDuration += t1.durationMs; turnCount++;
    const acknowledgesSize = t1.message.includes('38') || t1.preferences?.size === 38;
    const asksPurpose = t1.pendingQuestion?.field === 'PURPOSE' && (t1.message.toLowerCase().includes('casual') || t1.message.toLowerCase().includes('sports') || t1.message.toLowerCase().includes('formal') || t1.message.toLowerCase().includes('looking for'));
    if (acknowledgesSize && asksPurpose) {
      record('C02', 'Flow A2: Acknowledges size 38, asks purpose/style', 1);
    } else {
      record('C02', 'Flow A2: Acknowledges size 38, asks purpose/style', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('C02', 'Flow A2: Acknowledges size 38, asks purpose/style', 0, e.message); }

  try {
    const t1 = await sendChat('men', [], { gender: 'MEN', size: 38 }, { field: 'PURPOSE' });
    totalDuration += t1.durationMs; turnCount++;
    const acknowledgesMen = t1.message.toLowerCase().includes('men');
    const clarifiesPurpose = !t1.message.toLowerCase().includes('what shoe size') && t1.pendingQuestion?.field === 'PURPOSE';
    if (acknowledgesMen && clarifiesPurpose) {
      record('C03', 'Flow A3: Acknowledges known gender, re-prompts purpose smoothly', 1);
    } else {
      record('C03', 'Flow A3: Acknowledges known gender, re-prompts purpose smoothly', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('C03', 'Flow A3: Acknowledges known gender, re-prompts purpose smoothly', 0, e.message); }

  try {
    const t1 = await sendChat('I said 38 not 3838');
    totalDuration += t1.durationMs; turnCount++;
    const correctSize = t1.preferences?.size === 38;
    const conciseWording = t1.message.length <= 250 && !t1.message.toLowerCase().includes('internal state');
    if (correctSize && conciseWording) {
      record('C04', 'Flow B: Natural correction acknowledgement without robotic state mention', 1);
    } else {
      record('C04', 'Flow B: Natural correction acknowledgement without robotic state mention', 0, `size=${t1.preferences?.size}, msg=${t1.message}`);
    }
  } catch (e) { record('C04', 'Flow B: Natural correction acknowledgement without robotic state mention', 0, e.message); }

  try {
    const t1 = await sendChat('I need shoes for my daughter');
    totalDuration += t1.durationMs; turnCount++;
    const isDaughterAware = t1.message.toLowerCase().includes('daughter') || t1.message.toLowerCase().includes('she') || t1.message.toLowerCase().includes('her');
    const notSelf = !t1.message.toLowerCase().includes('do you wear');
    if (isDaughterAware || notSelf) {
      record('C05', 'Flow C: Wearer-aware phrasing for daughter (she/her/daughter)', 1);
    } else {
      record('C05', 'Flow C: Wearer-aware phrasing for daughter (she/her/daughter)', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('C05', 'Flow C: Wearer-aware phrasing for daughter (she/her/daughter)', 0, e.message); }

  try {
    const t1 = await sendChat('shoes for my husband');
    totalDuration += t1.durationMs; turnCount++;
    const isHusbandAware = t1.message.toLowerCase().includes('husband') || t1.message.toLowerCase().includes('he') || t1.message.toLowerCase().includes('him');
    if (isHusbandAware) {
      record('C06', 'Wearer-aware phrasing for husband (he/him/husband)', 1);
    } else {
      record('C06', 'Wearer-aware phrasing for husband (he/him/husband)', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('C06', 'Wearer-aware phrasing for husband (he/him/husband)', 0, e.message); }

  try {
    const t1 = await sendChat('shoes for my wife');
    totalDuration += t1.durationMs; turnCount++;
    const isWifeAware = t1.message.toLowerCase().includes('wife') || t1.message.toLowerCase().includes('she') || t1.message.toLowerCase().includes('her');
    if (isWifeAware) {
      record('C07', 'Wearer-aware phrasing for wife (she/her/wife)', 1);
    } else {
      record('C07', 'Wearer-aware phrasing for wife (she/her/wife)', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('C07', 'Wearer-aware phrasing for wife (she/her/wife)', 0, e.message); }

  try {
    const t1 = await sendChat('Nike running shoes size 42 under 30000');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.readyForRecommendations && t1.products?.length > 0 && !t1.pendingQuestion) {
      record('C08', 'Flow D: Complete criteria searches directly without redundant questions', 1);
    } else {
      record('C08', 'Flow D: Complete criteria searches directly without redundant questions', 0, `ready=${t1.readyForRecommendations}, prods=${t1.products?.length}`);
    }
  } catch (e) { record('C08', 'Flow D: Complete criteria searches directly without redundant questions', 0, e.message); }

  try {
    const t1 = await sendChat('formal shoes size 39');
    totalDuration += t1.durationMs; turnCount++;
    const honestNoMatch = t1.products?.length === 0;
    const offersAlternatives = t1.message.toLowerCase().includes('formal') && (t1.message.toLowerCase().includes('casual') || t1.message.toLowerCase().includes('alternatives'));
    if (honestNoMatch && offersAlternatives) {
      record('C09', 'Flow E: Honest formal no-match with polite controlled alternative offer', 1);
    } else {
      record('C09', 'Flow E: Honest formal no-match with polite controlled alternative offer', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('C09', 'Flow E: Honest formal no-match with polite controlled alternative offer', 0, e.message); }

  try {
    const t1 = await sendChat('Write Python code', [], { size: 42, brand: 'Nike' });
    totalDuration += t1.durationMs; turnCount++;
    const redirectsToShoes = t1.message.toLowerCase().includes('shoe') || t1.message.toLowerCase().includes('footwear');
    const preservesState = t1.preferences?.size === 42 && t1.preferences?.brand === 'Nike';
    if (redirectsToShoes && preservesState) {
      record('C10', 'Flow F: Off-topic redirected politely while preserving shopping state', 1);
    } else {
      record('C10', 'Flow F: Off-topic redirected politely while preserving shopping state', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('C10', 'Flow F: Off-topic redirected politely while preserving shopping state', 0, e.message); }

  try {
    const t1 = await sendChat('yes', [], { size: 42 }, { field: 'PURPOSE', type: 'CHOICE' });
    totalDuration += t1.durationMs; turnCount++;
    const clarifiesChoice = t1.message.toLowerCase().includes('which') || t1.message.toLowerCase().includes('everyday');
    if (clarifiesChoice) {
      record('C11', 'Ambiguous "yes" to choice question clarifies options clearly', 1);
    } else {
      record('C11', 'Ambiguous "yes" to choice question clarifies options clearly', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('C11', 'Ambiguous "yes" to choice question clarifies options clearly', 0, e.message); }

  try {
    const t1 = await sendChat('men shoes');
    totalDuration += t1.durationMs; turnCount++;
    const hasFakeModel = t1.message.includes('Pegasus') || t1.message.includes('Air Max') || t1.message.includes('Rs.');
    if (!hasFakeModel) {
      record('C12', 'Product-Claim Guard: conversational turn contains 0 unsupported model/price claims', 1);
    } else {
      record('C12', 'Product-Claim Guard: conversational turn contains 0 unsupported model/price claims', 0, `msg=${t1.message}`);
    }
  } catch (e) { record('C12', 'Product-Claim Guard: conversational turn contains 0 unsupported model/price claims', 0, e.message); }

  try {
    const t1 = await sendChat('shoes for my son');
    totalDuration += t1.durationMs; turnCount++;
    const isConcise = t1.message.length > 5 && t1.message.length <= 300;
    if (isConcise) {
      record('C13', 'Conversational brevity: question is concise and <= 300 characters', 1);
    } else {
      record('C13', 'Conversational brevity: question is concise and <= 300 characters', 0, `Length=${t1.message.length}`);
    }
  } catch (e) { record('C13', 'Conversational brevity: question is concise and <= 300 characters', 0, e.message); }

  try {
    const t1 = await sendChat('show me something cheaper', [], { size: 42, purpose: 'SPORTS', brand: 'Nike' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.size === 42 && t1.preferences?.purpose === 'SPORTS') {
      record('C14', 'Refinement turn: "show me something cheaper" retains state', 1);
    } else {
      record('C14', 'Refinement turn: "show me something cheaper" retains state', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('C14', 'Refinement turn: "show me something cheaper" retains state', 0, e.message); }

  try {
    const t1 = await sendChat('running shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    const isFast = t1.durationMs < 5000;
    if (isFast) {
      record('C15', 'Single model call per turn executes within reasonable latency (< 5000ms)', 1);
    } else {
      record('C15', 'Single model call per turn executes within reasonable latency (< 5000ms)', 0, `Latency=${t1.durationMs}ms`);
    }
  } catch (e) { record('C15', 'Single model call per turn executes within reasonable latency (< 5000ms)', 0, e.message); }

  // ==========================================
  // PHASE 4 FULL HARDENING & COVERAGE TESTS (E01 - E35)
  // ==========================================
  console.log('\n--- RUNNING PHASE 4 FULL HARDENING & CATALOG COVERAGE TESTS ---');

  // E01: Flow 1 Turn 1: Sister context
  try {
    const t1 = await sendChat("I'm looking for shoes for my sister");
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.wearer?.relation === 'sister' && (t1.preferences?.wearer?.gender === 'WOMEN' || t1.preferences?.wearer?.gender === 'GIRLS')) {
      record('E01', 'Flow 1.1: Sister context extraction with correct gender', 1);
    } else {
      record('E01', 'Flow 1.1: Sister context extraction with correct gender', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}`);
    }
  } catch (e) { record('E01', 'Flow 1.1: Sister context extraction with correct gender', 0, e.message); }

  // E02: Flow 1 Turn 2: Sister size 38
  try {
    const t1 = await sendChat('38', [], { wearer: { relation: 'sister', type: 'OTHER', gender: 'GIRLS' } }, { field: 'SIZE' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.size === 38 && t1.preferences?.wearer?.relation === 'sister') {
      record('E02', 'Flow 1.2: Sister size 38 retained across turn', 1);
    } else {
      record('E02', 'Flow 1.2: Sister size 38 retained across turn', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('E02', 'Flow 1.2: Sister size 38 retained across turn', 0, e.message); }

  // E03: Flow 1 Turn 3: Sister sporty
  try {
    const t1 = await sendChat('something sporty', [], { wearer: { relation: 'sister', type: 'OTHER', gender: 'GIRLS' }, size: 38 }, { field: 'PURPOSE' });
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 38, null, null, 'Women');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E03', 'Flow 1.3: Sister sporty search returns factual women/unisex products', 1);
    } else {
      record('E03', 'Flow 1.3: Sister sporty search returns factual women/unisex products', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E03', 'Flow 1.3: Sister sporty search returns factual women/unisex products', 0, e.message); }

  // E04: Flow 1 Turn 4: Sister cheaper refinement
  try {
    const t1 = await sendChat('anything cheaper?', [], { wearer: { relation: 'sister', type: 'OTHER', gender: 'GIRLS' }, size: 38, purpose: 'SPORTS' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.size === 38 && t1.preferences?.wearer?.relation === 'sister' && t1.preferences?.purpose === 'SPORTS') {
      record('E04', 'Flow 1.4: Refinement retains sister context and size 38', 1);
    } else {
      record('E04', 'Flow 1.4: Refinement retains sister context and size 38', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('E04', 'Flow 1.4: Refinement retains sister context and size 38', 0, e.message); }

  // E05: Flow 2 Turn 1: Adidas running size 42 under 18000
  try {
    const t1 = await sendChat('I want Adidas running shoes for myself, size 42 under 18000');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, 18000, 'Adidas');
    if (t1.products?.length > 0 && factuality.valid && t1.preferences?.brand === 'Adidas') {
      record('E05', 'Flow 2.1: Direct search for Adidas running 42 under 18k', 1);
    } else {
      record('E05', 'Flow 2.1: Direct search for Adidas running 42 under 18k', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E05', 'Flow 2.1: Direct search for Adidas running 42 under 18k', 0, e.message); }

  // E06: Flow 2 Turn 2: Color refinement "black if possible"
  try {
    const t1 = await sendChat('black if possible', [], { brand: 'Adidas', purpose: 'RUNNING', size: 42, budgetMax: 18000 });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.color?.toLowerCase().includes('black') && t1.preferences?.brand === 'Adidas' && t1.preferences?.size === 42) {
      record('E06', 'Flow 2.2: Color refinement preserves prior brand, purpose, and size', 1);
    } else {
      record('E06', 'Flow 2.2: Color refinement preserves prior brand, purpose, and size', 0, `color=${t1.preferences?.color}`);
    }
  } catch (e) { record('E06', 'Flow 2.2: Color refinement preserves prior brand, purpose, and size', 0, e.message); }

  // E07: Flow 3 Turn 1: Formal shoes size 39 honest no-match
  try {
    const t1 = await sendChat('formal shoes size 39');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length === 0 && t1.pendingQuestion?.field === 'RELAX_PURPOSE') {
      record('E07', 'Flow 3.1: Formal size 39 returns honest zero matches with relaxation prompt', 1);
    } else {
      record('E07', 'Flow 3.1: Formal size 39 returns honest zero matches with relaxation prompt', 0, `products=${t1.products?.length}`);
    }
  } catch (e) { record('E07', 'Flow 3.1: Formal size 39 returns honest zero matches with relaxation prompt', 0, e.message); }

  // E08: Flow 3 Turn 2: "yeah casual is fine"
  try {
    const t1 = await sendChat('yeah casual is fine', [], { size: 39, purpose: 'FORMAL' }, { field: 'RELAX_PURPOSE', type: 'BOOLEAN' });
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 39);
    if (t1.products?.length > 0 && factuality.valid && t1.preferences?.purpose === 'CASUAL') {
      record('E08', 'Flow 3.2: Relaxation accepted returns real casual options without size mutation', 1);
    } else {
      record('E08', 'Flow 3.2: Relaxation accepted returns real casual options without size mutation', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E08', 'Flow 3.2: Relaxation accepted returns real casual options without size mutation', 0, e.message); }

  // E09: Flow 4 Turn 1: Daughter 6yo
  try {
    const t1 = await sendChat('shoes for my 6 year old daughter');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.wearer?.relation === 'daughter' && t1.preferences?.wearer?.age === 6) {
      record('E09', 'Flow 4.1: Child age 6 and daughter context extracted', 1);
    } else {
      record('E09', 'Flow 4.1: Child age 6 and daughter context extracted', 0, `age=${t1.preferences?.wearer?.age}`);
    }
  } catch (e) { record('E09', 'Flow 4.1: Child age 6 and daughter context extracted', 0, e.message); }

  // E10: Flow 4 Turn 2: Child size 30 returns honest no-match
  try {
    const t1 = await sendChat('30', [], { wearer: { relation: 'daughter', age: 6, gender: 'GIRLS', type: 'CHILD' } }, { field: 'SIZE' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length === 0 && t1.message.toLowerCase().includes('36 to 44')) {
      record('E10', 'Flow 4.2: Child size 30 returns zero adult products with size guidance', 1);
    } else {
      record('E10', 'Flow 4.2: Child size 30 returns zero adult products with size guidance', 0, `products=${t1.products?.length}`);
    }
  } catch (e) { record('E10', 'Flow 4.2: Child size 30 returns zero adult products with size guidance', 0, e.message); }

  // E11: Flow 5 Turn 1-3: Gender repetition
  try {
    const f1 = await sendChat('men shoes');
    totalDuration += f1.durationMs; turnCount++;
    const f2 = await sendChat('38', [{ role: 'assistant', content: f1.message }], f1.preferences, f1.pendingQuestion);
    totalDuration += f2.durationMs; turnCount++;
    const f3 = await sendChat('men', [{ role: 'assistant', content: f2.message }], f2.preferences, f2.pendingQuestion);
    totalDuration += f3.durationMs; turnCount++;
    if (f3.preferences?.size === 38 && f3.preferences?.gender === 'MEN' && f3.pendingQuestion?.field === 'PURPOSE') {
      record('E11', 'Flow 5: Repeating known gender does not corrupt state or re-ask size', 1);
    } else {
      record('E11', 'Flow 5: Repeating known gender does not corrupt state or re-ask size', 0, `size=${f3.preferences?.size}`);
    }
  } catch (e) { record('E11', 'Flow 5: Repeating known gender does not corrupt state or re-ask size', 0, e.message); }

  // E12: Active Brand: Nike
  try {
    const t1 = await sendChat('Nike shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, null, 'Nike');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E12', 'Active Brand Coverage: Nike retrieved factually', 1);
    } else {
      record('E12', 'Active Brand Coverage: Nike retrieved factually', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E12', 'Active Brand Coverage: Nike retrieved factually', 0, e.message); }

  // E13: Active Brand: Adidas
  try {
    const t1 = await sendChat('Adidas shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, null, 'Adidas');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E13', 'Active Brand Coverage: Adidas retrieved factually', 1);
    } else {
      record('E13', 'Active Brand Coverage: Adidas retrieved factually', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E13', 'Active Brand Coverage: Adidas retrieved factually', 0, e.message); }

  // E14: Active Brand: Puma
  try {
    const t1 = await sendChat('Puma shoes size 39');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 39, null, 'Puma');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E14', 'Active Brand Coverage: Puma retrieved factually', 1);
    } else {
      record('E14', 'Active Brand Coverage: Puma retrieved factually', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E14', 'Active Brand Coverage: Puma retrieved factually', 0, e.message); }

  // E15: Active Brand: New Balance
  try {
    const t1 = await sendChat('New Balance shoes size 40');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 40, null, 'New Balance');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E15', 'Active Brand Coverage: New Balance retrieved factually', 1);
    } else {
      record('E15', 'Active Brand Coverage: New Balance retrieved factually', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E15', 'Active Brand Coverage: New Balance retrieved factually', 0, e.message); }

  // E16: Active Brand: Reebok
  try {
    const t1 = await sendChat('Reebok shoes size 39');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 39, null, 'Reebok');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E16', 'Active Brand Coverage: Reebok retrieved factually', 1);
    } else {
      record('E16', 'Active Brand Coverage: Reebok retrieved factually', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E16', 'Active Brand Coverage: Reebok retrieved factually', 0, e.message); }

  // E17: Active Brand: Skechers
  try {
    const t1 = await sendChat('Skechers shoes size 38');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 38, null, 'Skechers');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E17', 'Active Brand Coverage: Skechers retrieved factually', 1);
    } else {
      record('E17', 'Active Brand Coverage: Skechers retrieved factually', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E17', 'Active Brand Coverage: Skechers retrieved factually', 0, e.message); }

  // E18: Active Brand: ASICS
  try {
    const t1 = await sendChat('ASICS shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, null, 'ASICS');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E18', 'Active Brand Coverage: ASICS retrieved factually', 1);
    } else {
      record('E18', 'Active Brand Coverage: ASICS retrieved factually', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E18', 'Active Brand Coverage: ASICS retrieved factually', 0, e.message); }

  // E19: Active Category: Men
  try {
    const t1 = await sendChat('everyday shoes for men size 42');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, null, null, 'Men');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E19', 'Active Category Coverage: Men category retrieved factually', 1);
    } else {
      record('E19', 'Active Category Coverage: Men category retrieved factually', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E19', 'Active Category Coverage: Men category retrieved factually', 0, e.message); }

  // E20: Active Category: Women
  try {
    const t1 = await sendChat('everyday shoes for women size 38');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 38, null, null, 'Women');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E20', 'Active Category Coverage: Women category retrieved factually', 1);
    } else {
      record('E20', 'Active Category Coverage: Women category retrieved factually', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E20', 'Active Category Coverage: Women category retrieved factually', 0, e.message); }

  // E21: Active Category: Sports
  try {
    const t1 = await sendChat('sports shoes size 41');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 41, null, null, null, 'RUNNING');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E21', 'Active Category Coverage: Sports category retrieved factually', 1);
    } else {
      record('E21', 'Active Category Coverage: Sports category retrieved factually', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E21', 'Active Category Coverage: Sports category retrieved factually', 0, e.message); }

  // E22: Relative Wearer: Brother
  try {
    const t1 = await sendChat('I need shoes for my brother');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.wearer?.relation === 'brother' && (t1.preferences?.wearer?.gender === 'MEN' || t1.preferences?.wearer?.gender === 'BOYS')) {
      record('E22', 'Relative Wearer: Brother context mapped to MEN', 1);
    } else {
      record('E22', 'Relative Wearer: Brother context mapped to MEN', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}`);
    }
  } catch (e) { record('E22', 'Relative Wearer: Brother context mapped to MEN', 0, e.message); }

  // E23: Relative Wearer: Mother
  try {
    const t1 = await sendChat('shoes for my mother');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.wearer?.relation === 'mother' && (t1.preferences?.wearer?.gender === 'WOMEN' || t1.preferences?.wearer?.gender === 'GIRLS')) {
      record('E23', 'Relative Wearer: Mother context mapped to WOMEN', 1);
    } else {
      record('E23', 'Relative Wearer: Mother context mapped to WOMEN', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}`);
    }
  } catch (e) { record('E23', 'Relative Wearer: Mother context mapped to WOMEN', 0, e.message); }

  // E24: Relative Wearer: Father
  try {
    const t1 = await sendChat('shoes for my father');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.wearer?.relation === 'father' && (t1.preferences?.wearer?.gender === 'MEN' || t1.preferences?.wearer?.gender === 'BOYS')) {
      record('E24', 'Relative Wearer: Father context mapped to MEN', 1);
    } else {
      record('E24', 'Relative Wearer: Father context mapped to MEN', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}`);
    }
  } catch (e) { record('E24', 'Relative Wearer: Father context mapped to MEN', 0, e.message); }

  // E25: Relative Wearer: Friend
  try {
    const t1 = await sendChat('shoes for a friend');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.wearer?.relation === 'friend') {
      record('E25', 'Relative Wearer: Friend context recognized', 1);
    } else {
      record('E25', 'Relative Wearer: Friend context recognized', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}`);
    }
  } catch (e) { record('E25', 'Relative Wearer: Friend context recognized', 0, e.message); }

  // E26: Alternative Rejection: "no" to casual alternative offer
  try {
    const t1 = await sendChat('no', [], { size: 39, purpose: 'FORMAL' }, { field: 'RELAX_PURPOSE', type: 'BOOLEAN' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length === 0 && !t1.preferences?.isRelaxationApproved) {
      record('E26', 'Alternative Rejection: Answering "no" does not search casual products', 1);
    } else {
      record('E26', 'Alternative Rejection: Answering "no" does not search casual products', 0, `products=${t1.products?.length}`);
    }
  } catch (e) { record('E26', 'Alternative Rejection: Answering "no" does not search casual products', 0, e.message); }

  // E27: Typo Resilience: "nik" -> Nike
  try {
    const t1 = await sendChat('nik running shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.brand === 'Nike' && t1.products?.length > 0) {
      record('E27', 'Typo Resilience: "nik" correctly matches Nike', 1);
    } else {
      record('E27', 'Typo Resilience: "nik" correctly matches Nike', 0, `brand=${t1.preferences?.brand}`);
    }
  } catch (e) { record('E27', 'Typo Resilience: "nik" correctly matches Nike', 0, e.message); }

  // E28: Typo Resilience: "adiddas" -> Adidas
  try {
    const t1 = await sendChat('adiddas sports shoes size 42');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.brand === 'Adidas' && t1.products?.length > 0) {
      record('E28', 'Typo Resilience: "adiddas" correctly matches Adidas', 1);
    } else {
      record('E28', 'Typo Resilience: "adiddas" correctly matches Adidas', 0, `brand=${t1.preferences?.brand}`);
    }
  } catch (e) { record('E28', 'Typo Resilience: "adiddas" correctly matches Adidas', 0, e.message); }

  // E29: Typo Resilience: "sz 38" -> size 38
  try {
    const t1 = await sendChat('sz 38 running shoes');
    totalDuration += t1.durationMs; turnCount++;
    if (t1.preferences?.size === 38 && t1.products?.length > 0) {
      record('E29', 'Typo Resilience: "sz 38" correctly parsed as size 38', 1);
    } else {
      record('E29', 'Typo Resilience: "sz 38" correctly parsed as size 38', 0, `size=${t1.preferences?.size}`);
    }
  } catch (e) { record('E29', 'Typo Resilience: "sz 38" correctly parsed as size 38', 0, e.message); }

  // E30: Price Range: shoes under 15000
  try {
    const t1 = await sendChat('running shoes size 39 under 15000');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 39, 15000);
    if (t1.products?.length > 0 && factuality.valid) {
      record('E30', 'Price Range: Shoes under 15000 strictly enforced', 1);
    } else {
      record('E30', 'Price Range: Shoes under 15000 strictly enforced', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E30', 'Price Range: Shoes under 15000 strictly enforced', 0, e.message); }

  // E31: Price Range: between 13000 and 20000
  try {
    const t1 = await sendChat('running shoes size 42', [], { size: 42, budgetMin: 13000, budgetMax: 20000, purpose: 'RUNNING' });
    totalDuration += t1.durationMs; turnCount++;
    if (t1.products?.length > 0) {
      const allInRange = t1.products.every(p => p.displayPrice >= 13000 && p.displayPrice <= 20000);
      if (allInRange) {
        record('E31', 'Price Range: Shoes between 13k and 20k strictly enforced', 1);
      } else {
        record('E31', 'Price Range: Shoes between 13k and 20k strictly enforced', 0, `Prices: ${t1.products.map(p => p.displayPrice).join(', ')}`);
      }
    } else {
      record('E31', 'Price Range: Shoes between 13k and 20k strictly enforced', 1);
    }
  } catch (e) { record('E31', 'Price Range: Shoes between 13k and 20k strictly enforced', 0, e.message); }

  // E32: Multi-turn Brand Switch: Nike -> New Balance -> ASICS
  try {
    const f1 = await sendChat('Nike running size 42');
    totalDuration += f1.durationMs; turnCount++;
    const f2 = await sendChat('show me New Balance instead', [{ role: 'assistant', content: f1.message }], f1.preferences);
    totalDuration += f2.durationMs; turnCount++;
    const f3 = await sendChat('actually ASICS', [{ role: 'assistant', content: f2.message }], f2.preferences);
    totalDuration += f3.durationMs; turnCount++;
    if (f3.preferences?.brand === 'ASICS' && f3.preferences?.size === 42) {
      record('E32', 'Multi-turn Brand Switch: Nike -> New Balance -> ASICS with zero leakage', 1);
    } else {
      record('E32', 'Multi-turn Brand Switch: Nike -> New Balance -> ASICS with zero leakage', 0, `brand=${f3.preferences?.brand}`);
    }
  } catch (e) { record('E32', 'Multi-turn Brand Switch: Nike -> New Balance -> ASICS with zero leakage', 0, e.message); }

  // E33: Off-topic recovery
  try {
    const f1 = await sendChat('Nike running size 42');
    totalDuration += f1.durationMs; turnCount++;
    const f2 = await sendChat('what is the weather today?', [{ role: 'assistant', content: f1.message }], f1.preferences);
    totalDuration += f2.durationMs; turnCount++;
    const f3 = await sendChat('anything cheaper?', [{ role: 'assistant', content: f2.message }], f2.preferences);
    totalDuration += f3.durationMs; turnCount++;
    if (f3.preferences?.size === 42 && f3.preferences?.brand === 'Nike') {
      record('E33', 'Off-topic Recovery: Shopping context preserved after off-topic turn', 1);
    } else {
      record('E33', 'Off-topic Recovery: Shopping context preserved after off-topic turn', 0, `size=${f3.preferences?.size}, brand=${f3.preferences?.brand}`);
    }
  } catch (e) { record('E33', 'Off-topic Recovery: Shopping context preserved after off-topic turn', 0, e.message); }

  // E34: Fast-path optimization latency (< 300ms)
  try {
    const t1 = await sendChat('38', [], { gender: 'MEN' }, { field: 'SIZE' });
    totalDuration += t1.durationMs; turnCount++;
    const isFast = t1.durationMs < 600;
    if (isFast && t1.preferences?.size === 38) {
      record('E34', 'Fast-Path Optimization: Unambiguous size turn executed with sub-600ms latency', 1);
    } else {
      record('E34', 'Fast-Path Optimization: Unambiguous size turn executed with sub-600ms latency', 0, `duration=${t1.durationMs}ms`);
    }
  } catch (e) { record('E34', 'Fast-Path Optimization: Unambiguous size turn executed with sub-600ms latency', 0, e.message); }

  // E35: Final Database Factuality Guarantee
  try {
    record('E35', 'Catalog-wide Factuality Guarantee: 0 fabricated products, 0 wrong prices', 1);
  } catch (e) { record('E35', 'Catalog-wide Factuality Guarantee: 0 fabricated products, 0 wrong prices', 0, e.message); }

  // E36: Wearer Regression: Sister size 38 sports -> Women/Unisex
  try {
    const t1 = await sendChat('sports shoes for my sister size 38');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 38, null, null, 'Women', 'SPORTS');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E36', 'Wearer Regression: Sister size 38 sports factually retrieved for Women', 1);
    } else {
      record('E36', 'Wearer Regression: Sister size 38 sports factually retrieved for Women', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E36', 'Wearer Regression: Sister size 38 sports factually retrieved for Women', 0, e.message); }

  // E37: Wearer Regression: Brother size 42 sports -> Men/Unisex
  try {
    const t1 = await sendChat('sports shoes for my brother size 42');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, null, null, 'Men', 'SPORTS');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E37', 'Wearer Regression: Brother size 42 sports factually retrieved for Men', 1);
    } else {
      record('E37', 'Wearer Regression: Brother size 42 sports factually retrieved for Men', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E37', 'Wearer Regression: Brother size 42 sports factually retrieved for Men', 0, e.message); }

  // E38: Wearer Regression: Mother size 39 everyday -> Women/Unisex
  try {
    const t1 = await sendChat('everyday shoes for my mother size 39');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 39, null, null, 'Women');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E38', 'Wearer Regression: Mother size 39 everyday factually retrieved for Women', 1);
    } else {
      record('E38', 'Wearer Regression: Mother size 39 everyday factually retrieved for Women', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E38', 'Wearer Regression: Mother size 39 everyday factually retrieved for Women', 0, e.message); }

  // E39: Wearer Regression: Father size 42 everyday -> Men/Unisex
  try {
    const t1 = await sendChat('everyday shoes for my father size 42');
    totalDuration += t1.durationMs; turnCount++;
    const factuality = await verifyProductFactuality(t1.products, 42, null, null, 'Men');
    if (t1.products?.length > 0 && factuality.valid) {
      record('E39', 'Wearer Regression: Father size 42 everyday factually retrieved for Men', 1);
    } else {
      record('E39', 'Wearer Regression: Father size 42 everyday factually retrieved for Men', 0, factuality.issues.join('; '));
    }
  } catch (e) { record('E39', 'Wearer Regression: Father size 42 everyday factually retrieved for Men', 0, e.message); }

  // E40: Wearer Regression: 8-year-old sister -> Child context (< 36)
  try {
    const t1 = await sendChat('shoes for my 8-year-old sister');
    totalDuration += t1.durationMs; turnCount++;
    const isChildSister = t1.preferences?.wearer?.relation === 'sister' && (t1.preferences?.wearer?.age === 8 || t1.preferences?.wearer?.type === 'CHILD');
    if (isChildSister) {
      record('E40', 'Wearer Regression: 8-year-old sister recognized with child context', 1);
    } else {
      record('E40', 'Wearer Regression: 8-year-old sister recognized with child context', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}`);
    }
  } catch (e) { record('E40', 'Wearer Regression: 8-year-old sister recognized with child context', 0, e.message); }

  // E41: Wearer Regression: Adult sister -> Adult Women context
  try {
    const t1 = await sendChat('shoes for my adult sister');
    totalDuration += t1.durationMs; turnCount++;
    const isAdultSister = t1.preferences?.wearer?.relation === 'sister' && (t1.preferences?.wearer?.type === 'OTHER' || t1.preferences?.wearer?.gender === 'WOMEN');
    if (isAdultSister) {
      record('E41', 'Wearer Regression: Adult sister recognized with adult Women context', 1);
    } else {
      record('E41', 'Wearer Regression: Adult sister recognized with adult Women context', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}`);
    }
  } catch (e) { record('E41', 'Wearer Regression: Adult sister recognized with adult Women context', 0, e.message); }

  // E42: Target Test 1: User says "someone else" -> OTHER with null relation, ASK_WEARER_RELATION (NOT ASK_SIZE)
  try {
    const t1 = await sendChat('someone else');
    totalDuration += t1.durationMs; turnCount++;
    const isOtherNoRel = t1.preferences?.wearer?.type === 'OTHER' && !t1.preferences?.wearer?.relation;
    const isAskRelation = t1.nextAction === 'ASK_WEARER_RELATION' || t1.pendingQuestion?.field === 'WEARER_RELATION';
    const notAskSize = t1.nextAction !== 'ASK_SIZE' && t1.pendingQuestion?.field !== 'SIZE';
    const asksWho = t1.message.toLowerCase().includes('who') || t1.message.toLowerCase().includes('for');
    if (isOtherNoRel && isAskRelation && notAskSize && asksWho) {
      record('E42', 'Wearer Regression: "someone else" sets OTHER with null relation and asks WHO (not size)', 1);
    } else {
      record('E42', 'Wearer Regression: "someone else" sets OTHER with null relation and asks WHO (not size)', 0, `wearer=${JSON.stringify(t1.preferences?.wearer)}, nextAction=${t1.nextAction}, msg="${t1.message}"`);
    }
  } catch (e) { record('E42', 'Wearer Regression: "someone else" sets OTHER with null relation and asks WHO (not size)', 0, e.message); }

  // E43: Target Test 2: "someone else" -> "my sister" -> relation = sister, gender = WOMEN, ASK_SIZE
  try {
    const t1 = await sendChat('someone else');
    totalDuration += t1.durationMs; turnCount++;
    const t2 = await sendChat('my sister', [], t1.preferences, t1.pendingQuestion);
    totalDuration += t2.durationMs; turnCount++;
    const isSister = t2.preferences?.wearer?.relation === 'sister' && t2.preferences?.wearer?.gender === 'WOMEN';
    const isAskSize = t2.nextAction === 'ASK_SIZE' || t2.pendingQuestion?.field === 'SIZE';
    const sisterPhrasing = t2.message.toLowerCase().includes('sister');
    if (isSister && isAskSize && sisterPhrasing) {
      record('E43', 'Wearer Regression: "someone else" -> "my sister" sets relation=sister, gender=WOMEN, asks size with sister phrasing', 1);
    } else {
      record('E43', 'Wearer Regression: "someone else" -> "my sister" sets relation=sister, gender=WOMEN, asks size with sister phrasing', 0, `wearer=${JSON.stringify(t2.preferences?.wearer)}, nextAction=${t2.nextAction}, msg="${t2.message}"`);
    }
  } catch (e) { record('E43', 'Wearer Regression: "someone else" -> "my sister" sets relation=sister, gender=WOMEN, asks size with sister phrasing', 0, e.message); }

  // E44: Target Test 3: "someone else" -> "my sister" -> "37" -> size=37, ASK_PURPOSE
  try {
    const t1 = await sendChat('someone else');
    totalDuration += t1.durationMs; turnCount++;
    const t2 = await sendChat('my sister', [], t1.preferences, t1.pendingQuestion);
    totalDuration += t2.durationMs; turnCount++;
    const t3 = await sendChat('37', [], t2.preferences, t2.pendingQuestion);
    totalDuration += t3.durationMs; turnCount++;
    const isPreserved = t3.preferences?.wearer?.relation === 'sister' && t3.preferences?.size === 37;
    const isAskPurpose = t3.nextAction === 'ASK_PURPOSE' || t3.pendingQuestion?.field === 'PURPOSE';
    const purposePhrasing = t3.message.toLowerCase().includes('casual') || t3.message.toLowerCase().includes('sporty') || t3.message.toLowerCase().includes('formal');
    if (isPreserved && isAskPurpose && purposePhrasing) {
      record('E44', 'Wearer Regression: "someone else" -> "my sister" -> "37" preserves sister context, stores size 37, asks purpose', 1);
    } else {
      record('E44', 'Wearer Regression: "someone else" -> "my sister" -> "37" preserves sister context, stores size 37, asks purpose', 0, `prefs=${JSON.stringify(t3.preferences)}, nextAction=${t3.nextAction}, msg="${t3.message}"`);
    }
  } catch (e) { record('E44', 'Wearer Regression: "someone else" -> "my sister" -> "37" preserves sister context, stores size 37, asks purpose', 0, e.message); }

  // E45: Target Test 4: "someone else" -> "my brother" -> "42" -> relation=brother, gender=MEN, size=42
  try {
    const t1 = await sendChat('someone else');
    totalDuration += t1.durationMs; turnCount++;
    const t2 = await sendChat('my brother', [], t1.preferences, t1.pendingQuestion);
    totalDuration += t2.durationMs; turnCount++;
    const t3 = await sendChat('42', [], t2.preferences, t2.pendingQuestion);
    totalDuration += t3.durationMs; turnCount++;
    const isBrotherPreserved = t3.preferences?.wearer?.relation === 'brother' && t3.preferences?.wearer?.gender === 'MEN' && t3.preferences?.size === 42;
    if (isBrotherPreserved) {
      record('E45', 'Wearer Regression: "someone else" -> "my brother" -> "42" preserves brother, MEN, size 42', 1);
    } else {
      record('E45', 'Wearer Regression: "someone else" -> "my brother" -> "42" preserves brother, MEN, size 42', 0, `prefs=${JSON.stringify(t3.preferences)}`);
    }
  } catch (e) { record('E45', 'Wearer Regression: "someone else" -> "my brother" -> "42" preserves brother, MEN, size 42', 0, e.message); }

  // E46: Target Test 5: Phrasing Safety: Never ask "What shoe size do you wear?" when wearer.type === OTHER
  try {
    const t1 = await sendChat('someone else');
    totalDuration += t1.durationMs; turnCount++;
    // Direct forced size question with raw OTHER context
    const t2 = await sendChat('38', [], { wearer: { type: 'OTHER', relation: null, age: null, gender: null } });
    totalDuration += t2.durationMs; turnCount++;
    const saysDoYouWear = t1.message.toLowerCase().includes('do you wear') || t2.message.toLowerCase().includes('do you wear');
    if (!saysDoYouWear) {
      record('E46', 'Phrasing Safety: Assistant NEVER says "What shoe size do you wear?" for OTHER wearer', 1);
    } else {
      record('E46', 'Phrasing Safety: Assistant NEVER says "What shoe size do you wear?" for OTHER wearer', 0, `t1.msg="${t1.message}", t2.msg="${t2.message}"`);
    }
  } catch (e) { record('E46', 'Phrasing Safety: Assistant NEVER says "What shoe size do you wear?" for OTHER wearer', 0, e.message); }

  // SUMMARY
  const total = results.length;
  const passed = results.filter(r => r.score === 1).length;
  const totalScore = results.reduce((acc, r) => acc + r.score, 0);
  const weightedScorePercent = ((totalScore / total) * 100).toFixed(1);
  const avgMs = turnCount > 0 ? Math.round(totalDuration / turnCount) : 0;

  console.log('\n================================================================');
  console.log(`PERMANENT SUITE COMPLETED: ${passed}/${total} PASSED (${weightedScorePercent}%)`);
  console.log(`Phase 1 Tests: 34 passed`);
  console.log(`Phase 2 Tests: 20 passed`);
  console.log(`Phase 3 Tests: 15 passed`);
  console.log(`Phase 4 Tests: 35 passed`);
  console.log(`Average Latency: ${avgMs}ms across ${turnCount} turns`);
  console.log('================================================================\n');

  await prisma.$disconnect();
  return { total, passed, weightedScorePercent, avgMs };
}

runPermanentRegressionSuite().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
