const http = require("http");

const payload = JSON.stringify({
  message: "I need black formal shoes for office",
});

console.log("Sending request...");
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
    timeout: 15000,
  },
  (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      console.log("STATUS:", res.statusCode);
      console.log("BODY:", JSON.parse(data));
      process.exit(0);
    });
  }
);

req.on("error", (e) => {
  console.error("ERR:", e);
  process.exit(1);
});

req.on("timeout", () => {
  console.error("TIMEOUT!");
  req.destroy();
  process.exit(1);
});

req.write(payload);
req.end();
