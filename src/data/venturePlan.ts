import type { CompetitorEntry, PilotWeek, ScenarioPreset, ValidationAssumption } from '../types';

export const VENTURE_META = {
  name: 'D&D Group',
  tagline: 'Connected by Quality',
  geography: 'Jaipur & Rajasthan',
  beachhead: 'Small and medium-sized electrical dealers and contractors in Jaipur, Rajasthan',
  pilotTargetDealers: 10,
  pilotTargetRepeatRate: 30,
  pilotBudgetInr: 25000,
  defaultOrderValue: 5000,
  defaultVariableCost: 3500,
  defaultMonthlyFixedCost: 150000,
  marketSize: {
    tamCustomers: 30000,
    samCustomers: 5000,
    somCustomers: 300,
    annualSpendPerCustomer: 120000,
    tamInr: 3600000000, // ₹360 Cr
    samInr: 600000000,  // ₹60 Cr
    somInr: 36000000,   // ₹3.60 Cr
  },
} as const;

export const COMPETITORS: CompetitorEntry[] = [
  {
    id: 'havells',
    name: 'Havells',
    type: 'Direct Competitor',
    priceTier: 'Mid-to-premium',
    axisX: 8,
    axisY: 9,
    mainOffer: 'Wide range of premium electrical products',
    strength: 'Strong brand trust and extensive nationwide distribution network',
    weakness: 'Relatively higher pricing squeezes SME dealer margins',
  },
  {
    id: 'polycab',
    name: 'Polycab',
    type: 'Direct Competitor',
    priceTier: 'Mid-range',
    axisX: 7,
    axisY: 9,
    mainOffer: 'Wires, cables, and a broad range of electrical products',
    strength: 'Strong product quality and deep market presence in cables',
    weakness: 'Higher price than many local alternatives for price-sensitive buyers',
  },
  {
    id: 'local',
    name: 'Local Manufacturers & Wholesalers',
    type: 'Indirect Competitor',
    priceTier: 'Low to mid-range',
    axisX: 3,
    axisY: 5,
    mainOffer: 'Low-cost electrical products with flexible local supply',
    strength: 'Competitive pricing and immediate local availability',
    weakness: 'Inconsistent quality, irregular stock, and limited brand trust',
  },
  {
    id: 'dd-group',
    name: 'D&D Group',
    type: 'Target Venture Position',
    priceTier: 'Competitive B2B wholesale',
    axisX: 5,
    axisY: 8,
    mainOffer: 'One-stop range of LED lights, switches, wires, cables, MCBs, DBs, fans & accessories',
    strength: 'Single-source convenience, consistent in-house quality control, and healthy dealer margins',
    weakness: 'New brand requiring Jaipur trial orders and sample validation to build trust',
    isVenture: true,
  },
];

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    customers: 30,
    purchasesPerCustomer: 1,
    notes: 'Slow initial adoption with limited dealer reach and low repeat purchases while the D&D Group brand is being established.',
  },
  {
    id: 'base',
    label: 'Base Plan',
    customers: 50,
    purchasesPerCustomer: 2,
    notes: 'Moderate dealer adoption in Jaipur with repeat monthly orders and a growing single-source product range (break-even target).',
  },
  {
    id: 'ambitious',
    label: 'Ambitious',
    customers: 80,
    purchasesPerCustomer: 3,
    notes: 'Strong dealer acquisition, consistent repeat purchases, and expansion across major Rajasthan electrical markets.',
  },
];

