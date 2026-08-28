import { Test, TestingModule } from "@nestjs/testing";
import { AdminCustomersService } from "./admin-customers.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { NotFoundException } from "@nestjs/common";
import { ChatMessageRole } from "@prisma/client";

describe("AdminCustomersService", () => {
  let service: AdminCustomersService;
  let prisma: {
    $queryRaw: jest.Mock;
    user: { findUnique: jest.Mock; update: jest.Mock };
    chatConversation: { findMany: jest.Mock; findUnique: jest.Mock };
    order: { findMany: jest.Mock };
    product: { findMany: jest.Mock };
    refreshSession: { deleteMany: jest.Mock };
  };
  let auditService: { logAction: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      chatConversation: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      refreshSession: {
        deleteMany: jest.fn(),
      },
    };

    auditService = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AdminCustomersService>(AdminCustomersService);
  });

  describe("findAll - Customer Activity and Sorting", () => {
    it("sorts customers by newest customer activity (Chat > Order > Inactive)", async () => {
      const now = new Date();
      const customerA_Chat = new Date(now.getTime() - 5 * 60 * 1000); // 5 min ago
      const customerB_Order = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
      const customerC_Created = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      prisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(3) }]) // count query
        .mockResolvedValueOnce([
          // data query ordered by lastActivityAt DESC
          {
            id: "cust-a",
            fullName: "Customer A",
            email: "a@example.com",
            phone: "03001111111",
            role: "CUSTOMER",
            isActive: true,
            createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
            updatedAt: customerA_Chat,
            orderCount: 0,
            reviewCount: 0,
            returnCount: 0,
            totalSpent: 0,
            lastActivityAt: customerA_Chat,
            lastActivityType: "CHAT_MESSAGE",
          },
          {
            id: "cust-b",
            fullName: "Customer B",
            email: "b@example.com",
            phone: "03002222222",
            role: "CUSTOMER",
            isActive: true,
            createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            updatedAt: customerB_Order,
            orderCount: 1,
            reviewCount: 0,
            returnCount: 0,
            totalSpent: 5000,
            lastActivityAt: customerB_Order,
            lastActivityType: "ORDER_PLACED",
          },
          {
            id: "cust-c",
            fullName: "Customer C",
            email: "c@example.com",
            phone: "03003333333",
            role: "CUSTOMER",
            isActive: true,
            createdAt: customerC_Created,
            updatedAt: customerC_Created,
            orderCount: 0,
            reviewCount: 0,
            returnCount: 0,
            totalSpent: 0,
            lastActivityAt: customerC_Created,
            lastActivityType: "ACCOUNT_CREATED",
          },
        ]);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(3);
      expect(result.data[0].id).toBe("cust-a");
      expect(result.data[0].lastActivityType).toBe("CHAT_MESSAGE");
      expect(result.data[0].lastActivityAt).toEqual(customerA_Chat);

      expect(result.data[1].id).toBe("cust-b");
      expect(result.data[1].lastActivityType).toBe("ORDER_PLACED");
      expect(result.data[1].lastActivityAt).toEqual(customerB_Order);

      expect(result.data[2].id).toBe("cust-c");
      expect(result.data[2].lastActivityType).toBe("ACCOUNT_CREATED");
      expect(result.data[2].lastActivityAt).toEqual(customerC_Created);
    });

    it("respects search and active filter", async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([
          {
            id: "cust-a",
            fullName: "Customer A",
            email: "a@example.com",
            phone: "03001111111",
            role: "CUSTOMER",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            orderCount: 1,
            reviewCount: 0,
            returnCount: 0,
            totalSpent: 12000,
            lastActivityAt: new Date(),
            lastActivityType: "ORDER_PLACED",
          },
        ]);

      const result = await service.findAll({ search: "Customer A", isActive: "true", page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe("getCustomerConversations", () => {
    it("returns sorted conversation summaries newest first", async () => {
      const customerId = "cust-1";
      prisma.user.findUnique.mockResolvedValueOnce({
        id: customerId,
        fullName: "Test User",
        email: "test@example.com",
      });

      const date1 = new Date("2026-08-28T12:00:00Z");
      const date2 = new Date("2026-08-27T10:00:00Z");

      prisma.chatConversation.findMany.mockResolvedValueOnce([
        {
          id: "conv-1",
          createdAt: date1,
          updatedAt: date1,
          _count: { messages: 8 },
          messages: [{ content: "Looking for running shoes", createdAt: date1, role: ChatMessageRole.USER }],
        },
        {
          id: "conv-2",
          createdAt: date2,
          updatedAt: date2,
          _count: { messages: 4 },
          messages: [{ content: "What is your return policy?", createdAt: date2, role: ChatMessageRole.USER }],
        },
      ]);

      const result = await service.getCustomerConversations(customerId);

      expect(result.customerId).toBe(customerId);
      expect(result.totalConversations).toBe(2);
      expect(result.latestConversationAt).toEqual(date1);
      expect(result.conversations[0].id).toBe("conv-1");
      expect(result.conversations[0].messageCount).toBe(8);
      expect(result.conversations[0].lastMessageSnippet).toContain("Looking for running shoes");
      expect(result.conversations[1].id).toBe("conv-2");
    });

    it("returns clean empty state when customer has no conversations", async () => {
      const customerId = "cust-2";
      prisma.user.findUnique.mockResolvedValueOnce({
        id: customerId,
        fullName: "Empty User",
        email: "empty@example.com",
      });

      prisma.chatConversation.findMany.mockResolvedValueOnce([]);

      const result = await service.getCustomerConversations(customerId);

      expect(result.totalConversations).toBe(0);
      expect(result.latestConversationAt).toBeNull();
      expect(result.conversations).toEqual([]);
    });

    it("throws NotFoundException if customer does not exist", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.getCustomerConversations("non-existent")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getCustomerConversationDetail", () => {
    it("returns messages in chronological order and resolves product recommendation cards", async () => {
      const customerId = "cust-1";
      const convId = "conv-1";

      prisma.user.findUnique.mockResolvedValueOnce({ id: customerId });
      prisma.chatConversation.findUnique.mockResolvedValueOnce({
        id: convId,
        userId: customerId,
        createdAt: new Date("2026-08-28T10:00:00Z"),
        updatedAt: new Date("2026-08-28T10:05:00Z"),
        messages: [
          {
            id: "msg-1",
            role: ChatMessageRole.USER,
            content: "I need running shoes for my sister in size 38",
            createdAt: new Date("2026-08-28T10:00:00Z"),
            metadata: null,
          },
          {
            id: "msg-2",
            role: ChatMessageRole.ASSISTANT,
            content: "Here are some great options in size 38:",
            createdAt: new Date("2026-08-28T10:00:05Z"),
            metadata: { productIds: ["prod-101"] },
          },
        ],
      });

      prisma.product.findMany.mockResolvedValueOnce([
        {
          id: "prod-101",
          name: "Nike Pegasus 40",
          slug: "nike-pegasus-40",
          basePrice: 18500,
          salePrice: null,
          brand: { name: "Nike" },
          category: { name: "Sports" },
          images: [{ url: "https://example.com/pegasus.jpg", isPrimary: true, sortOrder: 0 }],
          variants: [
            {
              size: 38,
              inventory: { quantityOnHand: 5, reservedQuantity: 1 },
            },
          ],
        },
      ]);

      const result = await service.getCustomerConversationDetail(customerId, convId);

      expect(result.id).toBe(convId);
      expect(result.customerId).toBe(customerId);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content).toContain("running shoes");
      expect(result.messages[1].role).toBe("assistant");
      expect(result.messages[1].products).toBeDefined();
      expect(result.messages[1].products?.[0].name).toBe("Nike Pegasus 40");
      expect(result.messages[1].products?.[0].brand).toBe("Nike");
      expect(result.messages[1].products?.[0].inStock).toBe(true);
      expect(result.messages[1].products?.[0].availableSizes).toContain(38);
    });

    it("prevents Customer A from accessing Customer B conversations (data isolation)", async () => {
      const customerId = "cust-1";
      const otherCustomerId = "cust-2";
      const convId = "conv-belonging-to-cust-2";

      prisma.user.findUnique.mockResolvedValueOnce({ id: customerId });
      prisma.chatConversation.findUnique.mockResolvedValueOnce({
        id: convId,
        userId: otherCustomerId, // belongs to Customer B
        messages: [],
      });

      await expect(service.getCustomerConversationDetail(customerId, convId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
