async function testQuery(userMessage, turnNumber) {
  console.log(`\n==================================================`);
  console.log(`TURN ${turnNumber}: "${userMessage}"`);
  console.log(`==================================================`);
  const start = Date.now();
  try {
    const res = await fetch('http://localhost:3001/api/v1/shopping-assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
      },
      body: JSON.stringify({ message: userMessage }),
    });
    const data = await res.json();
    const duration = Date.now() - start;
    console.log(`Time taken: ${duration}ms`);
    console.log(`Assistant Reply:\n"${data.message}"`);
    console.log(`Products Count: ${data.products?.length || 0}`);
    if (data.products?.length > 0) {
      console.log(`Products: ${data.products.map(p => p.name).join(', ')}`);
    }
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  await testQuery('hii', 1);
  await testQuery('what shoes go best with navy chinos for an evening event?', 2);
  await testQuery('recommend me some comfortable running shoes for 10km daily', 3);
  await testQuery('show me black loafers for men', 4);
}

run();
