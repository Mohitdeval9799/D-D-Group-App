import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, PRODUCTS, SAMPLE_TRIAL_KIT } from '../data/products';
import {
  buildCatalogueCsv,
  filterProducts,
  formatInr,
  getCategoryCounts,
  getFamiliesForCategory,
  getRelatedVariants,
  normalizeQuery,
  paginate,
  parseProductSpecs,
} from './catalog';

test('catalogue has all 329 unique SKUs across 13 categories with positive prices', () => {
  assert.equal(PRODUCTS.length, 329);
  assert.equal(CATEGORIES.length, 13);

  const ids = new Set(PRODUCTS.map((p) => p.id));
  assert.equal(ids.size, 329);
  assert.equal(PRODUCTS[0].id, 'DD-0001');
  assert.equal(PRODUCTS[328].id, 'DD-0329');

  for (const p of PRODUCTS) {
    assert.ok(p.price > 0, `SKU ${p.id} should have a positive price`);
    assert.ok(p.spec.length > 0, `SKU ${p.id} should have a spec`);
  }
});

test('sample trial kit maps to valid SKUs approximating ₹5,000 order benchmark', () => {
  let subtotal = 0;
  for (const [id, qty] of Object.entries(SAMPLE_TRIAL_KIT)) {
    const found = PRODUCTS.find((p) => p.id === id);
    assert.ok(found, `Sample kit SKU ${id} must exist`);
    subtotal += found.price * qty;
  }
  assert.ok(subtotal >= 4500 && subtotal <= 5500, `Expected ~₹5,000 kit, got ₹${subtotal}`);
});

test('search normalizes superscripts and multiplication symbols and matches multi-term queries', () => {
  assert.equal(normalizeQuery('2.5 mm² · 2 × 2 ft'), '2.5 mm2 · 2 x 2 ft');

  const wireMatches = filterProducts(PRODUCTS, {
    category: 'All',
    family: 'all',
    search: '2.5 mm2 red',
    sort: 'default',
  });
  assert.ok(wireMatches.some((p) => p.id === 'DD-0113'));

  const mcbMatches = filterProducts(PRODUCTS, {
    category: 'MCBs',
    family: 'all',
    search: 'TPN 32A',
    sort: 'default',
  });
  assert.equal(mcbMatches.length, 1);
  assert.equal(mcbMatches[0].id, 'DD-0196');
  assert.equal(mcbMatches[0].price, 952);
});

test('sorting and pagination work deterministically', () => {
  const lowToHigh = filterProducts(PRODUCTS, {
    category: 'MCBs',
    family: 'all',
    search: '',
    sort: 'low',
  });
  assert.equal(lowToHigh.length, 32);
  assert.ok(lowToHigh[0].price <= lowToHigh[lowToHigh.length - 1].price);

  const highToLow = filterProducts(PRODUCTS, {
    category: 'MCBs',
    family: 'all',
    search: '',
    sort: 'high',
  });
  assert.ok(highToLow[0].price >= highToLow[highToLow.length - 1].price);

  const page2 = paginate(lowToHigh, 2, 18);
  assert.equal(page2.page, 2);
  assert.equal(page2.totalPages, 2);
  assert.equal(page2.startIndex, 19);
  assert.equal(page2.endIndex, 32);
  assert.equal(page2.items.length, 14);
});

test('category counts, families, spec parsing, currency formatting, and CSV export work', () => {
  const counts = getCategoryCounts(PRODUCTS, CATEGORIES);
  assert.equal(counts.All, 329);
  assert.equal(counts.Switches, 25);
  assert.equal(counts['LED lighting'], 51);

  const families = getFamiliesForCategory(PRODUCTS, 'Distribution boards');
  assert.deepEqual(families, ['Distribution board', 'TPN distribution board']);

  const specs = parseProductSpecs(PRODUCTS.find((p) => p.id === 'DD-0196')!);
  assert.ok(specs.some((s) => s.label === 'SKU Code' && s.value === 'DD-0196'));
  assert.ok(specs.some((s) => s.value === '32A'));

  assert.equal(formatInr(150000), '₹1,50,000');

  const csv = buildCatalogueCsv(PRODUCTS.slice(0, 2));
  assert.ok(csv.startsWith('\uFEFF"id","category","family","spec","price","unit"'));
  assert.ok(csv.includes('"DD-0001"'));
  assert.ok(csv.includes('"DD-0002"'));

  const tpn32 = PRODUCTS.find((p) => p.id === 'DD-0196')!;
  const related = getRelatedVariants(PRODUCTS, tpn32, 12);
  assert.equal(related.totalInFamily, 32);
  assert.equal(related.variants.length, 12);
  assert.ok(related.variants[0].spec.startsWith('TPN'));
  assert.ok(related.variants.some((v) => v.id === 'DD-0196'));
});
