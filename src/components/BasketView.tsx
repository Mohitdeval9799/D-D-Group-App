import { useState, type FormEvent } from 'react';
import { ArrowLeft, Minus, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { VENTURE_META } from '../data/venturePlan';
import type { CartItem, PageId } from '../types';
import { formatInr } from '../utils/catalog';
import { getCartTotals, validateDealerContact } from '../utils/pilot';
import { ProductIllustration } from './ProductIllustration';

interface BasketViewProps {
  items: CartItem[];
  isCloudSynced?: boolean;
  onUpdateCart: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onLoadSampleKit: () => void;
  onNavigate: (page: PageId) => void;
  onSubmitOrder: (details: {
    name: string;
    business: string;
    phone: string;
    city: string;
    segment: string;
    notes: string;
  }) => void;
}

const SEGMENTS = [
  'Electrical Dealer',
  'Electrical Contractor',
  'Builder / Real Estate Developer',
  'Electrician',
  'Commercial / Industrial Buyer',
];

export function BasketView({
  items,
  isCloudSynced = false,
  onUpdateCart,
  onRemoveItem,
  onLoadSampleKit,
  onNavigate,
  onSubmitOrder,
}: BasketViewProps) {
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Jaipur');
  const [segment, setSegment] = useState(SEGMENTS[0]);
  const [notes, setNotes] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totals = getCartTotals(items);
  const benchmarkPct = Math.min(
    100,
    Math.round((totals.subtotal / VENTURE_META.defaultOrderValue) * 100)
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const validation = validateDealerContact({ name, business, phone, city });
    const nextErrors: Record<string, string> = { ...validation.errors };
    if (!acknowledged) {
      nextErrors.acknowledged = 'Please confirm that you understand this is a local browser prototype.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onSubmitOrder({
      name: name.trim(),
      business: business.trim(),
      phone: phone.trim(),
      city: city.trim(),
      segment,
      notes: notes.trim(),
    });

    setName('');
    setBusiness('');
    setPhone('');
    setCity('Jaipur');
    setSegment(SEGMENTS[0]);
    setNotes('');
    setAcknowledged(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#087c67]">Jaipur Dealer Pilot Ordering</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tracking-tight mt-1">
            Your Trial Basket
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('catalogue')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[#cde0da] bg-white text-sm font-semibold text-[#087c67] hover:bg-[#edf6f2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Continue browsing</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
        {/* Left: Basket Items */}
        <div className="bg-white border border-[#dce5e3] rounded-lg p-5 sm:p-6">
          {items.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <p className="font-display text-lg font-bold text-[#142a30]">
                Your trial basket is currently empty.
              </p>
              <p className="text-sm text-[#5a6d71] max-w-md mx-auto leading-relaxed">
                Select electrical SKUs from the 329-product catalogue or load a ready-made Jaipur
                dealer starter mix aligned with our ₹5,000 trial order benchmark.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('catalogue')}
                  className="px-5 py-2.5 rounded-md bg-[#087c67] text-white text-sm font-semibold hover:bg-[#066352] transition-colors cursor-pointer"
                >
                  Explore Products
                </button>
                <button
                  type="button"
                  onClick={onLoadSampleKit}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#cde0da] bg-[#f4faf7] text-[#066352] text-sm font-semibold hover:bg-[#e6f3ee] transition-colors cursor-pointer"
                >
                  <PackagePlus className="w-4 h-4" aria-hidden="true" />
                  <span>Load ₹5,000 Sample Trial Kit</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#edf2f0]">
              <div className="pb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5a6d71]">
                <span className="font-semibold text-[#142a30] tabular-nums">
                  {totals.variantCount} {totals.variantCount === 1 ? 'variant' : 'variants'} ·{' '}
                  {totals.unitCount} total units
                </span>
                <span>Illustrative dealer prices · excl. GST &amp; freight</span>
              </div>

              {items.map((item) => (
                <div key={item.id} className="py-4 flex gap-4 items-start">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-md bg-gradient-to-b from-white to-[#eef3f1] border border-[#e3ece9] p-1.5 flex items-center justify-center">
                    <ProductIllustration product={item} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] text-[#5a6d71] flex items-center gap-1.5">
                          <span className="text-[#087c67] font-medium">{item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{item.id}</span>
                        </div>
                        <h2 className="font-display text-sm sm:text-[15px] font-bold text-[#142a30] mt-0.5">
                          {item.family}
                        </h2>
                        <p className="text-xs text-[#52666b]">{item.spec}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display text-base font-bold text-[#142a30] tabular-nums">
                          {formatInr(item.price * item.qty)}
                        </div>
                        <div className="text-[11px] text-[#6d8085] font-mono tabular-nums">
                          {formatInr(item.price)} / {item.unit}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="inline-flex items-center rounded-md border border-[#d1dedb] bg-white">
                        <button
                          type="button"
                          onClick={() => onUpdateCart(item.id, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="w-8 h-8 inline-flex items-center justify-center text-[#142a30] hover:bg-[#f4f7f6] cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 font-mono text-xs font-semibold tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateCart(item.id, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="w-8 h-8 inline-flex items-center justify-center text-[#142a30] hover:bg-[#f4f7f6] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Remove ${item.name} from trial basket`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#8a3c32] hover:text-[#6e2920] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Dealer Trial Request Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-[#dce5e3] rounded-lg p-5 sm:p-6 space-y-4"
        >
          <div>
            <h2 className="font-display text-lg font-bold text-[#142a30]">
              Trial Request Details
            </h2>
            <p className="text-xs text-[#5a6d71] mt-1">
              {isCloudSynced
                ? 'No minimum order enforced and no online payment collected. This request saves directly to your Cloud Firestore account.'
                : 'No minimum order enforced and no online payment collected. Records stay in this browser unless you sign in with Google.'}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="order-name" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Contact name *
              </label>
              <input
                id="order-name"
                name="name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
              {errors.name && (
                <p role="alert" className="text-xs text-[#a43e2f] mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="order-business" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Business / Shop name *
              </label>
              <input
                id="order-business"
                name="business"
                type="text"
                required
                maxLength={120}
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="e.g. Sharma Electricals, Johari Bazaar"
                className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
              {errors.business && (
                <p role="alert" className="text-xs text-[#a43e2f] mt-1">
                  {errors.business}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="order-phone" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Mobile number *
                </label>
                <input
                  id="order-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit Indian mobile"
                  className="w-full px-3 py-2.5 text-sm font-mono rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                />
                {errors.phone && (
                  <p role="alert" className="text-xs text-[#a43e2f] mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="order-city" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  City *
                </label>
                <input
                  id="order-city"
                  name="city"
                  type="text"
                  required
                  maxLength={80}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                />
                {errors.city && (
                  <p role="alert" className="text-xs text-[#a43e2f] mt-1">
                    {errors.city}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="order-segment" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Buyer segment
              </label>
              <select
                id="order-segment"
                name="segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              >
                {SEGMENTS.map((seg) => (
                  <option key={seg} value={seg}>
                    {seg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="order-notes" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Requirements / sample notes
              </label>
              <textarea
                id="order-notes"
                name="notes"
                rows={3}
                maxLength={800}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preferred delivery window, sample comparisons, or bulk credit questions..."
                className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>
          </div>

          {/* Live Basket Summary & Benchmark */}
          <div className="pt-3 border-t border-[#edf2f0] space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#5a6d71]">Estimated sample subtotal</span>
              <strong className="font-display text-xl font-extrabold text-[#142a30] tabular-nums" data-testid="basket-subtotal">
                {formatInr(totals.subtotal)}
              </strong>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#5a6d71]">
                <span>vs. Venture Plan avg trial order ({formatInr(VENTURE_META.defaultOrderValue)})</span>
                <span className="font-mono tabular-nums">{benchmarkPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#e6efec] overflow-hidden">
                <div
                  className="h-full bg-[#087c67] transition-all duration-200"
                  style={{ width: `${benchmarkPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2.5 text-xs text-[#4a5e63] leading-relaxed cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-[#b8cbc5] accent-[#087c67]"
              />
              <span>
                {isCloudSynced
                  ? 'I understand this is a Jaipur pilot prototype request saved to my Cloud Firestore account with no online payment collected.'
                  : 'I understand this is a student venture prototype and agree to store fictional demo details locally in this browser.'}
              </span>
            </label>
            {errors.acknowledged && (
              <p role="alert" className="text-xs text-[#a43e2f] mt-1">
                {errors.acknowledged}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={items.length === 0}
            className="w-full py-3 px-5 rounded-md bg-[#087c67] text-white text-sm font-semibold hover:bg-[#066352] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isCloudSynced ? 'Save Trial Request to Cloud →' : 'Save Demo Trial Request →'}
          </button>
        </form>
      </div>
    </div>
  );
}
