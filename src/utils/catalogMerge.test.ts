import assert from 'node:assert/strict';
import test from 'node:test';
import { CATEGORIES, PRODUCTS } from '../data/products';
import {
  calculateDealerMarginPercent,
  computeBulkPriceUpdates,
  generateNextSkuId,
  getDynamicCategories,
  getVisibleCustomerProducts,
  mergeCatalogProducts,
} from './catalogMerge';
import { sanitizeBusinessSettingsPayload, sanitizeCatalogProductPayload } from './firestorePayloads';
import { DEFAULT_BUSINESS_SETTINGS } from './catalogMerge';

test('mergeCatalogProducts overlays edited SKUs and appends custom SKUs deterministically', () => {
  const edited = {
    ...PRODUCTS[0],
    price: 55,
    mrp: 75,
    description: 'Heavy-duty FR polycarbonate switch',
    imageUrl: 'https://example.com/switch.jpg',
  };
  const custom = {
    id: 'DD-0330',
    category: 'Smart Home',
    family: 'Wi-Fi Smart Plug',
    spec: '16A · Energy Monitor',
    name: 'Wi-Fi Smart Plug · 16A · Energy Monitor',
    price: 680,
    mrp: 999,
    moq: 5,
    kind: 'socket' as const,
    unit: 'piece',
    description: 'App-controlled 16A plug for AC and geysers.',
    inStock: true,
    isHidden: false,
    featured: true,
    isCustom: true,
  };

  const merged = mergeCatalogProducts(PRODUCTS, {
    [edited.id]: edited,
    [custom.id]: custom,
  });

  assert.equal(merged.length, PRODUCTS.length + 1);
  assert.equal(merged[0].price, 55);
  assert.equal(merged[0].isEdited, true);
  assert.equal(merged[0].isCustom, false);
  const added = merged.find((p) => p.id === 'DD-0330');
  assert.ok(added);
  assert.equal(added.isCustom, true);

  const dynCats = getDynamicCategories(CATEGORIES, merged);
  assert.ok(dynCats.includes('Smart Home'));
  assert.equal(generateNextSkuId(merged), 'DD-0331');
});

test('getVisibleCustomerProducts hides archived SKUs while keeping active ones', () => {
  const merged = mergeCatalogProducts(PRODUCTS, {
    [PRODUCTS[0].id]: { ...PRODUCTS[0], isHidden: true },
  });
  const visible = getVisibleCustomerProducts(merged);
  assert.equal(visible.length, PRODUCTS.length - 1);
  assert.equal(visible.some((p) => p.id === PRODUCTS[0].id), false);
});

test('computeBulkPriceUpdates adjusts target category prices with rounding and optional MRP scaling', () => {
  const sample = [
    { ...PRODUCTS[0], category: 'Wires', price: 1000, mrp: 1200 },
    { ...PRODUCTS[1], category: 'Switches', price: 100, mrp: 150 },
  ];
  const updated = computeBulkPriceUpdates(sample, {
    category: 'Wires',
    mode: 'percent',
    amount: 10,
    roundTo: 5,
    adjustMrp: true,
  });
  assert.equal(updated.length, 1);
  assert.equal(updated[0].price, 1100);
  assert.equal(updated[0].mrp, 1320);
  assert.equal(calculateDealerMarginPercent(70, 100), 30);
  assert.equal(calculateDealerMarginPercent(100, 90), null);
});

test('sanitizeCatalogProductPayload and sanitizeBusinessSettingsPayload enforce blueprint constraints', () => {
  const safeProd = sanitizeCatalogProductPayload('admin_uid_1', {
    ...PRODUCTS[0],
    price: 49,
    mrp: 70,
    moq: 10,
    description: 'D'.repeat(2000),
    imageUrl: 'https://cdn.example.com/p1.webp',
  });
  assert.equal(safeProd.description.length, 1500);
  assert.equal(safeProd.moq, 10);

  assert.throws(() =>
    sanitizeCatalogProductPayload('admin_uid_1', {
      ...PRODUCTS[0],
      imageUrl: 'javascript:alert(1)',
    })
  );

  const safeBiz = sanitizeBusinessSettingsPayload('admin_uid_1', {
    ...DEFAULT_BUSINESS_SETTINGS,
    companyName: 'D&D Electricals Pvt Ltd',
    showPrototypeNotices: false,
  });
  assert.equal(safeBiz.companyName, 'D&D Electricals Pvt Ltd');
  assert.equal(safeBiz.showPrototypeNotices, false);
});
