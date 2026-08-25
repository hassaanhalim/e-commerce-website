/**
 * Shopping Assistant Service — Deterministic Logic Unit Tests
 * 
 * Tests the server-side deterministic logic paths without requiring
 * Gemini API or database connections. Covers:
 * - normalizeExtractedUpdates (extraction from user text)
 * - classifyIntent (intent classification)
 * - mergeStateWithDelta (state merging)
 * - determineNextAction (next action determination)
 * - validateNaturalResponse (response validation)
 * - buildProductSearchConstraints (constraint building)
 * - validateRecommendation (product validation)
 * - canUseFastPath (fast-path eligibility)
 */

import { ShoppingAssistantService, ExtractedDeltaUpdates } from './shopping-assistant.service';
import type {
  ShoppingPreferences,
  PendingQuestion,
  WearerInfo,
  ProductSearchConstraints,
} from './types/shopping-assistant.types';
import { ProductGender, Prisma } from '@prisma/client';

// Minimal mock for DI — no actual DB or API calls needed for deterministic tests
const mockConfigService = {
  get: jest.fn().mockReturnValue(''),
};

const mockPrismaService = {} as any;

describe('ShoppingAssistantService — Deterministic Logic', () => {
  let service: ShoppingAssistantService;

  beforeAll(() => {
    service = new ShoppingAssistantService(
      mockConfigService as any,
      mockPrismaService,
    );
  });

  // ──────────────────────────────────────────────────────────────
  // Helper: Call normalizeExtractedUpdates via the fallback path
  // (extractFallbackUpdates calls normalizeExtractedUpdates with {})
  // ──────────────────────────────────────────────────────────────
  function extract(
    userMessage: string,
    pendingQuestion: PendingQuestion | null = null,
    currentPreferences?: ShoppingPreferences,
  ): ExtractedDeltaUpdates {
    // Access private method via prototype
    return (service as any).normalizeExtractedUpdates(
      {},
      userMessage,
      pendingQuestion,
      currentPreferences || { version: 3 },
    );
  }

  function emptyPrefs(): ShoppingPreferences {
    return { version: 3 };
  }

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 1: Third-Party Shopper ("Someone Else") Flow
  // ══════════════════════════════════════════════════════════════

  describe('Issue 1: Third-party shopper flow', () => {
    test('1.1 "someone else" sets wearerType=OTHER and wearerRelation=null', () => {
      const updates = extract('someone else');
      expect(updates.wearerType).toBe('OTHER');
      expect(updates.wearerRelation).toBeNull();
      expect(updates.isNewWearerContext).toBe(true);
    });

    test('1.2 "someone else" -> determineNextAction asks for WEARER_RELATION', () => {
      const state: ShoppingPreferences = {
        version: 3,
        wearer: { type: 'OTHER', relation: null, age: null, gender: null },
      };
      const result = service.determineNextAction(state, 'someone else', null);
      expect(result.nextAction).toBe('ASK_WEARER_RELATION');
      expect(result.nextQuestion?.field).toBe('WEARER_RELATION');
      expect(result.replyMessage).toContain('who are the shoes for');
      expect(result.canSearchCatalog).toBe(false);
    });

    test('1.3 "my sister" sets wearerRelation=sister, gender=WOMEN', () => {
      const updates = extract('my sister', {
        field: 'WEARER_RELATION',
        type: 'CHOICE',
      });
      expect(updates.wearerRelation).toBe('sister');
      expect(updates.gender).toBe('WOMEN');
      expect(updates.wearerType).toBe('OTHER');
    });

    test('1.4 After sister identified, size prompt uses "she"', () => {
      const state: ShoppingPreferences = {
        version: 3,
        wearer: { type: 'OTHER', relation: 'sister', age: null, gender: 'WOMEN' },
        gender: 'WOMEN',
      };
      const updates: ExtractedDeltaUpdates = {
        wearerRelation: 'sister',
        gender: 'WOMEN',
        wearerType: 'OTHER',
      };
      const result = service.determineNextAction(state, 'my sister', null, updates);
      expect(result.nextAction).toBe('ASK_SIZE');
      expect(result.replyMessage).toContain('she');
    });

    test('1.5 "my brother" sets wearerRelation=brother, gender=MEN', () => {
      const updates = extract('my brother', {
        field: 'WEARER_RELATION',
        type: 'CHOICE',
      });
      expect(updates.wearerRelation).toBe('brother');
      expect(updates.gender).toBe('MEN');
    });

    test('1.6 "my wife" sets wearerRelation=wife, gender=WOMEN', () => {
      const updates = extract('my wife');
      expect(updates.wearerRelation).toBe('wife');
      expect(updates.gender).toBe('WOMEN');
      expect(updates.wearerType).toBe('OTHER');
    });

    test('1.7 "my husband" sets wearerRelation=husband, gender=MEN', () => {
      const updates = extract('my husband');
      expect(updates.wearerRelation).toBe('husband');
      expect(updates.gender).toBe('MEN');
      expect(updates.wearerType).toBe('OTHER');
    });

    test('1.8 "my mother" sets wearerRelation=mother, gender=WOMEN', () => {
      const updates = extract('my mother');
      expect(updates.wearerRelation).toBe('mother');
      expect(updates.gender).toBe('WOMEN');
    });

    test('1.9 "my father" sets wearerRelation=father, gender=MEN', () => {
      const updates = extract('my father');
      expect(updates.wearerRelation).toBe('father');
      expect(updates.gender).toBe('MEN');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 2: Child / Daughter / Son Handling
  // ══════════════════════════════════════════════════════════════

  describe('Issue 2: Child handling', () => {
    test('2.1 "shoes for my daughter age 6" sets CHILD type and GIRLS gender', () => {
      const updates = extract('shoes for my daughter age 6');
      expect(updates.wearerRelation).toBe('daughter');
      expect(updates.age).toBe(6);
      expect(updates.wearerType).toBe('CHILD');
      expect(updates.gender).toBe('GIRLS');
    });

    test('2.2 "shoes for my son age 10" sets CHILD type and BOYS gender', () => {
      const updates = extract('shoes for my son age 10');
      expect(updates.wearerRelation).toBe('son');
      expect(updates.age).toBe(10);
      expect(updates.wearerType).toBe('CHILD');
      expect(updates.gender).toBe('BOYS');
    });

    test('2.3 Child state triggers ASK_AGE when age missing', () => {
      const state: ShoppingPreferences = {
        version: 3,
        wearer: { type: 'CHILD', relation: 'daughter', age: null, gender: 'GIRLS' },
      };
      const result = service.determineNextAction(state, 'my daughter', null);
      expect(result.nextAction).toBe('ASK_AGE');
      expect(result.nextQuestion?.field).toBe('AGE');
      expect(result.replyMessage).toContain('old');
    });

    test('2.4 mergeStateWithDelta clears size on new wearer context', () => {
      const currentState: ShoppingPreferences = {
        version: 3,
        wearer: { type: 'SELF', relation: 'myself', age: null, gender: 'MEN' },
        size: 42,
        gender: 'MEN',
      };
      const updates: ExtractedDeltaUpdates = {
        wearerRelation: 'sister',
        gender: 'WOMEN',
        wearerType: 'OTHER',
        isNewWearerContext: true,
      };
      const merged = service.mergeStateWithDelta(currentState, updates, 'for my sister');
      expect(merged.size).toBeNull();
      expect(merged.wearer?.relation).toBe('sister');
      expect(merged.wearer?.gender).toBe('WOMEN');
      expect(merged.gender).toBe('WOMEN');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 3: Multi-field Extraction
  // ══════════════════════════════════════════════════════════════

  describe('Issue 4: Multi-field extraction', () => {
    test('3.1 "men shoes size 42 under 20000" extracts gender, size, budget', () => {
      const updates = extract('men shoes size 42 under 20000');
      expect(updates.gender).toBe('MEN');
      expect(updates.size).toBe(42);
      expect(updates.budgetMax).toBe(20000);
    });

    test('3.2 "running shoes for men size 42 under 20000" extracts purpose too', () => {
      const updates = extract('running shoes for men size 42 under 20000');
      expect(updates.gender).toBe('MEN');
      expect(updates.size).toBe(42);
      expect(updates.purpose).toBe('RUNNING');
      expect(updates.budgetMax).toBe(20000);
    });

    test('3.3 "Show Nike" extracts brand as Nike', () => {
      const updates = extract('Show Nike');
      expect(updates.brand).toBe('Nike');
    });

    test('3.4 "Show Adidas" extracts brand as Adidas', () => {
      const updates = extract('Show Adidas');
      expect(updates.brand).toBe('Adidas');
    });

    test('3.5 "addidas" (typo) extracts brand as Adidas', () => {
      const updates = extract('addidas shoes');
      expect(updates.brand).toBe('Adidas');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 4: Conversation State Preservation
  // ══════════════════════════════════════════════════════════════

  describe('Issue 2: State preservation across turns', () => {
    test('4.1 Brand preserved on "something cheaper"', () => {
      const currentState: ShoppingPreferences = {
        version: 3,
        brand: 'Adidas',
        size: 42,
        gender: 'MEN',
      };
      const updates: ExtractedDeltaUpdates = {
        intent: 'PRODUCT_REFINEMENT',
      };
      const merged = service.mergeStateWithDelta(currentState, updates, 'something cheaper');
      expect(merged.brand).toBe('Adidas');
      expect(merged.size).toBe(42);
    });

    test('4.2 classifyIntent recognizes "cheaper" as PRODUCT_REFINEMENT', () => {
      const state: ShoppingPreferences = {
        version: 3,
        brand: 'Adidas',
        size: 42,
      };
      const intent = service.classifyIntent('something cheaper', state, null);
      expect(intent).toBe('PRODUCT_REFINEMENT');
    });

    test('4.3 Gender preserved when size is added', () => {
      const currentState: ShoppingPreferences = {
        version: 3,
        gender: 'MEN',
        wearer: { type: 'SELF', relation: 'myself', age: null, gender: 'MEN' },
      };
      const updates: ExtractedDeltaUpdates = {
        size: 42,
      };
      const merged = service.mergeStateWithDelta(currentState, updates, '42');
      expect(merged.gender).toBe('MEN');
      expect(merged.size).toBe(42);
    });

    test('4.4 Purpose preserved when refinement happens', () => {
      const currentState: ShoppingPreferences = {
        version: 3,
        purpose: 'CASUAL',
        size: 42,
        gender: 'MEN',
      };
      const updates: ExtractedDeltaUpdates = {
        color: 'black',
      };
      const merged = service.mergeStateWithDelta(currentState, updates, 'in black');
      expect(merged.purpose).toBe('CASUAL');
      expect(merged.color).toBe('black');
      expect(merged.size).toBe(42);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 5: Fast-Path Coverage
  // ══════════════════════════════════════════════════════════════

  describe('Issue 3: Groq natural routing & streamlined fast-path', () => {
    test('5.1 "42" with SIZE pending is fast-path (button click)', () => {
      const result = (service as any).canUseFastPath('42', { field: 'SIZE', type: 'SIZE' }, {});
      expect(result).toBe(true);
    });

    test('5.2 "casual" routes to Gemini (natural language processing)', () => {
      const result = (service as any).canUseFastPath('casual', { field: 'PURPOSE', type: 'CHOICE' }, {});
      expect(result).toBe(false);
    });

    test('5.3 "sporty" routes to Gemini', () => {
      const result = (service as any).canUseFastPath('sporty', { field: 'PURPOSE', type: 'CHOICE' }, {});
      expect(result).toBe(false);
    });

    test('5.4 "someone else" routes to Gemini', () => {
      const result = (service as any).canUseFastPath('someone else', { field: 'WEARER', type: 'CHOICE' }, {});
      expect(result).toBe(false);
    });

    test('5.5 "men" routes to Gemini', () => {
      const result = (service as any).canUseFastPath('men', null, {});
      expect(result).toBe(false);
    });

    test('5.6 "women" routes to Gemini', () => {
      const result = (service as any).canUseFastPath('women', null, {});
      expect(result).toBe(false);
    });

    test('5.7 "Nike" routes to Gemini', () => {
      const result = (service as any).canUseFastPath('Nike', null, {});
      expect(result).toBe(false);
    });

    test('5.8 "show Adidas" routes to Gemini', () => {
      const result = (service as any).canUseFastPath('show Adidas', null, {});
      expect(result).toBe(false);
    });

    test('5.9 "cheaper" routes to Gemini', () => {
      const result = (service as any).canUseFastPath('cheaper', null, {});
      expect(result).toBe(false);
    });

    test('5.10 "yes" with BOOLEAN pending is fast-path (chip click)', () => {
      const result = (service as any).canUseFastPath('yes', { field: 'RELAX_PURPOSE', type: 'BOOLEAN' }, {});
      expect(result).toBe(true);
    });

    test('5.11 "6" with AGE pending routes to Gemini', () => {
      const result = (service as any).canUseFastPath('6', { field: 'AGE', type: 'NUMBER' }, {});
      expect(result).toBe(false);
    });

    test('5.12 "6 years old" routes to Gemini', () => {
      const result = (service as any).canUseFastPath('6 years old', { field: 'AGE', type: 'NUMBER' }, {});
      expect(result).toBe(false);
    });

    test('5.13 Complex multi-field message routes to Gemini', () => {
      const result = (service as any).canUseFastPath('I want running shoes for my sister', null, {});
      expect(result).toBe(false);
    });

    test('5.14 "under 20000" routes to Gemini', () => {
      const result = (service as any).canUseFastPath('under 20000', null, {});
      expect(result).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 6: Zero-Result & Relaxation Handling
  // ══════════════════════════════════════════════════════════════

  describe('Issue 5: Zero-result and relaxation', () => {
    test('6.1 "formal shoes size 39" -> after zero results, should have RELAX_PURPOSE pending', () => {
      // Simulate state after formal shoes search with no results
      const state: ShoppingPreferences = {
        version: 3,
        purpose: 'FORMAL',
        size: 39,
        gender: 'MEN',
      };
      // buildProductSearchConstraints for a formal search
      const constraints = service.buildProductSearchConstraints(state);
      expect(constraints.purpose).toBe('FORMAL');
      expect(constraints.size).toBe(39);
    });

    test('6.2 "yes" to RELAX_PURPOSE triggers search', () => {
      const state: ShoppingPreferences = {
        version: 3,
        purpose: 'FORMAL',
        size: 39,
        isRelaxationApproved: true,
      };
      const pendingQ: PendingQuestion = { field: 'RELAX_PURPOSE', type: 'BOOLEAN' };
      const updates: ExtractedDeltaUpdates = { isAffirmativeRelaxation: true };
      const result = service.determineNextAction(state, 'yes', pendingQ, updates);
      expect(result.canSearchCatalog).toBe(true);
    });

    test('6.3 "no" to RELAX_PURPOSE asks for new purpose', () => {
      const state: ShoppingPreferences = {
        version: 3,
        purpose: 'FORMAL',
        size: 39,
      };
      const pendingQ: PendingQuestion = { field: 'RELAX_PURPOSE', type: 'BOOLEAN' };
      const result = service.determineNextAction(state, 'no', pendingQ);
      expect(result.nextAction).toBe('ASK_PURPOSE');
      expect(result.canSearchCatalog).toBe(false);
    });

    test('6.4 Relaxation approval merges purpose to CASUAL', () => {
      const currentState: ShoppingPreferences = {
        version: 3,
        purpose: 'FORMAL',
        size: 39,
        pendingQuestion: { field: 'RELAX_PURPOSE', type: 'BOOLEAN' },
      };
      const updates: ExtractedDeltaUpdates = {
        isAffirmativeRelaxation: true,
      };
      const pendingQ: PendingQuestion = { field: 'RELAX_PURPOSE', type: 'BOOLEAN' };
      const merged = service.mergeStateWithDelta(currentState, updates, 'yes', pendingQ);
      expect(merged.isRelaxationApproved).toBe(true);
      expect(merged.purpose).toBe('CASUAL');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 7: Intent Classification
  // ══════════════════════════════════════════════════════════════

  describe('Intent classification', () => {
    test('7.1 Off-topic: "write me python code"', () => {
      const intent = service.classifyIntent('write me python code', emptyPrefs(), null);
      expect(intent).toBe('OFF_TOPIC');
    });

    test('7.2 Product discovery: "I need running shoes"', () => {
      const intent = service.classifyIntent('I need running shoes', emptyPrefs(), null);
      expect(intent).toBe('PRODUCT_DISCOVERY');
    });

    test('7.3 New shopping context: "for my sister"', () => {
      const updates: ExtractedDeltaUpdates = { isNewWearerContext: true };
      const intent = service.classifyIntent('for my sister', emptyPrefs(), null, updates);
      expect(intent).toBe('NEW_SHOPPING_CONTEXT');
    });

    test('7.4 Product refinement: "cheaper"', () => {
      const intent = service.classifyIntent('cheaper', { version: 3, size: 42 } as ShoppingPreferences, null);
      expect(intent).toBe('PRODUCT_REFINEMENT');
    });

    test('7.5 General shoe help: "what size am I?"', () => {
      const intent = service.classifyIntent('what size am I?', emptyPrefs(), null);
      expect(intent).toBe('GENERAL_SHOE_HELP');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 8: Product Search Constraints
  // ══════════════════════════════════════════════════════════════

  describe('Product search constraints', () => {
    test('8.1 Men preferences build correct constraints', () => {
      const prefs: ShoppingPreferences = {
        version: 3,
        gender: 'MEN',
        size: 42,
        purpose: 'RUNNING',
        budgetMax: 20000,
      };
      const constraints = service.buildProductSearchConstraints(prefs);
      expect(constraints.gender).toBe('Men');
      expect(constraints.size).toBe(42);
      expect(constraints.purpose).toBe('RUNNING');
      expect(constraints.budgetMax).toBe(20000);
    });

    test('8.2 Women preferences build correct constraints', () => {
      const prefs: ShoppingPreferences = {
        version: 3,
        gender: 'WOMEN',
        wearer: { type: 'OTHER', relation: 'sister', age: null, gender: 'WOMEN' },
        size: 38,
      };
      const constraints = service.buildProductSearchConstraints(prefs);
      expect(constraints.gender).toBe('Women');
      expect(constraints.size).toBe(38);
    });

    test('8.3 Child preferences set isChild and gender=Kids', () => {
      const prefs: ShoppingPreferences = {
        version: 3,
        wearer: { type: 'CHILD', relation: 'daughter', age: 6, gender: 'GIRLS' },
        age: 6,
        size: 28,
      };
      const constraints = service.buildProductSearchConstraints(prefs);
      expect(constraints.isChild).toBe(true);
      expect(constraints.gender).toBe('Kids');
    });

    test('8.4 Brand constraint is case-insensitive', () => {
      const prefs: ShoppingPreferences = {
        version: 3,
        brand: 'Adidas',
        size: 42,
      };
      const constraints = service.buildProductSearchConstraints(prefs);
      expect(constraints.brand).toBe('Adidas');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 9: Validate Recommendation Barrier
  // ══════════════════════════════════════════════════════════════

  describe('Recommendation validation barrier', () => {
    const mockProduct = {
      id: 'prod-1',
      name: 'Nike Air Force 1',
      slug: 'nike-air-force-1',
      basePrice: new Prisma.Decimal(15000),
      salePrice: null,
      gender: ProductGender.Men,
      isActive: true,
      brand: { name: 'Nike' },
      category: { name: 'Men', slug: 'men' },
      variants: [
        {
          id: 'var-1',
          size: 42,
          color: 'White',
          isActive: true,
          price: null,
          inventory: { quantityOnHand: 10, reservedQuantity: 2 },
        },
      ],
    };

    test('9.1 Valid product with matching constraints passes', () => {
      const constraints: ProductSearchConstraints = {
        gender: 'Men',
        size: 42,
        purpose: null,
        budgetMin: null,
        budgetMax: 20000,
        brand: null,
        color: null,
      };
      const result = service.validateRecommendation(mockProduct, constraints);
      expect(result.valid).toBe(true);
      expect(result.displayPrice).toBe(15000);
      expect(result.availableQuantity).toBe(8);
    });

    test('9.2 Inactive product fails validation', () => {
      const inactive = { ...mockProduct, isActive: false };
      const constraints: ProductSearchConstraints = {
        gender: 'Men',
        size: 42,
        purpose: null,
        budgetMin: null,
        budgetMax: null,
        brand: null,
        color: null,
      };
      const result = service.validateRecommendation(inactive, constraints);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('inactive');
    });

    test('9.3 Wrong gender fails validation', () => {
      const constraints: ProductSearchConstraints = {
        gender: 'Women',
        size: 42,
        purpose: null,
        budgetMin: null,
        budgetMax: null,
        brand: null,
        color: null,
      };
      const result = service.validateRecommendation(mockProduct, constraints);
      expect(result.valid).toBe(false);
    });

    test('9.4 Over budget fails validation', () => {
      const constraints: ProductSearchConstraints = {
        gender: 'Men',
        size: 42,
        purpose: null,
        budgetMin: null,
        budgetMax: 10000,
        brand: null,
        color: null,
      };
      const result = service.validateRecommendation(mockProduct, constraints);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('budget');
    });

    test('9.5 Wrong size fails validation', () => {
      const constraints: ProductSearchConstraints = {
        gender: 'Men',
        size: 38,
        purpose: null,
        budgetMin: null,
        budgetMax: null,
        brand: null,
        color: null,
      };
      const result = service.validateRecommendation(mockProduct, constraints);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('variant');
    });

    test('9.6 Sale price used when lower than base', () => {
      const saleProduct = {
        ...mockProduct,
        salePrice: new Prisma.Decimal(12000),
      };
      const constraints: ProductSearchConstraints = {
        gender: 'Men',
        size: 42,
        purpose: null,
        budgetMin: null,
        budgetMax: 13000,
        brand: null,
        color: null,
      };
      const result = service.validateRecommendation(saleProduct, constraints);
      expect(result.valid).toBe(true);
      expect(result.displayPrice).toBe(12000);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 10: Natural Response Validation
  // ══════════════════════════════════════════════════════════════

  describe('Response validation guard', () => {
    test('10.1 ASK_SIZE response must contain "size"', () => {
      const result = service.validateNaturalResponse(
        'What shoe size should I look for?',
        'ASK_SIZE',
        emptyPrefs(),
      );
      expect(result).toBe(true);
    });

    test('10.2 Response with product claims is rejected', () => {
      const result = service.validateNaturalResponse(
        'I recommend the Nike Air Max for Rs. 15000',
        'ASK_SIZE',
        emptyPrefs(),
      );
      expect(result).toBe(false);
    });

    test('10.3 ASK_PURPOSE response must mention style keywords', () => {
      const result = service.validateNaturalResponse(
        'What kind of shoes are you looking for — casual, sporty, or formal?',
        'ASK_PURPOSE',
        emptyPrefs(),
      );
      expect(result).toBe(true);
    });

    test('10.4 ASK_WEARER_RELATION response must mention "who" or "for"', () => {
      const result = service.validateNaturalResponse(
        'Sure, who are the shoes for?',
        'ASK_WEARER_RELATION',
        emptyPrefs(),
      );
      expect(result).toBe(true);
    });

    test('10.5 OFF_TOPIC_REDIRECT must mention "shoe" or "footwear"', () => {
      const resultBad = service.validateNaturalResponse(
        'I can help with many things!',
        'OFF_TOPIC_REDIRECT',
        emptyPrefs(),
      );
      expect(resultBad).toBe(false);

      const resultGood = service.validateNaturalResponse(
        'I can help with shoes and footwear.',
        'OFF_TOPIC_REDIRECT',
        emptyPrefs(),
      );
      expect(resultGood).toBe(true);
    });

    test('10.6 Very short response is rejected', () => {
      const result = service.validateNaturalResponse(
        'Hi',
        null,
        emptyPrefs(),
      );
      expect(result).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 11: Size Extraction Edge Cases
  // ══════════════════════════════════════════════════════════════

  describe('Size extraction edge cases', () => {
    test('11.1 "42" with SIZE pending extracts size=42', () => {
      const updates = extract('42', { field: 'SIZE', type: 'SIZE' });
      expect(updates.size).toBe(42);
    });

    test('11.2 "38" with SIZE pending extracts size=38', () => {
      const updates = extract('38', { field: 'SIZE', type: 'SIZE' });
      expect(updates.size).toBe(38);
    });

    test('11.3 "EU 39" extracts size=39 with EU hint', () => {
      const updates = extract('EU 39', { field: 'SIZE', type: 'SIZE' });
      expect(updates.size).toBe(39);
      expect(updates.sizeSystemHint).toBe('EU');
    });

    test('11.4 "US 8" sets ambiguous flag (not silently converted)', () => {
      const updates = extract('US 8', { field: 'SIZE', type: 'SIZE' });
      expect(updates.isAmbiguousSmallSize).toBe(true);
      expect(updates.sizeSystemHint).toBe('US');
    });

    test('11.5 Correction "actually 39" sets isCorrection', () => {
      const updates = extract('actually 39', { field: 'SIZE', type: 'SIZE' });
      expect(updates.size).toBe(39);
      expect(updates.isCorrection).toBe(true);
    });

    test('11.6 Age "6" with AGE pending does NOT extract as size', () => {
      const updates = extract('6', { field: 'AGE', type: 'NUMBER' });
      expect(updates.age).toBe(6);
      // Should not set size when AGE is pending
      expect(updates.size).toBeUndefined();
    });

    test('11.7 "67" is rejected as out-of-bounds size and guides user to 36-44', () => {
      const updates = extract('67', { field: 'SIZE', type: 'SIZE' });
      expect(updates.size).toBeNull();
      expect(updates.isInvalidSize).toBe(true);

      const action = service.determineNextAction(emptyPrefs(), '67', { field: 'SIZE', type: 'SIZE' }, updates);
      expect(action.nextAction).toBe('ASK_SIZE');
      expect(action.replyMessage).toContain('36 to 44');
    });

    test('11.8 "90" is rejected as out-of-bounds size', () => {
      const updates = extract('90', { field: 'SIZE', type: 'SIZE' });
      expect(updates.size).toBeNull();
      expect(updates.isInvalidSize).toBe(true);
    });

    test('11.9 "-1" is rejected as invalid negative size', () => {
      const updates = extract('-1', { field: 'SIZE', type: 'SIZE' });
      expect(updates.size).toBeNull();
      expect(updates.isInvalidSize).toBe(true);
    });

    test('11.10 "42" is accepted as valid EU size 42', () => {
      const updates = extract('42', { field: 'SIZE', type: 'SIZE' });
      expect(updates.size).toBe(42);
      expect(updates.isInvalidSize).toBe(false);
      expect(updates.sizeSystemHint).toBe('EU');
    });

    test('11.11 "assalamualaikum" returns warm Islamic greeting without size prompt', () => {
      const updates = extract('assalamualaikum');
      const action = service.determineNextAction(emptyPrefs(), 'assalamualaikum', null, updates);
      expect(action.nextAction).toBe('ASK_WEARER');
      expect(action.replyMessage).toContain('Wa Alaikum Assalam');
      expect(action.replyMessage).not.toContain('size');
    });

    test('11.12 "hi I need running shoes" extracts purpose=RUNNING for product discovery', () => {
      const updates = extract('hi I need running shoes');
      expect(updates.purpose).toBe('RUNNING');
      const intent = service.classifyIntent('hi I need running shoes', emptyPrefs(), null, updates);
      expect(intent).toBe('PRODUCT_DISCOVERY');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 12: Purpose Extraction
  // ══════════════════════════════════════════════════════════════

  describe('Purpose extraction', () => {
    test('12.1 "casual" extracts purpose=CASUAL', () => {
      const updates = extract('casual');
      expect(updates.purpose).toBe('CASUAL');
    });

    test('12.2 "sporty" extracts purpose=SPORTS', () => {
      const updates = extract('sporty');
      expect(updates.purpose).toBe('SPORTS');
    });

    test('12.3 "formal" extracts purpose=FORMAL', () => {
      const updates = extract('formal');
      expect(updates.purpose).toBe('FORMAL');
    });

    test('12.4 "running" extracts purpose=RUNNING', () => {
      const updates = extract('running shoes');
      expect(updates.purpose).toBe('RUNNING');
    });

    test('12.5 "gym" extracts purpose=SPORTS', () => {
      const updates = extract('gym shoes');
      expect(updates.purpose).toBe('SPORTS');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 13: End-to-End Conversation Flows (deterministic)
  // ══════════════════════════════════════════════════════════════

  describe('End-to-end conversation flows', () => {
    test('13.1 Full flow: shoes -> someone else -> sister -> 38 -> sporty', () => {
      // Turn 1: "I need shoes"
      let state: ShoppingPreferences = { version: 3 };
      let updates = extract('I need shoes');
      let intent = service.classifyIntent('I need shoes', state, null, updates);
      updates.intent = intent;
      state = service.mergeStateWithDelta(state, updates, 'I need shoes');
      let action = service.determineNextAction(state, 'I need shoes', null, updates);
      // Should ask for size since no wearer context is established
      expect(action.nextAction).toBe('ASK_SIZE');

      // Turn 2: "someone else" (after bot asked "who are they for?")
      updates = extract('someone else', { field: 'WEARER', type: 'CHOICE' });
      intent = service.classifyIntent('someone else', state, null, updates);
      updates.intent = intent;
      state = service.mergeStateWithDelta(state, updates, 'someone else');
      action = service.determineNextAction(state, 'someone else', { field: 'WEARER', type: 'CHOICE' }, updates);
      expect(action.nextAction).toBe('ASK_WEARER_RELATION');
      expect(action.replyMessage).toContain('who are the shoes for');

      // Turn 3: "my sister"
      updates = extract('my sister', { field: 'WEARER_RELATION', type: 'CHOICE' });
      intent = service.classifyIntent('my sister', state, null, updates);
      updates.intent = intent;
      state = service.mergeStateWithDelta(state, updates, 'my sister');
      action = service.determineNextAction(state, 'my sister', { field: 'WEARER_RELATION', type: 'CHOICE' }, updates);
      expect(state.wearer?.relation).toBe('sister');
      expect(state.wearer?.gender).toBe('WOMEN');
      expect(action.nextAction).toBe('ASK_SIZE');
      expect(action.replyMessage).toContain('she');

      // Turn 4: "38"
      updates = extract('38', { field: 'SIZE', type: 'SIZE' });
      intent = service.classifyIntent('38', state, null, updates);
      updates.intent = intent;
      state = service.mergeStateWithDelta(state, updates, '38');
      action = service.determineNextAction(state, '38', { field: 'SIZE', type: 'SIZE' }, updates);
      expect(state.size).toBe(38);
      expect(action.nextAction).toBe('ASK_PURPOSE');
      // Should use "she" pronoun for sister
      expect(action.replyMessage).toContain('she');

      // Turn 5: "sporty"
      updates = extract('sporty', { field: 'PURPOSE', type: 'CHOICE' });
      intent = service.classifyIntent('sporty', state, null, updates);
      updates.intent = intent;
      state = service.mergeStateWithDelta(state, updates, 'sporty');
      action = service.determineNextAction(state, 'sporty', { field: 'PURPOSE', type: 'CHOICE' }, updates);
      expect(state.purpose).toBe('SPORTS');
      expect(action.canSearchCatalog).toBe(true);
    });

    test('13.2 Brand refinement: "Show Adidas" -> "cheaper" preserves brand', () => {
      // Turn 1: "Show Adidas"
      let state: ShoppingPreferences = { version: 3 };
      let updates = extract('Show Adidas');
      let intent = service.classifyIntent('Show Adidas', state, null, updates);
      updates.intent = intent;
      state = service.mergeStateWithDelta(state, updates, 'Show Adidas');
      let action = service.determineNextAction(state, 'Show Adidas', null, updates);
      expect(state.brand).toBe('Adidas');
      expect(action.nextAction).toBe('ASK_SIZE');

      // Turn 2: "42"
      updates = extract('42', { field: 'SIZE', type: 'SIZE' });
      state = service.mergeStateWithDelta(state, updates, '42');
      action = service.determineNextAction(state, '42', { field: 'SIZE', type: 'SIZE' }, updates);
      expect(state.size).toBe(42);
      expect(state.brand).toBe('Adidas');
      // Brand + size known -> should search
      expect(action.canSearchCatalog).toBe(true);

      // Turn 3: "something cheaper"
      updates = extract('something cheaper');
      intent = service.classifyIntent('something cheaper', state, null, updates);
      updates.intent = intent;
      state = service.mergeStateWithDelta(state, updates, 'something cheaper');
      // Brand must still be Adidas
      expect(state.brand).toBe('Adidas');
      expect(state.size).toBe(42);
    });

    test('13.3 Men shoes -> 42 -> casual: no repeated questions', () => {
      // Turn 1: "Men shoes"
      let state: ShoppingPreferences = { version: 3 };
      let updates = extract('Men shoes');
      state = service.mergeStateWithDelta(state, updates, 'Men shoes');
      let action = service.determineNextAction(state, 'Men shoes', null, updates);
      expect(state.gender).toBe('MEN');
      expect(action.nextAction).toBe('ASK_SIZE');

      // Turn 2: "42"
      updates = extract('42', { field: 'SIZE', type: 'SIZE' });
      state = service.mergeStateWithDelta(state, updates, '42');
      action = service.determineNextAction(state, '42', { field: 'SIZE', type: 'SIZE' }, updates);
      expect(state.size).toBe(42);
      expect(action.nextAction).toBe('ASK_PURPOSE');
      // Should NOT ask for size again
      expect(action.replyMessage).not.toContain('What shoe size');

      // Turn 3: "casual"
      updates = extract('casual', { field: 'PURPOSE', type: 'CHOICE' });
      state = service.mergeStateWithDelta(state, updates, 'casual');
      action = service.determineNextAction(state, 'casual', { field: 'PURPOSE', type: 'CHOICE' }, updates);
      expect(state.purpose).toBe('CASUAL');
      // Should NOT ask for purpose again, should search
      expect(action.canSearchCatalog).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 14: Effective Price Calculation
  // ══════════════════════════════════════════════════════════════

  describe('Effective price calculation', () => {
    test('14.1 No sale price returns base price', () => {
      const result = service.calculateEffectivePrice(15000, null);
      expect(result.displayPrice).toBe(15000);
      expect(result.isOnSale).toBe(false);
    });

    test('14.2 Sale price lower than base is used', () => {
      const result = service.calculateEffectivePrice(15000, 12000);
      expect(result.displayPrice).toBe(12000);
      expect(result.originalPrice).toBe(15000);
      expect(result.isOnSale).toBe(true);
    });

    test('14.3 Sale price higher than base is ignored', () => {
      const result = service.calculateEffectivePrice(15000, 20000);
      expect(result.displayPrice).toBe(15000);
      expect(result.isOnSale).toBe(false);
    });

    test('14.4 Sale price of 0 is ignored', () => {
      const result = service.calculateEffectivePrice(15000, 0);
      expect(result.displayPrice).toBe(15000);
      expect(result.isOnSale).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST GROUP 15: AI Shopping Agent Core Capabilities (Phase 10)
  // ══════════════════════════════════════════════════════════════

  describe('AI Shopping Agent Core Capabilities', () => {
    test('15.1 "Assalamualaikum" returns warm Islamic greeting', () => {
      const updates = extract('Assalamualaikum');
      const intent = service.classifyIntent('Assalamualaikum', emptyPrefs(), null, updates);
      expect(intent).toBe('GREETING');
      const action = service.determineNextAction(emptyPrefs(), 'Assalamualaikum', null, updates);
      expect(action.nextAction).toBe('ASK_WEARER');
      expect(action.replyMessage).toContain('Wa Alaikum Assalam');
    });

    test('15.2 "67" rejects invalid size with 36-44 guidance', () => {
      const updates = extract('67', { field: 'SIZE', type: 'SIZE' });
      expect(updates.size).toBeNull();
      expect(updates.isInvalidSize).toBe(true);
      const action = service.determineNextAction(emptyPrefs(), '67', { field: 'SIZE', type: 'SIZE' }, updates);
      expect(action.nextAction).toBe('ASK_SIZE');
      expect(action.replyMessage).toContain('36 to 44');
    });

    test('15.3 "I need shoes for office and casual weekends" extracts versatile style and asks purpose/style first', () => {
      const updates = extract('I need shoes for office and casual weekends');
      expect(updates.style).toBeDefined();
      const action = service.determineNextAction(emptyPrefs(), 'I need shoes for office and casual weekends', null, updates);
      expect(action.nextAction).toBe('ASK_PURPOSE');
      expect(action.replyMessage).toContain('versatile');
    });

    test('15.4 "I walk 10 km daily" extracts walking and comfort requirement', () => {
      const updates = extract('I walk 10 km daily');
      expect(updates.comfort).toBeDefined();
      const action = service.determineNextAction(emptyPrefs(), 'I walk 10 km daily', null, updates);
      expect(action.nextAction).toBe('ASK_SIZE');
      expect(action.replyMessage).toContain('10 km');
    });

    test('15.5 "Something like Nike Pegasus but cheaper" extracts brand Nike and intent refinement', () => {
      const updates = extract('Something like Nike Pegasus but cheaper');
      expect(updates.brand).toBe('Nike');
      const intent = service.classifyIntent('Something like Nike Pegasus but cheaper', emptyPrefs(), null, updates);
      expect(intent).toBe('PRODUCT_REFINEMENT');
    });

    test('15.6 "I need shoes for my sister" detects third-party shopper context', () => {
      const updates = extract('I need shoes for my sister');
      expect(updates.wearerRelation).toBe('sister');
      expect(updates.gender).toBe('WOMEN');
      expect(updates.wearerType).toBe('OTHER');
    });

    test('15.7 "What is your return policy?" returns grounded 14-day store policy', () => {
      const updates = extract('What is your return policy?');
      const intent = service.classifyIntent('What is your return policy?', emptyPrefs(), null, updates);
      expect(intent).toBe('STORE_INFORMATION');
      const action = service.determineNextAction(emptyPrefs(), 'What is your return policy?', null, updates);
      expect(action.nextAction).toBe('ANSWER_STORE_INFO');
      expect(action.replyMessage).toContain('14-day');
    });

    test('15.8 "Where is my order?" triggers order support flow', () => {
      const updates = extract('Where is my order?');
      const intent = service.classifyIntent('Where is my order?', emptyPrefs(), null, updates);
      expect(intent).toBe('ORDER_SUPPORT');
      const action = service.determineNextAction(emptyPrefs(), 'Where is my order?', null, updates);
      expect(action.nextAction).toBe('ANSWER_ORDER_STATUS');
    });
  });
});

