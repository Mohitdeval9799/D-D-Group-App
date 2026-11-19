import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../data/products';
import { SCENARIO_PRESETS, VENTURE_META } from '../data/venturePlan';
import {
  computePilotMetrics,
  computeUnitEconomics,
  createSamplePilotRecords,
  getCartItems,
  getCartTotals,
  isValidIndianMobile,
  setCartQuantity,
  updateCartQuantity,
  validateDealerContact,
} from './pilot';

test('cart quantity updates clamp between 0 and 999 and remove zero entries', () => {
  let cart: Record<string, number> = {};
  cart = updateCartQuantity(cart, 'DD-0001', 3);
  assert.equal(cart['DD-0001'], 3);

  cart = updateCartQuantity(cart, 'DD-0001', 2000);
  assert.equal(cart['DD-0001'], 999);

  cart = setCartQuantity(cart, 'DD-0001', 0);
  assert.equal('DD-0001' in cart, false);

  cart = updateCartQuantity(cart, 'DD-0196', 5);
  const items = getCartItems(PRODUCTS, cart);
  const totals = getCartTotals(items);
  assert.equal(totals.variantCount, 1);
  assert.equal(totals.unitCount, 5);
  assert.equal(totals.subtotal, 952 * 5);
});

test('Indian mobile and dealer contact validation enforces required fields and phone pattern', () => {
  assert.equal(isValidIndianMobile('9829012345'), true);
  assert.equal(isValidIndianMobile('6123456789'), true);
  assert.equal(isValidIndianMobile('5123456789'), false);
  assert.equal(isValidIndianMobile('982901234'), false);
  assert.equal(isValidIndianMobile('abcdefghij'), false);

  const invalid = validateDealerContact({
    name: '',
    business: '  ',
    phone: '12345',
    city: '',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.business);
  assert.ok(invalid.errors.phone);
  assert.ok(invalid.errors.city);

  const valid = validateDealerContact({
    name: 'Rajesh Sharma',
    business: 'Sharma Electricals',
    phone: '9829012345',
    city: 'Jaipur',
  });
  assert.equal(valid.valid, true);
});

test('pilot metrics calculate unique dealers by mobile and repeat interest percentage accurately', () => {
  const sample = createSamplePilotRecords(PRODUCTS);
  // Add a second order from the same phone number to ensure deduplication
  const duplicateDealerOrder = {
    ...sample.orders[0],
    id: 'DD-DEMO-JPR1B',
    repeat: false,
  };
  const metrics = computePilotMetrics([...sample.orders, duplicateDealerOrder], sample.leads, 10);

  assert.equal(metrics.totalRequests, 4);
  assert.equal(metrics.uniqueDealers, 3);
  assert.equal(metrics.repeatInterestedDealers, 2);
  assert.equal(metrics.repeatRatePercent, 67);
  assert.equal(metrics.dealerGoalProgressPercent, 30);
  assert.equal(metrics.totalLeads, 2);
});

test('unit economics match Mission 7 venture plan numbers across Conservative, Base, and Ambitious', () => {
  const basePreset = SCENARIO_PRESETS.find((s) => s.id === 'base')!;
  const base = computeUnitEconomics({
    customers: basePreset.customers,
    purchasesPerCustomer: basePreset.purchasesPerCustomer,
    sellingPrice: VENTURE_META.defaultOrderValue,
    variableCost: VENTURE_META.defaultVariableCost,
    monthlyFixedCost: VENTURE_META.defaultMonthlyFixedCost,
  });

  assert.equal(base.contributionPerSale, 1500);
  assert.equal(base.marginPercent, 30);
  assert.equal(base.monthlyOrders, 100);
  assert.equal(base.monthlyRevenue, 500000);
  assert.equal(base.operatingSurplus, 0);
  assert.equal(base.breakEvenOrders, 100);

  const conservativePreset = SCENARIO_PRESETS.find((s) => s.id === 'conservative')!;
  const conservative = computeUnitEconomics({
    customers: conservativePreset.customers,
    purchasesPerCustomer: conservativePreset.purchasesPerCustomer,
    sellingPrice: VENTURE_META.defaultOrderValue,
    variableCost: VENTURE_META.defaultVariableCost,
    monthlyFixedCost: VENTURE_META.defaultMonthlyFixedCost,
  });
  assert.equal(conservative.monthlyRevenue, 150000);
  assert.equal(conservative.operatingSurplus, -105000);

  const ambitiousPreset = SCENARIO_PRESETS.find((s) => s.id === 'ambitious')!;
  const ambitious = computeUnitEconomics({
    customers: ambitiousPreset.customers,
    purchasesPerCustomer: ambitiousPreset.purchasesPerCustomer,
    sellingPrice: VENTURE_META.defaultOrderValue,
    variableCost: VENTURE_META.defaultVariableCost,
    monthlyFixedCost: VENTURE_META.defaultMonthlyFixedCost,
  });
  assert.equal(ambitious.monthlyRevenue, 1200000);
  assert.equal(ambitious.operatingSurplus, 210000);
});
