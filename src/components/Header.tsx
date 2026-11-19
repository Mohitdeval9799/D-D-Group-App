import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import type { PageId } from '../types';

interface HeaderProps {
  activePage: PageId;
  basketCount: number;
  onNavigate: (page: PageId) => void;
}

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Discover' },
  { id: 'catalogue', label: 'Products' },
  { id: 'dealer', label: 'Dealer Connect' },
  { id: 'dashboard', label: 'Pilot Dashboard' },
];

export function Header({ activePage, basketCount, onNavigate }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#dce5e3]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#142a30] whitespace-nowrap shrink-0 cursor-pointer"
        >
          D<span className="text-[#087c67]">&amp;</span>D Group
          <span className="text-[#087c67]">.</span>
        </button>

        {/* Zone 2: 4 clean single-line navigation links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-5 whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'text-[#087c67] font-semibold'
                    : 'text-[#52666b] hover:text-[#142a30]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[#087c67]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action CTA + mobile drawer button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('cart')}
            aria-current={activePage === 'cart' ? 'page' : undefined}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'cart'
                ? 'bg-[#0d2f2c] text-white'
                : 'bg-[#087c67] text-white hover:bg-[#066352]'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Trial Basket</span>
            <span className="font-mono tabular-nums text-xs opacity-90">({basketCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-[#dce5e3] text-[#142a30] hover:bg-[#f4f7f6] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-[#dce5e3] bg-white px-4 py-3 flex flex-col gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#e8f3ee] text-[#087c67] font-semibold'
                    : 'text-[#42555a] hover:bg-[#f4f7f6]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
