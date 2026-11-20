import { useMemo, useRef } from 'react';
import { Download, Minus, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { BusinessSettings, Product, SortMode } from '../types';
import {
  buildCatalogueCsv,
  filterProducts,
  formatInr,
  getCategoryCounts,
  getFamiliesForCategory,
  PAGE_SIZE,
  paginate,
} from '../utils/catalog';
import { calculateDealerMarginPercent } from '../utils/catalogMerge';
import { ProductVisual } from './ProductVisual';

interface CatalogueViewProps {
  products: Product[];
  categories: string[];
  settings: BusinessSettings;
  category: string;
  family: string;
  search: string;
  sort: SortMode;
  page: number;
  cart: Record<string, number>;
  basketUnitCount: number;
  basketSubtotal: number;
  onCategoryChange: (category: string) => void;
  onFamilyChange: (family: string) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: SortMode) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  onUpdateCart: (productId: string, delta: number) => void;
  onInspectProduct: (product: Product) => void;
  onExportCsv: (csvText: string) => void;
  onOpenBasket: () => void;
}

export function CatalogueView({
  products,
  categories,
  settings,
  category,
  family,
  search,
  sort,
  page,
  cart,
  basketUnitCount,
  basketSubtotal,
  onCategoryChange,
  onFamilyChange,
  onSearchChange,
  onSortChange,
  onPageChange,
  onClearFilters,
  onUpdateCart,
  onInspectProduct,
  onExportCsv,
  onOpenBasket,
}: CatalogueViewProps) {
  const topControlsRef = useRef<HTMLDivElement>(null);

  const categoryCounts = useMemo(
    () => getCategoryCounts(products, categories),
    [products, categories]
  );
  const families = useMemo(
    () => getFamiliesForCategory(products, category),
    [products, category]
  );

  const filtered = useMemo(
    () => filterProducts(products, { category, family, search, sort }),
    [products, category, family, search, sort]
  );

  const paged = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page]);

  const hasActiveFilter =
    category !== 'All' || family !== 'all' || search.trim() !== '' || sort !== 'default';

  const handlePageMove = (nextPage: number) => {
    onPageChange(nextPage);
    topControlsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#087c67]">
            {settings.companyName} B2B Electrical Portfolio
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tracking-tight mt-1">
            Electrical Product Catalogue
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onExportCsv(buildCatalogueCsv(products))}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#cde0da] bg-white text-sm font-semibold text-[#087c67] hover:bg-[#edf6f2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Export Catalogue CSV</span>
        </button>
      </div>

      {/* Technical Disclaimer or Commercial Pricing Note */}
      {settings.showPrototypeNotices ? (
        <div className="rounded-lg bg-[#fbf6e6] border border-[#e6d8ad] px-4 py-3 text-xs text-[#695326] leading-relaxed">
          Representative illustrations shown where factory photos have not been uploaded. Always
          verify exact ratings, poles, and dimensions from specifications. {settings.gstNote}. PCB
          refers to printed circuit boards.
        </div>
      ) : (
        settings.gstNote && (
          <div className="rounded-lg bg-[#edf5f2] border border-[#cde0da] px-4 py-2.5 text-xs text-[#2d4348]">
            {settings.gstNote}
          </div>
        )
      )}

      {/* Sidebar + Main Catalogue Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
        {/* Category Sidebar */}
        <aside
          aria-label="Product categories"
          className="bg-white border border-[#dce5e3] rounded-lg p-3 lg:sticky lg:top-20"
        >
          <h2 className="hidden lg:block font-display text-xs font-bold uppercase tracking-wider text-[#5a6d71] px-2.5 pt-1 pb-2.5 border-b border-[#edf2f0]">
            Categories ({categories.length})
          </h2>
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:pt-2 pb-1 lg:pb-0">
            {['All', ...categories].map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onCategoryChange(cat)}
                  aria-pressed={active}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md text-xs sm:text-[13px] whitespace-nowrap shrink-0 lg:w-full transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#e6f3ee] text-[#066352] font-semibold'
                      : 'text-[#4d6267] hover:bg-[#f4f7f6] hover:text-[#142a30]'
                  }`}
                >
                  <span className="truncate">{cat === 'All' ? 'All products' : cat}</span>
                  <span className="font-mono text-[11px] tabular-nums opacity-75">
                    {categoryCounts[cat] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {basketUnitCount > 0 && (
            <div className="hidden lg:block mt-4 pt-3.5 border-t border-[#edf2f0] px-1 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5a6d71]">Trial Basket</span>
                <span className="font-mono font-semibold tabular-nums text-[#142a30]">
                  {basketUnitCount} {basketUnitCount === 1 ? 'unit' : 'units'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5a6d71]">Est. subtotal</span>
                <strong className="font-mono font-bold tabular-nums text-[#087c67]">
                  {formatInr(basketSubtotal)}
                </strong>
              </div>
              <button
                type="button"
                onClick={onOpenBasket}
                className="w-full py-2 px-3 rounded-md bg-[#087c67] text-white text-xs font-semibold hover:bg-[#066352] transition-colors cursor-pointer"
              >
                Review Trial Basket →
              </button>
            </div>
          )}
        </aside>

        {/* Main Workspace */}
        <div ref={topControlsRef} className="space-y-4 min-w-0">
          {/* Search, Family & Sort Toolbar */}
          <div className="bg-white border border-[#dce5e3] rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_210px_185px] gap-3">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-[#6d8085] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  aria-label="Search products"
                  placeholder="Search wattage, colour, mm², pole, or SKU (e.g. TPN 32A)..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30] placeholder:text-[#7c8f93] focus:border-[#087c67]"
                />
              </div>

              <div className="relative">
                <label htmlFor="family-filter" className="sr-only">
                  Filter by product family
                </label>
                <select
                  id="family-filter"
                  value={family}
                  onChange={(e) => onFamilyChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30] focus:border-[#087c67]"
                >
                  <option value="all">All product families</option>
                  {families.map((fam) => (
                    <option key={fam} value={fam}>
                      {fam}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label htmlFor="sort-order" className="sr-only">
                  Sort products
                </label>
                <select
                  id="sort-order"
                  value={sort}
                  onChange={(e) => onSortChange(e.target.value as SortMode)}
                  className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30] focus:border-[#087c67]"
                >
                  <option value="default">Featured order</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[#5a6d71]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#087c67]" aria-hidden="true" />
                <span className="tabular-nums" data-testid="catalog-results-count">
                  {filtered.length > 0
                    ? `${filtered.length} ${filtered.length === 1 ? 'variant' : 'variants'} · showing ${paged.startIndex}–${paged.endIndex}`
                    : 'No matching variants found'}
                </span>
              </div>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087c67] hover:text-[#066352] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Product Grid */}
          {paged.items.length === 0 ? (
            <div className="bg-white border border-[#dce5e3] rounded-lg p-12 text-center space-y-4">
              <p className="font-display text-lg font-semibold text-[#142a30]">
                No electrical variants match your current filters.
              </p>
              <p className="text-sm text-[#5a6d71]">
                Try searching with fewer terms (e.g. &ldquo;16A&rdquo;, &ldquo;9W&rdquo;, or
                &ldquo;2.5 mm2&rdquo;) or reset filters to browse all {products.length} SKUs.
              </p>
              <button
                type="button"
                onClick={onClearFilters}
                className="px-4 py-2 rounded-md bg-[#087c67] text-white text-sm font-semibold hover:bg-[#066352] cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {paged.items.map((product) => {
                const qtyInCart = cart[product.id] ?? 0;
                const marginPct = calculateDealerMarginPercent(product.price, product.mrp);
                const outOfStock = product.inStock === false;

                return (
                  <article
                    key={product.id}
                    className="bg-white border border-[#dce5e3] rounded-lg overflow-hidden flex flex-col hover:border-[#8eb8ab] hover:shadow-md transition-all duration-150"
                  >
                    <button
                      type="button"
                      onClick={() => onInspectProduct(product)}
                      aria-label={`Inspect ${product.name}`}
                      className="h-44 bg-gradient-to-b from-white to-[#eef3f1] flex items-center justify-center p-3 border-b border-[#edf2f0] overflow-hidden cursor-pointer"
                    >
                      <ProductVisual product={product} className="w-full h-full max-w-[260px]" />
                    </button>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#5a6d71]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium text-[#087c67] truncate">
                              {product.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono shrink-0">{product.id}</span>
                          </div>
                          {outOfStock && (
                            <span className="text-[#a43e2f] font-semibold shrink-0">
                              Out of stock
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-[15px] font-bold text-[#142a30] leading-snug">
                          {product.family}
                        </h3>
                        <p className="text-xs text-[#52666b] leading-relaxed min-h-[2.4rem]">
                          {product.spec}
                        </p>
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-[#edf2f0]">
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-display text-xl font-extrabold text-[#142a30] tabular-nums leading-none">
                                {formatInr(product.price)}
                              </span>
                              {product.mrp && product.mrp > product.price && (
                                <span className="font-mono text-xs text-[#7c8f93] line-through tabular-nums">
                                  {formatInr(product.mrp)}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6d8085] mt-1">
                              Dealer / {product.unit}
                              {marginPct !== null && (
                                <span className="text-[#087c67] font-semibold">
                                  {' '}
                                  · {marginPct}% margin
                                </span>
                              )}
                              {(product.moq ?? 1) > 1 && <span> · MOQ {product.moq}</span>}
                            </div>
                          </div>

                          {outOfStock ? (
                            <span className="text-xs font-semibold text-[#9c3224]">Unavailable</span>
                          ) : qtyInCart > 0 ? (
                            <div className="inline-flex items-center rounded-md border border-[#087c67] bg-[#eef7f3]">
                              <button
                                type="button"
                                onClick={() => onUpdateCart(product.id, -1)}
                                aria-label={`Decrease quantity of ${product.name}`}
                                className="w-8 h-8 inline-flex items-center justify-center text-[#066352] hover:bg-[#dceee7] rounded-l-md cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 font-mono text-xs font-semibold tabular-nums text-[#0d2f2c]">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateCart(product.id, 1)}
                                aria-label={`Increase quantity of ${product.name}`}
                                className="w-8 h-8 inline-flex items-center justify-center text-[#066352] hover:bg-[#dceee7] rounded-r-md cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onUpdateCart(product.id, Math.max(1, product.moq ?? 1))}
                              aria-label={`Add ${product.name} to trial basket`}
                              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-md bg-[#e8f3ee] text-[#066352] text-xs font-semibold hover:bg-[#087c67] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onInspectProduct(product)}
                          className="w-full text-left text-xs font-medium text-[#526d66] hover:text-[#087c67] pt-0.5 transition-colors cursor-pointer"
                        >
                          View specifications &amp; variants →
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-4 pt-3">
              <button
                type="button"
                disabled={paged.page <= 1}
                onClick={() => handlePageMove(paged.page - 1)}
                className="px-4 py-2 rounded-md border border-[#cde0da] bg-white text-sm font-semibold text-[#087c67] hover:bg-[#edf6f2] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Previous
              </button>
              <span className="font-mono text-xs tabular-nums text-[#5a6d71]">
                Page {paged.page} / {paged.totalPages}
              </span>
              <button
                type="button"
                disabled={paged.page >= paged.totalPages}
                onClick={() => handlePageMove(paged.page + 1)}
                className="px-4 py-2 rounded-md border border-[#cde0da] bg-white text-sm font-semibold text-[#087c67] hover:bg-[#edf6f2] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
