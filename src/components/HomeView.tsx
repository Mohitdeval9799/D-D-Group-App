import { ArrowRight } from 'lucide-react';
import { CATEGORIES, PRODUCTS } from '../data/products';
import { CATEGORY_SUMMARIES, VENTURE_META } from '../data/venturePlan';
import { formatInr, getCategoryCounts, getCategoryMinPrice } from '../utils/catalog';
import type { PageId, Product } from '../types';
import { ProductIllustration } from './ProductIllustration';

interface HomeViewProps {
  onNavigate: (page: PageId) => void;
  onSelectCategory: (category: string) => void;
}

const HERO_SHOWCASE_IDS = ['DD-0053', 'DD-0001', 'DD-0257', 'DD-0196'];

export function HomeView({ onNavigate, onSelectCategory }: HomeViewProps) {
  const counts = getCategoryCounts(PRODUCTS, CATEGORIES);

  const heroProducts = HERO_SHOWCASE_IDS.map(
    (id) => PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0]
  );

  const categoryRep = (cat: string): Product =>
    PRODUCTS.find((p) => p.category === cat) ?? PRODUCTS[0];

  return (
    <div className="space-y-12">
      {/* 1. Architectural Industrial Hero */}
      <section className="rounded-xl bg-[#0d2f2c] text-white overflow-hidden border border-[#194843]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-8 sm:p-11 lg:p-14 flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <p className="text-xs font-medium tracking-wider text-[#8ad8be]">
                D&amp;D Group · Jaipur, Rajasthan Dealer Pilot
              </p>
              <h1
                className="font-display font-extrabold tracking-tight text-white leading-[1.08] max-w-xl"
                style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.45rem)', textWrap: 'balance' }}
              >
                Built around your electrical business.
              </h1>
              <p className="text-base sm:text-[17px] text-[#c7ddd6] leading-relaxed max-w-[56ch]">
                Source modular switches, LED lighting, FR copper wires, switchgear, distribution
                boards, and electrical accessories from one dependable manufacturing partner.
                Compare all 329 sample variants and assemble your Jaipur trial request in minutes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('catalogue')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-white text-[#0d2f2c] font-semibold text-sm hover:bg-[#eaf4f0] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore {PRODUCTS.length} Products</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dealer')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-white/25 text-white font-medium text-sm hover:bg-white/10 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Request Dealer Sample Kit
              </button>
            </div>
          </div>

          {/* 2x2 Industrial Studio Render Showcase */}
          <div className="lg:col-span-5 bg-[#123d38] border-t lg:border-t-0 lg:border-l border-white/10 p-6 sm:p-8 flex items-center">
            <div className="grid grid-cols-2 gap-3.5 w-full">
              {heroProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelectCategory(product.category)}
                  className="group text-left rounded-lg bg-[#f6f9f8] p-3 transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="h-28 sm:h-32 flex items-center justify-center">
                    <ProductIllustration product={product} className="w-full h-full max-w-[180px]" />
                  </div>
                  <div className="pt-2 border-t border-[#dde6e3] flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#142a30] truncate">
                      {product.category}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-[#087c67] shrink-0">
                      {formatInr(product.price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Full-Width 4-Column Key Metrics Strip */}
      <section aria-label="Venture pilot overview" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#dce5e3] rounded-lg p-5">
          <div className="text-xs text-[#5a6d71]">Sample Catalogue</div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tabular-nums mt-1.5">
            {PRODUCTS.length}
          </div>
          <div className="text-xs text-[#5a6d71] mt-1">Selectable electrical SKUs</div>
        </div>
        <div className="bg-white border border-[#dce5e3] rounded-lg p-5">
          <div className="text-xs text-[#5a6d71]">Product Categories</div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tabular-nums mt-1.5">
            {CATEGORIES.length}
          </div>
          <div className="text-xs text-[#5a6d71] mt-1">Switches, lighting, protection &amp; cables</div>
        </div>
        <div className="bg-white border border-[#dce5e3] rounded-lg p-5">
          <div className="text-xs text-[#5a6d71]">Initial Beachhead</div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] mt-1.5">
            Jaipur
          </div>
          <div className="text-xs text-[#5a6d71] mt-1">SME dealers &amp; contractors in Rajasthan</div>
        </div>
        <div className="bg-white border border-[#dce5e3] rounded-lg p-5">
          <div className="text-xs text-[#5a6d71]">30-Day Pilot Goal</div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#087c67] tabular-nums mt-1.5">
            {VENTURE_META.pilotTargetDealers} Dealers
          </div>
          <div className="text-xs text-[#5a6d71] mt-1">Target milestone, not achieved sales</div>
        </div>
      </section>

      {/* Transparent student prototype notice */}
      <div className="rounded-lg bg-[#fbf6e6] border border-[#e6d8ad] px-4 py-3 text-xs text-[#695326] leading-relaxed">
        <strong className="font-semibold">Jaipur Pilot Prototype Notice:</strong> Product renderings
        are original vector illustrations, not factory photographs or certified engineering
        drawings. Catalogue prices and specs are sample wholesale estimates for venture validation.
        No live inventory, BIS/ISI certification claim, online payment, or external order
        transmission is active.
      </div>

      {/* 3. Complete 13-Category Electrical Portfolio */}
      <section aria-labelledby="portfolio-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#087c67]">Complete One-Stop Portfolio</p>
            <h2 id="portfolio-heading" className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tracking-tight mt-1">
              Browse all {CATEGORIES.length} electrical categories.
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('catalogue')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[#cde0da] bg-white text-sm font-semibold text-[#087c67] hover:bg-[#edf6f2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View full catalogue</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((category) => {
            const rep = categoryRep(category);
            const minPrice = getCategoryMinPrice(PRODUCTS, category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => onSelectCategory(category)}
                className="group bg-white border border-[#dce5e3] rounded-lg overflow-hidden text-left hover:border-[#8eb8ab] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 flex flex-col cursor-pointer"
              >
                <div className="h-36 bg-gradient-to-b from-white to-[#eef3f1] flex items-center justify-center p-3 border-b border-[#eaf0ee]">
                  <ProductIllustration product={rep} className="w-full h-full max-w-[210px]" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-[15px] font-bold text-[#142a30] group-hover:text-[#087c67] transition-colors">
                        {category}
                      </h3>
                      <span className="font-mono text-xs tabular-nums text-[#5a6d71]">
                        {counts[category]} SKUs
                      </span>
                    </div>
                    <p className="text-xs text-[#5a6d71] leading-relaxed mt-1.5">
                      {CATEGORY_SUMMARIES[category]}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#edf2f0] flex items-center justify-between text-xs">
                    <span className="text-[#5a6d71]">
                      From <strong className="font-mono tabular-nums text-[#142a30]">{formatInr(minPrice)}</strong>
                    </span>
                    <span className="font-semibold text-[#087c67] group-hover:translate-x-0.5 transition-transform">
                      Explore →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Value Proposition & Pilot Workflow */}
      <section aria-labelledby="value-heading" className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div className="bg-white border border-[#dce5e3] rounded-lg p-6 sm:p-8 space-y-3">
          <p className="text-xs font-semibold text-[#087c67]">Solving Dealer Procurement Friction</p>
          <h2 id="value-heading" className="font-display text-xl font-bold text-[#142a30]">
            One supplier instead of five fragmented distributors.
          </h2>
          <p className="text-sm text-[#5a6d71] leading-relaxed">
            Small and medium electrical dealers and contractors across Jaipur typically juggle
            separate suppliers for wires, lighting, switches, and switchgear—leading to
            inconsistent quality, squeezed margins on Tier-1 brands, and stockouts on site.
            D&amp;D Group combines trading insight with in-house manufacturing control to deliver
            consistent quality at competitive dealer pricing.
          </p>
        </div>

        <div className="bg-white border border-[#dce5e3] rounded-lg p-6 sm:p-8 space-y-3">
          <p className="text-xs font-semibold text-[#087c67]">Built for 30-Day Evidence Gathering</p>
          <h3 className="font-display text-xl font-bold text-[#142a30]">
            Test demand, quality feedback, and repeat interest locally.
          </h3>
          <p className="text-sm text-[#5a6d71] leading-relaxed">
            Use this prototype during dealer visits across Jaipur to demonstrate the full 329-SKU
            range, capture structured trial baskets around the ₹5,000 average order benchmark, log
            procurement objections, and track progress toward 10 paying trial dealers and 30% repeat
            order interest in the Pilot Dashboard.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="text-sm font-semibold text-[#087c67] hover:text-[#066352] cursor-pointer"
            >
              Open Pilot Validation Dashboard →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