export const PILOT_ROADMAP: PilotWeek[] = [
  {
    week: 'Week 1',
    channel: 'Direct dealer visits & WhatsApp outreach',
    action: 'Prepare product catalogue, wholesale price sheet, sample kits, and Jaipur dealer pitch.',
    target: 'Shortlist SME electrical dealers across Jaipur markets',
    metric: 'Dealers contacted, meetings booked, samples handed over',
    learningQuestion: 'Which product category and value proposition generate the highest dealer interest?',
  },
  {
    week: 'Week 2',
    channel: 'Direct sales visits & WhatsApp outreach',
    action: 'Launch field visits, in-shop product demonstrations, and first-order trial offers.',
    target: 'Contact ~100 dealers and generate 20–25 serious leads',
    metric: 'Dealer meetings, qualified leads, sample kits distributed',
    learningQuestion: 'Which SKU family and price point spark immediate trial interest?',
  },
  {
    week: 'Week 3',
    channel: 'Phone calls, WhatsApp follow-ups & shop revisits',
    action: 'Follow up on distributed samples and collect structured feedback on quality, finish, and margins.',
    target: 'Convert at least 10 qualified leads into trial orders',
    metric: 'Follow-up response rate, trial-order conversion, key objections',
    learningQuestion: 'What are the main reasons dealers accept or hesitate on the first order?',
  },
  {
    week: 'Week 4',
    channel: 'Dealer feedback, sales review & repeat check-ins',
    action: 'Analyse dealer feedback, refine SKU mix and wholesale pricing, and confirm repeat purchase intent.',
    target: 'Secure 10 paying trial dealers with 30%+ repeat interest',
    metric: 'First orders completed, repeat-order interest %, top objections',
    learningQuestion: 'Which product mix and value proposition best drive dealer retention?',
  },
];

export const TOP_ASSUMPTIONS: ValidationAssumption[] = [
  {
    id: 'a-1',
    title: 'Trial Order Willingness',
    assumption: 'Jaipur electrical dealers will place trial orders for D&D Group products at competitive wholesale prices.',
    whyItMatters: 'If dealers will not risk a small trial order, core demand and positioning must be reconsidered.',
    howToTest: 'Approach 30 Jaipur electrical dealers with a low-friction sample kit and transparent dealer pricing.',
    evidenceNeeded: 'Number of dealers placing paid trial orders and structured feedback on price competitiveness.',
  },
  {
    id: 'a-2',
    title: 'Perceived Product Quality',
    assumption: 'Dealers will rate D&D Group finish, safety, and packaging on par with established mid-range brands.',
    whyItMatters: 'Dealers protect their local contractor reputation and will not stock unreliable electrical goods.',
    howToTest: 'Place physical samples with 20–30 dealers and record ratings across quality, design, and packaging.',
    evidenceNeeded: 'Dealer quality ratings, contractor testing notes, and willingness to reorder after trial.',
  },
  {
    id: 'a-3',
    title: 'Sustainable Manufacturing Margins',
    assumption: 'D&D Group can manufacture and supply competitively priced SKUs while maintaining ~30% contribution margin.',
    whyItMatters: 'If bill-of-materials, packaging, and freight exceed ₹3,500 per ₹5,000 order, unit economics break.',
    howToTest: 'Benchmark verified supplier quotations for copper, polycarbonate, LED drivers, packaging, and Jaipur logistics.',
    evidenceNeeded: 'Verified supplier quotes, landed production cost sheets, gross margin, and break-even validation.',
  },
];

export const CATEGORY_SUMMARIES: Record<string, string> = {
  'Switches': 'Modular 6A/16A, touch, Wi-Fi, DP & regulator modules',
  'Sockets & plates': '3-pin power, USB-A/C, data outlets & 2–16M cover plates',
  'LED lighting': 'Bulbs, recessed downlights, 2×2 panels, battens & outdoor LEDs',
  'Wires': '90 m FR copper house wires & flexible hook-up coils',
  'Cables': 'Multicore flexible, armoured power, solar DC & data cables',
  'MCBs': 'SP, DP, TP & TPN C-curve miniature circuit breakers (6A–63A)',
  'Protection devices': 'RCCB, RCBO, isolators, SPDs, MCCBs & motor control relays',
  'Distribution boards': 'SPN single/double door & TPN metal enclosures (4–16 way)',
  'Fans': 'Standard & BLDC remote ceiling fans, exhaust & portable fans',
  'PCBs & electronics': 'Prototyping boards, LED driver PCBs, relay & buck modules',
  'Conduits & boxes': 'Medium/heavy PVC conduits, fittings & concealed metal boxes',
  'Accessories': 'Tapes, ties, clips, copper lugs, earthing & extension boards',
  'Tools & meters': 'Insulated hand tools, crimpers, multimeters & clamp meters',
};
