import { useState, type FormEvent } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import type { BusinessSettings, Product } from '../types';
import { validateDealerContact } from '../utils/pilot';
import { ProductVisual } from './ProductVisual';

interface DealerConnectViewProps {
  products: Product[];
  categories: string[];
  settings: BusinessSettings;
  isCloudSynced?: boolean;
  onSubmitLead: (lead: {
    name: string;
    business: string;
    phone: string;
    city: string;
    interest: string;
    currentSupplier: string;
    challenge: string;
  }) => void;
}

const SUPPLIER_OPTIONS = [
  'Havells + local wholesalers',
  'Polycab + local wholesalers',
  'Multiple local wholesalers',
  'Established national brand distributor',
  'Other / Mixed sourcing',
];

export function DealerConnectView({
  products,
  categories,
  settings,
  isCloudSynced = false,
  onSubmitLead,
}: DealerConnectViewProps) {
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(settings.city.split(',')[0] || 'Jaipur');
  const [interest, setInterest] = useState('Multiple categories');
  const [currentSupplier, setCurrentSupplier] = useState(SUPPLIER_OPTIONS[0]);
  const [challenge, setChallenge] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showcaseDb = products.find((p) => p.kind === 'db') ?? products[0];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateDealerContact({ name, business, phone, city });
    const nextErrors: Record<string, string> = { ...validation.errors };
    if (!acknowledged) {
      nextErrors.acknowledged = 'Please confirm submission details before saving.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onSubmitLead({
      name: name.trim(),
      business: business.trim(),
      phone: phone.trim(),
      city: city.trim(),
      interest,
      currentSupplier,
      challenge: challenge.trim(),
    });

    setName('');
    setBusiness('');
    setPhone('');
    setCity(settings.city.split(',')[0] || 'Jaipur');
    setInterest('Multiple categories');
    setCurrentSupplier(SUPPLIER_OPTIONS[0]);
    setChallenge('');
    setAcknowledged(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-[#087c67]">
          {settings.companyName} · {settings.city}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tracking-tight mt-1">
          Let&apos;s build better electrical supply connections.
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-6 items-start">
        {/* Left: Business Context & Direct Contact Card */}
        <div className="bg-white border border-[#dce5e3] rounded-lg p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#087c67]">Focused Local Supply</p>
            <h2 className="font-display text-xl font-bold text-[#142a30]">
              Built for small and medium electrical dealers &amp; contractors.
            </h2>
            <p className="text-sm text-[#5a6d71] leading-relaxed">
              {settings.companyName} supplies electrical dealers, contractors, and builders with a
              single-source portfolio spanning lighting, modular switches, copper wires, MCBs,
              protection devices, and distribution boards—backed by quality discipline and fair
              wholesale margins.
            </p>
          </div>

          {showcaseDb && (
            <div className="h-52 rounded-lg bg-gradient-to-b from-white to-[#eef3f1] border border-[#e3ece9] flex items-center justify-center p-4 overflow-hidden">
              <ProductVisual product={showcaseDb} className="w-full h-full max-w-[300px]" />
            </div>
          )}

          {/* Direct Business Contact Desk */}
          {(settings.contactPhone ||
            settings.contactEmail ||
            settings.address ||
            settings.contactPerson) && (
            <div className="rounded-lg bg-[#f4f8f7] border border-[#dce5e3] p-4 space-y-2 text-xs text-[#2d4348]">
              <div className="font-semibold text-[#142a30]">
                Direct Sales Desk{settings.contactPerson ? ` · ${settings.contactPerson}` : ''}
              </div>
              {settings.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#087c67] shrink-0" aria-hidden="true" />
                  <a href={`tel:${settings.contactPhone}`} className="font-mono hover:underline">
                    {settings.contactPhone}
                  </a>
                </div>
              )}
              {settings.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#087c67] shrink-0" aria-hidden="true" />
                  <a href={`mailto:${settings.contactEmail}`} className="hover:underline">
                    {settings.contactEmail}
                  </a>
                </div>
              )}
              {settings.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#087c67] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{settings.address}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#edf2f0] text-xs">
            <div>
              <div className="font-semibold text-[#142a30]">Direct Field Outreach</div>
              <p className="text-[#5a6d71] mt-1 leading-relaxed">
                In-shop product demonstrations, physical sample kits, and direct wholesale price
                discussions across regional electrical markets.
              </p>
            </div>
            <div>
              <div className="font-semibold text-[#142a30]">Dealer Support</div>
              <p className="text-[#5a6d71] mt-1 leading-relaxed">
                Share your fast-moving categories, current supplier pain points, and target order
                volumes for tailored rate sheets.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Validated Dealer Interest Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-[#dce5e3] rounded-lg p-6 sm:p-8 space-y-4"
        >
          <div>
            <h2 className="font-display text-lg font-bold text-[#142a30]">
              Register Dealer Interest &amp; Sample Request
            </h2>
            <p className="text-xs text-[#5a6d71] mt-1">
              {isCloudSynced
                ? 'Saved enquiries sync immediately to Cloud Firestore for follow-up.'
                : 'Sign in with Google to sync enquiries to Cloud Firestore, or save locally in this browser.'}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="dealer-name" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Contact name *
              </label>
              <input
                id="dealer-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Suresh Gupta"
                className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
              {errors.name && (
                <p role="alert" className="text-xs text-[#a43e2f] mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="dealer-business" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Business / Shop name *
              </label>
              <input
                id="dealer-business"
                type="text"
                required
                maxLength={120}
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="e.g. Gupta Electrical Traders"
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
                <label htmlFor="dealer-phone" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Mobile number *
                </label>
                <input
                  id="dealer-phone"
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
                <label htmlFor="dealer-city" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  City *
                </label>
                <input
                  id="dealer-city"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="dealer-interest" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Primary product interest
                </label>
                <select
                  id="dealer-interest"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                >
                  <option value="Multiple categories">Multiple categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dealer-supplier" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Current primary sourcing
                </label>
                <select
                  id="dealer-supplier"
                  value={currentSupplier}
                  onChange={(e) => setCurrentSupplier(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                >
                  {SUPPLIER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="dealer-challenge" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Main procurement challenge
              </label>
              <textarea
                id="dealer-challenge"
                rows={3}
                maxLength={800}
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                placeholder="e.g. Managing 4–5 suppliers, inconsistent local wire quality, high Tier-1 minimums..."
                className="w-full px-3 py-2.5 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
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
                {!settings.showPrototypeNotices
                  ? `I agree to share my dealer contact details with ${settings.companyName} for wholesale pricing and sample follow-up.`
                  : isCloudSynced
                    ? 'I agree to save this dealer enquiry to Cloud Firestore for follow-up.'
                    : 'I agree to store dealer details locally in this browser.'}
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
            className="w-full py-3 px-5 rounded-md bg-[#087c67] text-white text-sm font-semibold hover:bg-[#066352] transition-colors cursor-pointer"
          >
            Save Dealer Interest
          </button>
        </form>
      </div>
    </div>
  );
}
