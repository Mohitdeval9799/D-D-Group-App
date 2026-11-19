import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import type { Product } from '../types';
import { formatInr, getRelatedVariants, parseProductSpecs } from '../utils/catalog';
import { ProductIllustration } from './ProductIllustration';

interface ProductDetailModalProps {
  product: Product | null;
  cartQty: number;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onAddQuantity: (productId: string, qty: number) => void;
}

const PACK_OPTIONS = [1, 5, 10, 25];

export function ProductDetailModal({
  product,
  cartQty,
  onClose,
  onSelectProduct,
  onAddQuantity,
}: ProductDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [packQty, setPackQty] = useState(1);
  const [showAllVariants, setShowAllVariants] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (product) {
      setPackQty(1);
      setShowAllVariants(false);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [product]);

  if (!product) {
    return <dialog ref={dialogRef} className="hidden" />;
  }

  const specs = parseProductSpecs(product);
  const { variants: siblings, totalInFamily } = getRelatedVariants(
    PRODUCTS,
    product,
    showAllVariants ? 0 : 12
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="product-modal-title"
      className="m-auto w-[92vw] max-w-[860px] max-h-[90vh] overflow-y-auto rounded-xl border border-[#dce5e3] bg-white p-0 text-[#142a30] shadow-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#edf2f0] bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-[#5a6d71]">
          <span className="font-semibold text-[#087c67]">{product.category}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{product.id}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close specifications"
          className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-[#f1f6f4] text-[#142a30] hover:bg-[#e2ede9] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left: Studio Visual */}
          <div className="space-y-3">
            <div className="h-64 sm:h-72 rounded-lg bg-gradient-to-b from-white to-[#eef3f1] border border-[#e3ece9] flex items-center justify-center p-4">
              <ProductIllustration product={product} className="w-full h-full max-w-[320px]" />
            </div>
            <p className="text-[11px] text-[#6d8085] leading-relaxed">
              Representative vector rendering for pilot evaluation — verify physical sample,
              dimensions, and compliance markings before bulk procurement.
            </p>
          </div>

          {/* Right: Contiguous Purchase & Specification Module */}
          <div className="space-y-4">
            <div>
              <h2 id="product-modal-title" className="font-display text-2xl font-bold text-[#142a30]">
                {product.family}
              </h2>
              <p className="text-sm text-[#4a5e63] mt-1">{product.spec}</p>
            </div>

            <div className="flex items-baseline justify-between gap-3 py-3 border-y border-[#edf2f0]">
              <div>
                <div className="font-display text-3xl font-extrabold text-[#142a30] tabular-nums">
                  {formatInr(product.price)}
                </div>
                <div className="text-xs text-[#6d8085] mt-0.5">
                  Sample dealer rate per {product.unit} · excl. GST &amp; freight
                </div>
              </div>
              {cartQty > 0 && (
                <div className="text-xs font-semibold text-[#087c67] font-mono tabular-nums">
                  {cartQty} in basket
                </div>
              )}
            </div>

            {/* Dealer Pack Selector */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#5a6d71]">Trial quantity ({product.unit}s)</div>
              <div className="flex flex-wrap items-center gap-2">
                {PACK_OPTIONS.map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setPackQty(qty)}
                    aria-pressed={packQty === qty}
                    className={`px-3.5 py-1.5 rounded-md font-mono text-xs font-semibold tabular-nums border cursor-pointer ${
                      packQty === qty
                        ? 'border-[#087c67] bg-[#087c67] text-white'
                        : 'border-[#d6e2df] bg-white text-[#4d6267] hover:border-[#9ebfb4]'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
                <span className="text-xs text-[#5a6d71] font-mono tabular-nums ml-auto">
                  Est. {formatInr(product.price * packQty)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAddQuantity(product.id, packQty)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-[#087c67] text-white text-sm font-semibold hover:bg-[#066352] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>
                Add {packQty} {packQty === 1 ? product.unit : `${product.unit}s`} to Trial Basket
              </span>
            </button>

            {/* Technical Specs List */}
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5a6d71] mb-2">
                Technical Summary
              </h3>
              <dl className="divide-y divide-[#edf2f0] border-t border-b border-[#edf2f0] text-xs">
                {specs.map((row) => (
                  <div key={`${row.label}-${row.value}`} className="py-2 flex justify-between gap-4">
                    <dt className="text-[#5a6d71]">{row.label}</dt>
                    <dd className="font-medium text-[#142a30] text-right font-mono">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Related Variants Switcher */}
        {siblings.length > 1 && (
          <div className="pt-4 border-t border-[#edf2f0] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-[#142a30]">
                Variants in {product.family}
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[#5a6d71] font-mono tabular-nums">
                  {siblings.length} of {totalInFamily}
                </span>
                {totalInFamily > 12 && (
                  <button
                    type="button"
                    onClick={() => setShowAllVariants((prev) => !prev)}
                    className="font-semibold text-[#087c67] hover:text-[#066352] cursor-pointer"
                  >
                    {showAllVariants ? 'Show fewer' : `Show all ${totalInFamily}`}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {siblings.map((variant) => {
                const isCurrent = variant.id === product.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onSelectProduct(variant)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'border-[#087c67] bg-[#e6f3ee] text-[#066352] font-semibold'
                        : 'border-[#dce5e3] bg-white text-[#354c51] hover:border-[#9ebfb4]'
                    }`}
                  >
                    <span className="truncate">{variant.spec}</span>
                    <span className="font-mono tabular-nums shrink-0">{formatInr(variant.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
