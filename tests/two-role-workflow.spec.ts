import { test, expect, type Browser, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

// Import Prisma client from server
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const prisma = new PrismaClient();

const PROD_URL = "https://e-commerce-website-theta-two-93.vercel.app";

const TEST_CUSTOMER = {
  email: "qa_customer_test@example.com",
  password: "Test12345!",
  fullName: "QA Customer",
  phone: "+923001234567",
};

// Admin Account Resolution
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || "qa_audit_1787671510862@example.com",
  password: process.env.ADMIN_PASSWORD || "Password123!",
};

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe.serial("Two-Role Production Workflow Test: Customer + Admin + Database Verification", () => {
  let customerPage: Page;
  let adminPage: Page;

  let createdUserId = "";
  let targetProduct: any = null;
  let targetVariant: any = null;
  let stockBefore = 0;
  let createdOrderId = "";
  let orderNumber = "";

  test.beforeAll(async ({ browser }) => {
    // Verify admin exists in database
    const adminUser = await prisma.user.findFirst({
      where: {
        email: ADMIN_CREDENTIALS.email,
        role: "ADMIN",
      },
    });

    if (!adminUser) {
      throw new Error(
        `[CRITICAL BLOCKER] Admin account "${ADMIN_CREDENTIALS.email}" not found with role ADMIN. Cannot execute admin workflow.`
      );
    }
    console.log(`[SETUP] Verified Admin Account: ${adminUser.email} (ID: ${adminUser.id})`);

    // Clean up existing customer test account
    const existing = await prisma.user.findUnique({
      where: { email: TEST_CUSTOMER.email },
    });
    if (existing) {
      console.log(`[SETUP] Cleaning up previous test customer: ${existing.id}`);
      await prisma.inventoryAdjustment?.deleteMany({ where: { performedById: existing.id } }).catch(() => {});
      await prisma.orderStatusHistory?.deleteMany({ where: { order: { userId: existing.id } } }).catch(() => {});
      await prisma.payment?.deleteMany({ where: { order: { userId: existing.id } } }).catch(() => {});
      await prisma.orderItem?.deleteMany({ where: { order: { userId: existing.id } } }).catch(() => {});
      await prisma.order?.deleteMany({ where: { userId: existing.id } }).catch(() => {});
      await prisma.checkoutSession?.deleteMany({ where: { userId: existing.id } }).catch(() => {});
      await prisma.address?.deleteMany({ where: { userId: existing.id } }).catch(() => {});
      await prisma.cartItem?.deleteMany({ where: { cart: { userId: existing.id } } }).catch(() => {});
      await prisma.cart?.deleteMany({ where: { userId: existing.id } }).catch(() => {});
      await prisma.wishlistItem?.deleteMany({ where: { wishlist: { userId: existing.id } } }).catch(() => {});
      await prisma.wishlist?.deleteMany({ where: { userId: existing.id } }).catch(() => {});
      await prisma.emailVerificationToken?.deleteMany({ where: { userId: existing.id } }).catch(() => {});
      await prisma.refreshSession?.deleteMany({ where: { userId: existing.id } }).catch(() => {});
      await prisma.user?.delete({ where: { id: existing.id } }).catch(() => {});
    }

    // Identify target product and in-stock variant
    targetProduct = await prisma.product.findFirst({
      where: {
        slug: "nike-air-force-1-07",
        isActive: true,
      },
      include: {
        variants: {
          where: { size: 42, color: "White" },
          include: { inventory: true },
        },
      },
    });

    targetVariant = targetProduct.variants[0];
    stockBefore = targetVariant.inventory.quantityOnHand;
    console.log(`[SETUP] Target Product: ${targetProduct.name}`);
    console.log(`[SETUP] Target Variant: ID ${targetVariant.id} | Size: ${targetVariant.size} | Color: ${targetVariant.color}`);
    console.log(`[SETUP] Stock Level Before Purchase: ${stockBefore}`);

    // Initialize distinct browser pages
    customerPage = await browser.newPage();
    adminPage = await browser.newPage();
  });

  test.afterAll(async () => {
    await customerPage?.close();
    await adminPage?.close();
    await prisma.$disconnect();
  });

  // ── ROLE 1: CUSTOMER JOURNEY ──────────────────────────────────────────────

  test("Step 1: Customer Account Registration", async () => {
    await customerPage.goto(`${PROD_URL}/register`, { waitUntil: "networkidle" });
    await expect(customerPage.locator("header")).toBeVisible();

    await customerPage.fill("#registerName", TEST_CUSTOMER.fullName);
    await customerPage.fill("#registerEmail", TEST_CUSTOMER.email);
    await customerPage.fill("#registerPhone", TEST_CUSTOMER.phone);
    await customerPage.fill("#registerPassword", TEST_CUSTOMER.password);
    await customerPage.fill("#confirmPassword", TEST_CUSTOMER.password);

    await customerPage.locator('main button[type="submit"]').first().click();
    await customerPage.waitForTimeout(4000);

    const dbUser = await prisma.user.findUnique({
      where: { email: TEST_CUSTOMER.email },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser?.email).toBe(TEST_CUSTOMER.email);
    expect(dbUser?.role).toBe("CUSTOMER");
    createdUserId = dbUser!.id;

    console.log(`[CUSTOMER PASS] Registered user in DB: ID ${createdUserId}`);
  });

  test("Step 2: Customer Email Verification via Database", async () => {
    const userBefore = await prisma.user.findUnique({
      where: { id: createdUserId },
    });
    expect(userBefore?.emailVerifiedAt).toBeNull();

    const verifiedTimestamp = new Date();
    const userAfter = await prisma.user.update({
      where: { id: createdUserId },
      data: { emailVerifiedAt: verifiedTimestamp },
    });

    expect(userAfter.emailVerifiedAt).not.toBeNull();
    console.log(`[CUSTOMER PASS] Email verified at: ${userAfter.emailVerifiedAt?.toISOString()}`);
  });

  test("Step 3: Customer Login & Session Establishment", async () => {
    await customerPage.goto(`${PROD_URL}/login`, { waitUntil: "networkidle" });
    await customerPage.fill("#loginEmail", TEST_CUSTOMER.email);
    await customerPage.fill("#loginPassword", TEST_CUSTOMER.password);

    await customerPage.locator('main button[type="submit"]').first().click();
    await customerPage.waitForTimeout(4000);

    await customerPage.goto(`${PROD_URL}/account/profile`, { waitUntil: "networkidle" });
    await expect(customerPage.locator("h1, h2, div").filter({ hasText: /profile|account/i }).first()).toBeVisible();
    console.log("[CUSTOMER PASS] Customer logged in successfully.");
  });

  test("Step 4: Product Discovery, Size Selection & Add to Cart", async () => {
    await customerPage.goto(`${PROD_URL}/products/${targetProduct.slug}`, { waitUntil: "networkidle" });
    await expect(customerPage.locator("h1")).toContainText(targetProduct.name);

    // Select Size 42
    const sizeBtn = customerPage.locator('button:has-text("42")').first();
    await sizeBtn.click();
    await customerPage.waitForTimeout(500);

    // Add to Cart
    await customerPage.getByRole("button", { name: /add to cart/i }).click();
    await customerPage.waitForTimeout(1500);

    // Verify in Cart Page
    await customerPage.goto(`${PROD_URL}/cart`, { waitUntil: "networkidle" });
    await expect(customerPage.locator(`text=${targetProduct.name}`).first()).toBeVisible();
    console.log("[CUSTOMER PASS] Product added to cart and verified.");
  });

  test("Step 5: Checkout & Order Placement", async () => {
    await customerPage.goto(`${PROD_URL}/checkout`, { waitUntil: "networkidle" });
    await expect(customerPage.locator("h1")).toContainText(/complete your order|checkout/i);

    // Fill delivery address if present
    const recipientInput = customerPage.locator('input[placeholder*="Recipient Full Name" i]');
    if (await recipientInput.isVisible()) {
      await recipientInput.fill(TEST_CUSTOMER.fullName);
      await customerPage.fill('input[placeholder*="Phone Number" i]', TEST_CUSTOMER.phone);
      await customerPage.fill('input[placeholder*="Address Line 1" i]', "123 QA Boulevard");
      await customerPage.fill('input[placeholder*="City" i]', "Karachi");
      await customerPage.fill('input[placeholder*="State" i]', "Sindh");
      await customerPage.fill('input[placeholder*="Postal" i]', "74000");

      const saveAddressBtn = customerPage.locator('button:has-text("Save Address")');
      await saveAddressBtn.click();
      await customerPage.waitForTimeout(3000);
    }

    // Select Cash on Delivery
    const codOption = customerPage.locator('label:has-text("Cash on Delivery"), input[value="CASH_ON_DELIVERY"], button:has-text("Cash on Delivery")').first();
    if (await codOption.isVisible()) {
      await codOption.click();
      await customerPage.waitForTimeout(500);
    }

    // Place Order
    const placeOrderBtn = customerPage.locator('button:has-text("Place Order")').first();
    await expect(placeOrderBtn).toBeEnabled({ timeout: 15000 });
    await placeOrderBtn.click();

    // Wait for redirect to order confirmation
    await customerPage.waitForURL(/\/order-success|\/orders|\/account/, { timeout: 25000 });
    await customerPage.waitForTimeout(2000);

    // Screenshot 1: Customer checkout success
    await customerPage.screenshot({ path: path.join(SCREENSHOTS_DIR, "01_customer_checkout_success.png") });
    console.log("[CUSTOMER PASS] Checkout completed. Screenshot saved: 01_customer_checkout_success.png");

    // Navigate to customer orders list & capture Screenshot 2
    await customerPage.goto(`${PROD_URL}/account/orders`, { waitUntil: "networkidle" });
    await customerPage.waitForTimeout(2000);
    await customerPage.screenshot({ path: path.join(SCREENSHOTS_DIR, "02_customer_order_page.png") });
    console.log("[CUSTOMER PASS] Customer order history view. Screenshot saved: 02_customer_order_page.png");
  });

  // ── DATABASE VERIFICATION 1 ───────────────────────────────────────────────

  test("Step 6: Database Verification Post-Order (Order, Inventory, Adjustment)", async () => {
    // 1. Confirm Order created
    const dbOrder = await prisma.order.findFirst({
      where: { userId: createdUserId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    expect(dbOrder).not.toBeNull();
    createdOrderId = dbOrder!.id;
    orderNumber = dbOrder!.orderNumber;
    console.log(`[DB PASS] Order Created: ID ${createdOrderId} | Number: ${orderNumber} | Total: ${dbOrder?.total}`);

    // 2. Confirm Inventory decreased by 1
    const variantAfter = await prisma.productVariant.findUnique({
      where: { id: targetVariant.id },
      include: { inventory: true },
    });
    const stockAfter = variantAfter?.inventory?.quantityOnHand || 0;
    console.log(`[DB PASS] Stock Deduction: Before = ${stockBefore}, After = ${stockAfter}`);
    expect(stockAfter).toBe(stockBefore - 1);

    // 3. Confirm InventoryAdjustment record
    const adjustment = await prisma.inventoryAdjustment.findFirst({
      where: { inventoryId: targetVariant.inventory.id },
      orderBy: { createdAt: "desc" },
    });
    expect(adjustment).not.toBeNull();
    expect(adjustment?.onHandDelta).toBe(-1);
    console.log(`[DB PASS] InventoryAdjustment logged: ID ${adjustment?.id} | Delta: ${adjustment?.onHandDelta} | Reason: ${adjustment?.reason}`);
  });

  // ── ROLE 2: ADMIN PORTAL JOURNEY ──────────────────────────────────────────

  test("Step 7: Admin Login & Dashboard Navigation", async () => {
    await adminPage.goto(`${PROD_URL}/login`, { waitUntil: "networkidle" });
    await adminPage.fill("#loginEmail", ADMIN_CREDENTIALS.email);
    await adminPage.fill("#loginPassword", ADMIN_CREDENTIALS.password);

    await adminPage.locator('main button[type="submit"]').first().click();
    await adminPage.waitForTimeout(4000);

    // Open Admin Dashboard
    await adminPage.goto(`${PROD_URL}/admin`, { waitUntil: "networkidle" });
    await expect(adminPage.locator("h1, h2, span").filter({ hasText: /dashboard|admin/i }).first()).toBeVisible();
    console.log("[ADMIN PASS] Admin authenticated and opened dashboard.");
  });

  test("Step 8: Admin Order Management & Status Transition (Pending/Confirmed -> Processing)", async () => {
    // Navigate to Admin Orders list
    await adminPage.goto(`${PROD_URL}/admin/orders`, { waitUntil: "networkidle" });
    await expect(adminPage.locator("h1")).toContainText(/order logs|orders/i);

    // Screenshot 3: Admin order page
    await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, "03_admin_order_page.png") });
    console.log("[ADMIN PASS] Admin orders list view. Screenshot saved: 03_admin_order_page.png");

    // Open newly created order detail
    await adminPage.goto(`${PROD_URL}/admin/orders/${createdOrderId}`, { waitUntil: "networkidle" });
    await expect(adminPage.locator(`text=${orderNumber}`).first()).toBeVisible({ timeout: 15000 });

    // Change status from select dropdown to PROCESSING
    const statusSelect = adminPage.locator("select").first();
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption("PROCESSING");
    await adminPage.waitForTimeout(3000);

    // Verify UI reflects the change (select value or success alert)
    await expect(statusSelect).toHaveValue("PROCESSING");

    // Screenshot 4: Approved/Processing order status
    await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, "04_admin_approved_status.png") });
    console.log("[ADMIN PASS] Order status updated to PROCESSING. Screenshot saved: 04_admin_approved_status.png");
  });

  // ── DATABASE VERIFICATION 2 ───────────────────────────────────────────────

  test("Step 9: Database Verification Post-Admin (Status Updated & Stock Safety)", async () => {
    // 1. Confirm order status in database is PROCESSING
    const orderPostAdmin = await prisma.order.findUnique({
      where: { id: createdOrderId },
    });
    console.log(`[DB PASS] Database Order Status: ${orderPostAdmin?.status}`);
    expect(orderPostAdmin?.status).toBe("PROCESSING");

    // 2. Confirm inventory did NOT decrease again
    const variantPostAdmin = await prisma.productVariant.findUnique({
      where: { id: targetVariant.id },
      include: { inventory: true },
    });
    const stockPostAdmin = variantPostAdmin?.inventory?.quantityOnHand || 0;
    console.log(`[DB PASS] Stock after admin status change: ${stockPostAdmin} (Expected: ${stockBefore - 1})`);
    expect(stockPostAdmin).toBe(stockBefore - 1);
    console.log("[DB PASS] Inventory verified untouched post-admin status transition.");
  });
});
