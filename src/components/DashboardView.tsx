import { useMemo, useState } from 'react';
import { Database, Download, RotateCcw } from 'lucide-react';
import {
  COMPETITORS,
  PILOT_ROADMAP,
  SCENARIO_PRESETS,
  TOP_ASSUMPTIONS,
  VENTURE_META,
} from '../data/venturePlan';
import type { CompetitorEntry, DealerLead, OrderStatus, TrialOrder } from '../types';
import { formatInr, formatInrCompact } from '../utils/catalog';
import { computePilotMetrics, computeUnitEconomics, VALID_STATUSES } from '../utils/pilot';

interface DashboardViewProps {
  orders: TrialOrder[];
  leads: DealerLead[];
  isCloudSynced?: boolean;
  isAdmin?: boolean;
  userEmail?: string | null;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onRepeatToggle: (orderId: string, repeat: boolean) => void;
  onExportJson: () => void;
  onLoadSampleRecords: () => void;
  onResetAllData: () => void;
}

export function DashboardView({
  orders,
  leads,
  isCloudSynced = false,
  isAdmin = false,
  userEmail = null,
  onStatusChange,
  onRepeatToggle,
  onExportJson,
  onLoadSampleRecords,
  onResetAllData,
}: DashboardViewProps) {
  const [scenarioId, setScenarioId] = useState<'conservative' | 'base' | 'ambitious'>('base');
  const [sellingPrice, setSellingPrice] = useState<number>(VENTURE_META.defaultOrderValue);
  const [variableCost, setVariableCost] = useState<number>(VENTURE_META.defaultVariableCost);
  const [monthlyFixedCost, setMonthlyFixedCost] = useState<number>(
    VENTURE_META.defaultMonthlyFixedCost
  );
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorEntry>(
    COMPETITORS.find((c) => c.isVenture) ?? COMPETITORS[0]
  );
  const [confirmingReset, setConfirmingReset] = useState(false);

  const metrics = useMemo(
    () => computePilotMetrics(orders, leads, VENTURE_META.pilotTargetDealers),
    [orders, leads]
  );

  const activePreset =
    SCENARIO_PRESETS.find((s) => s.id === scenarioId) ?? SCENARIO_PRESETS[1];

  const economics = useMemo(
    () =>
      computeUnitEconomics({
        customers: activePreset.customers,
        purchasesPerCustomer: activePreset.purchasesPerCustomer,
        sellingPrice,
        variableCost,
        monthlyFixedCost,
      }),
    [activePreset, sellingPrice, variableCost, monthlyFixedCost]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#087c67]">
            Local Validation Records · DGU Venture Quest Plan
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tracking-tight mt-1">
            From Assumptions to Evidence
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onExportJson}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#cde0da] bg-white text-sm font-semibold text-[#087c67] hover:bg-[#edf6f2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Export Records JSON</span>
          </button>
        </div>
      </div>

      {/* Storage Mode Notice */}
      {isCloudSynced ? (
        <div className="rounded-lg bg-[#edf6f2] border border-[#cde0da] px-4 py-3 text-xs text-[#194843] leading-relaxed">
          <strong className="font-semibold">Cloud Firestore Synced:</strong> Trial requests, dealer
          enquiries, and basket items are privately persisted for{' '}
          <span className="font-mono">{userEmail}</span>. Pilot figures remain illustrative validation
          records and do not represent collected revenue.
        </div>
      ) : (
        <div className="rounded-lg bg-[#fbf6e6] border border-[#e6d8ad] px-4 py-3 text-xs text-[#695326] leading-relaxed">
          <strong className="font-semibold">Local Browser Mode:</strong> Records currently live only
          in this browser&apos;s storage. Sign in with Google above to sync your Jaipur pilot
          records to Cloud Firestore across devices.
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <section aria-label="Pilot KPI summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#dce5e3] rounded-lg p-5">
          <div className="text-xs text-[#5a6d71]">
            {isCloudSynced ? 'Synced Trial Requests' : 'Local Trial Requests'}
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tabular-nums mt-1.5" data-testid="kpi-requests">
            {metrics.totalRequests}
          </div>
          <div className="text-xs text-[#5a6d71] mt-1">Not verified paid sales</div>
        </div>

        <div className="bg-white border border-[#dce5e3] rounded-lg p-5">
          <div className="text-xs text-[#5a6d71]">Requesting Dealers</div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#087c67] tabular-nums mt-1.5" data-testid="kpi-dealers">
            {metrics.uniqueDealers}
          </div>
          <div className="text-xs text-[#5a6d71] mt-1">Unique mobile numbers</div>
        </div>

        <div className="bg-white border border-[#dce5e3] rounded-lg p-5">
          <div className="text-xs text-[#5a6d71]">Sample Basket Value</div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tabular-nums mt-1.5" data-testid="kpi-value">
            {formatInr(metrics.totalSampleValue)}
          </div>
          <div className="text-xs text-[#5a6d71] mt-1">Illustrative, not collected revenue</div>
        </div>

        <div className="bg-white border border-[#dce5e3] rounded-lg p-5">
          <div className="text-xs text-[#5a6d71]">Dealer Enquiries</div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tabular-nums mt-1.5" data-testid="kpi-leads">
            {metrics.totalLeads}
          </div>
          <div className="text-xs text-[#5a6d71] mt-1">Captured via Dealer Connect</div>
        </div>
      </section>

      {/* 30-Day Pilot Tracker + Interactive Unit Economics */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: 30-Day Pilot Goal Tracker + Market Size */}
        <div className="bg-white border border-[#dce5e3] rounded-lg p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-[#087c67]">Mission 10 · MVP Success Metrics</p>
            <h2 className="font-display text-lg font-bold text-[#142a30] mt-0.5">
              30-Day Jaipur Pilot Tracker
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#4a5e63]">Unique trial dealers (Target: 10)</span>
                <strong className="font-mono tabular-nums text-[#142a30]" data-testid="tracker-dealers">
                  {metrics.uniqueDealers} / {VENTURE_META.pilotTargetDealers}
                </strong>
              </div>
              <div className="h-2 rounded-full bg-[#e6efec] overflow-hidden">
                <div
                  className="h-full bg-[#087c67] transition-all duration-200"
                  style={{ width: `${metrics.dealerGoalProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#4a5e63]">Repeat-purchase interest (Target: 30%)</span>
                <strong className="font-mono tabular-nums text-[#142a30]" data-testid="tracker-repeat">
                  {metrics.repeatRatePercent}%
                </strong>
              </div>
              <div className="h-2 rounded-full bg-[#e6efec] overflow-hidden">
                <div
                  className="h-full bg-[#087c67] transition-all duration-200"
                  style={{ width: `${metrics.repeatRatePercent}%` }}
                />
              </div>
              <p className="text-xs text-[#5a6d71] tabular-nums">
                {metrics.repeatInterestedDealers} of {metrics.uniqueDealers} unique requesting
                dealers marked interested in repeat purchases.
              </p>
            </div>
          </div>

          {/* Mission 8 Market Sizing Summary */}
          <div className="pt-4 border-t border-[#edf2f0] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#142a30]">
                Rajasthan Market Sizing (Mission 8)
              </h3>
              <span className="font-mono text-[11px] text-[#5a6d71] tabular-nums">
                ₹1,20,000 / dealer / yr
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md bg-[#f4f7f6] p-3">
                <div className="text-[11px] text-[#5a6d71]">TAM · Rajasthan</div>
                <div className="font-display text-base font-bold text-[#142a30] tabular-nums mt-0.5">
                  {formatInrCompact(VENTURE_META.marketSize.tamInr)}
                </div>
                <div className="text-[11px] text-[#6d8085] font-mono tabular-nums">30,000 buyers</div>
              </div>
              <div className="rounded-md bg-[#f4f7f6] p-3">
                <div className="text-[11px] text-[#5a6d71]">SAM · Major Cities</div>
                <div className="font-display text-base font-bold text-[#142a30] tabular-nums mt-0.5">
                  {formatInrCompact(VENTURE_META.marketSize.samInr)}
                </div>
                <div className="text-[11px] text-[#6d8085] font-mono tabular-nums">5,000 dealers</div>
              </div>
              <div className="rounded-md bg-[#edf6f2] p-3">
                <div className="text-[11px] text-[#066352]">SOM · Initial Entry</div>
                <div className="font-display text-base font-bold text-[#066352] tabular-nums mt-0.5">
                  {formatInrCompact(VENTURE_META.marketSize.somInr)}
                </div>
                <div className="text-[11px] text-[#087c67] font-mono tabular-nums">300 dealers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Mission 7 Interactive Unit Economics Simulator */}
        <div className="bg-white border border-[#dce5e3] rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#087c67]">Mission 7 · Revenue &amp; Pricing</p>
              <h2 className="font-display text-lg font-bold text-[#142a30] mt-0.5">
                Venture Plan Unit Economics
              </h2>
            </div>

            {/* Scenario Preset Tabs */}
            <div
              role="group"
              aria-label="Unit economics scenarios"
              className="inline-flex items-center p-1 rounded-md bg-[#eff4f2] gap-1"
            >
              {SCENARIO_PRESETS.map((preset) => {
                const active = scenarioId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setScenarioId(preset.id)}
                    aria-pressed={active}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white text-[#0d2f2c] shadow-xs'
                        : 'text-[#5a6d71] hover:text-[#142a30]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-[#5a6d71] leading-relaxed">
            <strong className="text-[#142a30] font-semibold">
              {activePreset.customers} dealers × {activePreset.purchasesPerCustomer} orders/month (
              {economics.monthlyOrders} monthly orders):
            </strong>{' '}
            {activePreset.notes}
          </p>

          {/* Editable Assumptions */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <label className="block">
              <span className="text-[#5a6d71] block mb-1">Avg Order (₹)</span>
              <input
                type="number"
                min={500}
                step={500}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-2.5 py-2 rounded-md border border-[#d1dedb] font-mono tabular-nums text-[#142a30]"
              />
            </label>
            <label className="block">
              <span className="text-[#5a6d71] block mb-1">Variable Cost (₹)</span>
              <input
                type="number"
                min={0}
                step={250}
                value={variableCost}
                onChange={(e) => setVariableCost(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-2.5 py-2 rounded-md border border-[#d1dedb] font-mono tabular-nums text-[#142a30]"
              />
            </label>
            <label className="block">
              <span className="text-[#5a6d71] block mb-1">Fixed Cost / Mo (₹)</span>
              <input
                type="number"
                min={0}
                step={10000}
                value={monthlyFixedCost}
                onChange={(e) => setMonthlyFixedCost(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-2.5 py-2 rounded-md border border-[#d1dedb] font-mono tabular-nums text-[#142a30]"
              />
            </label>
          </div>

          <dl className="divide-y divide-[#edf2f0] border-t border-[#edf2f0] text-sm">
            <div className="py-2.5 flex items-center justify-between">
              <dt className="text-[#5a6d71]">Contribution per order ({economics.marginPercent}%)</dt>
              <dd className="font-mono font-semibold tabular-nums text-[#142a30]">
                {formatInr(economics.contributionPerSale)}
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <dt className="text-[#5a6d71]">Projected monthly revenue</dt>
              <dd
                className="font-mono font-bold tabular-nums text-[#142a30]"
                data-testid="economics-revenue"
              >
                {formatInr(economics.monthlyRevenue)}
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <dt className="text-[#5a6d71]">Monthly operating surplus / deficit</dt>
              <dd
                className={`font-mono font-bold tabular-nums ${
                  economics.operatingSurplus > 0
                    ? 'text-[#087c67]'
                    : economics.operatingSurplus < 0
                      ? 'text-[#a43e2f]'
                      : 'text-[#142a30]'
                }`}
                data-testid="economics-surplus"
              >
                {economics.operatingSurplus < 0
                  ? `-${formatInr(Math.abs(economics.operatingSurplus))}`
                  : formatInr(economics.operatingSurplus)}
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <dt className="text-[#5a6d71]">Monthly break-even volume</dt>
              <dd className="font-mono font-semibold tabular-nums text-[#142a30]">
                {economics.breakEvenOrders} orders / mo
              </dd>
            </div>
          </dl>

          {(sellingPrice !== VENTURE_META.defaultOrderValue ||
            variableCost !== VENTURE_META.defaultVariableCost ||
            monthlyFixedCost !== VENTURE_META.defaultMonthlyFixedCost) && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSellingPrice(VENTURE_META.defaultOrderValue);
                  setVariableCost(VENTURE_META.defaultVariableCost);
                  setMonthlyFixedCost(VENTURE_META.defaultMonthlyFixedCost);
                }}
                className="text-xs font-semibold text-[#087c67] hover:text-[#066352] cursor-pointer"
              >
                Reset to Venture Plan defaults (₹5,000 / ₹3,500 / ₹1,50,000)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Trial Requests Table */}
      <section aria-labelledby="trial-requests-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="trial-requests-heading" className="font-display text-xl font-bold text-[#142a30]">
            Trial Requests ({orders.length})
          </h2>
          {orders.length === 0 && leads.length === 0 && (
            <button
              type="button"
              onClick={onLoadSampleRecords}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#cde0da] bg-white text-xs font-semibold text-[#087c67] hover:bg-[#edf6f2] transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Load 3 Sample Jaipur Pilot Records</span>
            </button>
          )}
        </div>

        <div className="bg-white border border-[#dce5e3] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#dce5e3] bg-[#f8fbfa] text-[11px] uppercase tracking-wider text-[#5a6d71]">
                  <th className="py-3 px-4 font-semibold">Reference / Date</th>
                  <th className="py-3 px-4 font-semibold">Dealer &amp; Segment</th>
                  <th className="py-3 px-4 font-semibold">Basket / Sample Value</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Repeat Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f0]">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-sm text-[#5a6d71]">
                      No local trial requests recorded yet. Add products to your Trial Basket and
                      submit a demo request, or load sample Jaipur pilot records above.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#fafcfb] align-top">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-[#142a30]">
                          {order.id}
                        </div>
                        <div className="text-[11px] text-[#6d8085] mt-0.5 tabular-nums">
                          {new Date(order.date).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="font-semibold text-[#142a30]">{order.business}</div>
                        <div className="text-xs text-[#5a6d71] mt-0.5">
                          {order.name} · {order.city}
                        </div>
                        <div className="text-[11px] text-[#6d8085] font-mono mt-0.5">
                          {order.segment} · {order.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <details className="group">
                          <summary className="cursor-pointer font-semibold text-[#142a30] tabular-nums hover:text-[#087c67]">
                            {order.items.length} variants · {formatInr(order.total)}
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs text-[#52666b] pl-3 border-l border-[#dce5e3]">
                            {order.items.map((it) => (
                              <li key={it.id} className="flex justify-between gap-3">
                                <span>{it.name}</span>
                                <span className="font-mono tabular-nums shrink-0">
                                  × {it.qty} {it.unit}
                                </span>
                              </li>
                            ))}
                            {order.notes && (
                              <li className="pt-1 text-[#6d8085] italic">Note: {order.notes}</li>
                            )}
                          </ul>
                        </details>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          aria-label={`Status for ${order.business}`}
                          value={order.status}
                          disabled={isCloudSynced && !isAdmin && order.status === 'Closed'}
                          title={
                            isCloudSynced && !isAdmin && order.status === 'Closed'
                              ? 'Closed trial requests are locked against further edits.'
                              : undefined
                          }
                          onChange={(e) =>
                            onStatusChange(order.id, e.target.value as OrderStatus)
                          }
                          className="px-2.5 py-1.5 rounded-md border border-[#d1dedb] bg-white text-xs font-medium text-[#142a30] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {VALID_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <label
                          className={`inline-flex items-center gap-2 text-xs font-medium text-[#2d4348] ${
                            isCloudSynced && !isAdmin && order.status === 'Closed'
                              ? 'opacity-60 cursor-not-allowed'
                              : 'cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={order.repeat}
                            disabled={isCloudSynced && !isAdmin && order.status === 'Closed'}
                            onChange={(e) => onRepeatToggle(order.id, e.target.checked)}
                            aria-label={`Mark repeat purchase interest for ${order.business}`}
                            className="rounded border-[#b8cbc5] accent-[#087c67]"
                          />
                          <span>{order.repeat ? 'Interested' : 'Pending'}</span>
                        </label>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Dealer Enquiries Table */}
      <section aria-labelledby="dealer-enquiries-heading" className="space-y-3">
        <h2 id="dealer-enquiries-heading" className="font-display text-xl font-bold text-[#142a30]">
          Dealer Enquiries ({leads.length})
        </h2>
        <div className="bg-white border border-[#dce5e3] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#dce5e3] bg-[#f8fbfa] text-[11px] uppercase tracking-wider text-[#5a6d71]">
                  <th className="py-3 px-4 font-semibold">Contact &amp; Business</th>
                  <th className="py-3 px-4 font-semibold">City</th>
                  <th className="py-3 px-4 font-semibold">Product Interest</th>
                  <th className="py-3 px-4 font-semibold">Current Sourcing &amp; Challenge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f0]">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 px-4 text-center text-sm text-[#5a6d71]">
                      No dealer enquiries saved yet. Capture leads through Dealer Connect.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#fafcfb] align-top">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#142a30]">{lead.business}</div>
                        <div className="text-xs text-[#5a6d71]">
                          {lead.name} · <span className="font-mono">{lead.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#4a5e63]">{lead.city}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#087c67]">
                        {lead.interest}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#52666b] min-w-[240px]">
                        <div className="font-medium text-[#142a30]">{lead.currentSupplier}</div>
                        {lead.challenge && <p className="mt-0.5 text-[#5a6d71]">{lead.challenge}</p>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Competitor Positioning Matrix (Mission 5) + 4-Week Pilot Plan (Mission 9) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Competitor Positioning Matrix */}
        <div className="bg-white border border-[#dce5e3] rounded-lg p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#087c67]">Mission 5 · Competitor Battlefield</p>
            <h2 className="font-display text-lg font-bold text-[#142a30] mt-0.5">
              Price vs. Quality Positioning Matrix
            </h2>
          </div>

          <div className="rounded-lg bg-[#f8fbfa] border border-[#e3ece9] p-3">
            <svg
              viewBox="0 0 420 270"
              className="w-full h-auto"
              role="img"
              aria-label="Competitor positioning scatter chart comparing Havells, Polycab, Local Wholesalers, and D&D Group on price and quality"
            >
              {/* Grid lines */}
              {[1, 2, 3, 4].map((step) => {
                const x = 50 + step * 70;
                const y = 225 - step * 45;
                return (
                  <g key={step}>
                    <line x1={x} y1="25" x2={x} y2="225" stroke="#dce5e3" strokeDasharray="3 3" />
                    <line x1="50" y1={y} x2="390" y2={y} stroke="#dce5e3" strokeDasharray="3 3" />
                  </g>
                );
              })}

              {/* Axes */}
              <line x1="50" y1="225" x2="395" y2="225" stroke="#5a6d71" strokeWidth="1.5" />
              <line x1="50" y1="225" x2="50" y2="20" stroke="#5a6d71" strokeWidth="1.5" />

              {/* Axis Labels */}
              <text x="55" y="246" fontSize="10" fill="#5a6d71">Low Price (1)</text>
              <text x="390" y="246" textAnchor="end" fontSize="10" fill="#5a6d71">High Price (10)</text>
              <text x="16" y="130" transform="rotate(-90 16 130)" textAnchor="middle" fontSize="10" fill="#5a6d71">
                Quality &amp; Consistency (1–10)
              </text>

              {/* Target sweet spot zone */}
              <rect x="165" y="38" width="90" height="65" rx="6" fill="#087c67" fillOpacity="0.08" stroke="#087c67" strokeOpacity="0.25" strokeDasharray="4 3" />

              {/* Plotted Competitors */}
              {COMPETITORS.map((comp) => {
                const cx = 50 + (comp.axisX / 10) * 330;
                const cy = 225 - (comp.axisY / 10) * 195;
                const isSelected = selectedCompetitor.id === comp.id;
                return (
                  <g
                    key={comp.id}
                    onClick={() => setSelectedCompetitor(comp)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="15"
                        fill={comp.isVenture ? '#087c67' : '#142a30'}
                        fillOpacity="0.14"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={comp.isVenture ? 9 : 7}
                      fill={comp.isVenture ? '#087c67' : '#3e5459'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={comp.id === 'polycab' ? cx - 6 : comp.id === 'havells' ? cx + 6 : cx}
                      y={comp.id === 'polycab' ? cy + 20 : cy - 13}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={comp.isVenture ? '700' : '600'}
                      fill={comp.isVenture ? '#066352' : '#142a30'}
                    >
                      {comp.name === 'Local Manufacturers & Wholesalers' ? 'Local Wholesalers' : comp.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {COMPETITORS.map((comp) => (
              <button
                key={comp.id}
                type="button"
                onClick={() => setSelectedCompetitor(comp)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  selectedCompetitor.id === comp.id
                    ? 'border-[#087c67] bg-[#e6f3ee] text-[#066352] font-semibold'
                    : 'border-[#dce5e3] bg-white text-[#4a5e63] hover:border-[#9ebfb4]'
                }`}
              >
                {comp.name === 'Local Manufacturers & Wholesalers' ? 'Local Wholesalers' : comp.name}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-[#edf2f0] space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm text-[#142a30]">{selectedCompetitor.name}</strong>
              <span className="font-mono text-[#5a6d71] tabular-nums">
                Price {selectedCompetitor.axisX}/10 · Quality {selectedCompetitor.axisY}/10
              </span>
            </div>
            <p className="text-[#4a5e63]">
              <strong className="text-[#142a30]">Strength:</strong> {selectedCompetitor.strength}
            </p>
            <p className="text-[#4a5e63]">
              <strong className="text-[#142a30]">Gap / Weakness:</strong>{' '}
              {selectedCompetitor.weakness}
            </p>
          </div>
        </div>

        {/* 4-Week Jaipur Go-To-Market Experiment Roadmap */}
        <div className="bg-white border border-[#dce5e3] rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#087c67]">Mission 9 · Go-To-Market</p>
              <h2 className="font-display text-lg font-bold text-[#142a30] mt-0.5">
                30-Day Jaipur Pilot Roadmap
              </h2>
            </div>
            <span className="font-mono text-xs text-[#5a6d71] tabular-nums">
              Budget: {formatInr(VENTURE_META.pilotBudgetInr)}
            </span>
          </div>

          <ol className="divide-y divide-[#edf2f0]">
            {PILOT_ROADMAP.map((item) => (
              <li key={item.week} className="py-3.5 first:pt-1 last:pb-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-[#142a30]">
                    {item.week}
                  </span>
                  <span className="text-[11px] font-medium text-[#087c67]">{item.target}</span>
                </div>
                <p className="text-xs text-[#4a5e63] leading-relaxed">{item.action}</p>
                <p className="text-[11px] text-[#6d8085]">
                  Learning focus: {item.learningQuestion}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Mission 11 Top 3 Validation Assumptions */}
      <section aria-labelledby="assumptions-heading" className="space-y-3">
        <h2 id="assumptions-heading" className="font-display text-xl font-bold text-[#142a30]">
          Core Venture Assumptions Under Test (Mission 11)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOP_ASSUMPTIONS.map((item, idx) => (
            <div key={item.id} className="bg-white border border-[#dce5e3] rounded-lg p-5 space-y-2.5">
              <div className="text-xs font-semibold text-[#087c67]">
                0{idx + 1}. {item.title}
              </div>
              <p className="text-sm font-medium text-[#142a30] leading-snug">{item.assumption}</p>
              <p className="text-xs text-[#5a6d71] leading-relaxed">
                <strong className="text-[#2d4348]">How we test:</strong> {item.howToTest}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Reset Data Bar (Inline Confirmation, no window.confirm) */}
      <div className="bg-white border border-[#dce5e3] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs text-[#5a6d71]">
          {isCloudSynced
            ? 'Exported JSON includes your synced Cloud Firestore trial requests and dealer enquiries.'
            : 'Exported JSON files include only the demo details entered on this browser.'}
        </span>
        {!confirmingReset ? (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#fcece9] text-[#9b3426] text-xs font-semibold hover:bg-[#f8dcd6] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isCloudSynced ? 'Clear Cloud Pilot Data' : 'Reset Local Data'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#9b3426]">
              {isCloudSynced
                ? 'Delete all your synced Cloud requests, enquiries & basket?'
                : 'Clear all local requests, enquiries & basket?'}
            </span>
            <button
              type="button"
              onClick={() => {
                onResetAllData();
                setConfirmingReset(false);
              }}
              className="px-3 py-1.5 rounded-md bg-[#a43e2f] text-white text-xs font-semibold hover:bg-[#873023] cursor-pointer"
            >
              Confirm Reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="px-3 py-1.5 rounded-md border border-[#d1dedb] bg-white text-xs font-medium text-[#4a5e63] hover:bg-[#f4f7f6] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
