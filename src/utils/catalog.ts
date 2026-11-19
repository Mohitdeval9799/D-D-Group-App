import type { Product, SortMode } from '../types';

export const PAGE_SIZE = 18;

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatInrCompact(amount: number): string {
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${Number.isInteger(cr) ? cr : cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const l = amount / 100000;
    return `₹${Number.isInteger(l) ? l : l.toFixed(2)} L`;
  }
  return formatInr(amount);
}

export function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/²/g, '2')
    .replace(/×/g, 'x')
    .replace(/[–—]/g, '-')
    .trim();
}

export interface CatalogFilterOptions {
  category: string;
  family: string;
  search: string;
  sort: SortMode;
}

export function filterProducts(products: Product[], options: CatalogFilterOptions): Product[] {
  const terms = normalizeQuery(options.search).split(/\s+/).filter(Boolean);

  const matched = products.filter((p) => {
    if (options.category !== 'All' && p.category !== options.category) return false;
    if (options.family !== 'all' && p.family !== options.family) return false;
    if (terms.length > 0) {
      const haystack = normalizeQuery(`${p.name} ${p.category} ${p.id} ${p.unit}`);
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });

  if (options.sort === 'low') {
    return [...matched].sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
  }
  if (options.sort === 'high') {
    return [...matched].sort((a, b) => b.price - a.price || a.id.localeCompare(b.id));
  }
  if (options.sort === 'name') {
    return [...matched].sort((a, b) => a.name.localeCompare(b.name));
  }
  return matched;
}

export function getFamiliesForCategory(products: Product[], category: string): string[] {
  return [
    ...new Set(
      products
        .filter((p) => category === 'All' || p.category === category)
        .map((p) => p.family)
    ),
  ];
}

export function getCategoryCounts(products: Product[], categories: string[]): Record<string, number> {
  const counts: Record<string, number> = { All: products.length };
  for (const cat of categories) {
    counts[cat] = 0;
  }
  for (const p of products) {
    counts[p.category] = (counts[p.category] || 0) + 1;
  }
  return counts;
}

export function getCategoryMinPrice(products: Product[], category: string): number {
  let min = Infinity;
  for (const p of products) {
    if (p.category === category && p.price < min) {
      min = p.price;
    }
  }
  return Number.isFinite(min) ? min : 0;
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): {
  items: T[];
  page: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
} {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize;
  const sliced = items.slice(start, start + pageSize);
  return {
    items: sliced,
    page: safePage,
    totalPages,
    startIndex: items.length === 0 ? 0 : start + 1,
    endIndex: Math.min(start + pageSize, items.length),
  };
}

export function getRelatedVariants(products: Product[], product: Product, limit = 12): {
  variants: Product[];
  totalInFamily: number;
} {
  const familyItems = products.filter(
    (p) => p.family === product.family && p.category === product.category
  );

  const prefix = product.spec.split('·')[0]?.trim().toLowerCase() ?? '';
  const prioritized = [...familyItems].sort((a, b) => {
    const aSame = a.spec.split('·')[0]?.trim().toLowerCase() === prefix ? 0 : 1;
    const bSame = b.spec.split('·')[0]?.trim().toLowerCase() === prefix ? 0 : 1;
    if (aSame !== bSame) return aSame - bSame;
    return a.id.localeCompare(b.id);
  });

  const sliced = limit > 0 ? prioritized.slice(0, limit) : prioritized;
  if (!sliced.some((p) => p.id === product.id)) {
    sliced.unshift(product);
  }

  return {
    variants: sliced,
    totalInFamily: familyItems.length,
  };
}

export interface ParsedSpecItem {
  label: string;
  value: string;
}

export function parseProductSpecs(product: Product): ParsedSpecItem[] {
  const segments = product.spec.split('·').map((s) => s.trim()).filter(Boolean);
  const rows: ParsedSpecItem[] = [
    { label: 'SKU Code', value: product.id },
    { label: 'Category', value: product.category },
    { label: 'Product Family', value: product.family },
    { label: 'Selling Unit', value: `Per ${product.unit}` },
  ];

  segments.forEach((seg, idx) => {
    const low = seg.toLowerCase();
    let label = `Specification ${idx + 1}`;
    if (/\d+\s*w\b/i.test(seg)) label = 'Wattage Rating';
    else if (/\d+\s*a\b/i.test(seg) || /\d+\s*ma\b/i.test(seg)) label = 'Current / Trip Rating';
    else if (/mm²|mm\b|ft\b|cm\b|m\b|inch/i.test(seg)) label = 'Size / Length';
    else if (/white|black|champagne|brown|red|blue|green|rgb|warm|cool/i.test(low)) label = 'Finish / Color';
    else if (/pole|sp\b|dp\b|tp\b|tpn\b|1p\+n|3p\+n|way|gang|module|core/i.test(low)) label = 'Configuration';
    else if (/curve/i.test(low)) label = 'Tripping Curve';
    else if (/b22|pin|pack/i.test(low)) label = 'Base / Pack Detail';
    rows.push({ label, value: seg });
  });

  return rows;
}

export function buildCatalogueCsv(products: Product[]): string {
  const columns: (keyof Product)[] = ['id', 'category', 'family', 'spec', 'price', 'unit'];
  const escapeCell = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [
    columns.map(escapeCell).join(','),
    ...products.map((p) => columns.map((k) => escapeCell(p[k])).join(',')),
  ];
  return '\uFEFF' + lines.join('\r\n');
}
