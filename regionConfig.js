// regionConfig.js — single source of truth for every region.
// Prices live ONLY here (server-side). They are never sent to the storefront;
// the customer sees the total on the secure payment page. Set your own prices.
const PRODUCTS = {
  powerbank45w: { name: 'VosiVosi 45W Laptop Fast-Charging Power Bank', blurb: '45W USB-C PD. Charges laptops, phones and tablets.', tag: 'power' },
  solarfan15w:  { name: '15W Solar Utility Fan', blurb: 'Runs off the sun. Built for power cuts and hot rooms.', tag: 'solar' }
};

const REGIONS = {
  ZM: {
    code: 'ZM', label: 'Zambia', flag: '🇿🇲', default: true,
    currency: 'ZMW',
    prices: { powerbank45w: 650, solarfan15w: 480 },          // PLACEHOLDER
    payment: {
      options: 'mobilemoneyzambia,card',
      methods: ['MTN Mobile Money', 'Airtel Money', 'Zamtel Kwacha', 'Card'],
      buttonLabel: 'Buy via Mobile Money / Card'
    },
    delivery: 'Delivery across Zambia',
    phoneHint: '+260 97X XXX XXX'
  },
  ZA: {
    code: 'ZA', label: 'South Africa', flag: '🇿🇦',
    currency: 'ZAR',
    prices: { powerbank45w: 699, solarfan15w: 529 },          // PLACEHOLDER
    payment: {
      options: 'card,banktransfer,ussd',   // confirm rails enabled on your Flutterwave ZA account
      methods: ['Card', 'Instant EFT'],
      buttonLabel: 'Pay by Card / EFT'
    },
    delivery: 'Delivery across South Africa',
    phoneHint: '+27 7X XXX XXXX'
  }
};

const DEFAULT_REGION = Object.values(REGIONS).find(r => r.default).code;
const resolveRegion = (code) => REGIONS[String(code || '').toUpperCase()] || REGIONS[DEFAULT_REGION];

// Public subset: NO prices.
const publicCatalog = () => ({
  defaultRegion: DEFAULT_REGION,
  products: PRODUCTS,
  regions: Object.fromEntries(Object.entries(REGIONS).map(([k, r]) => [k, {
    label: r.label, flag: r.flag, currency: r.currency,
    methods: r.payment.methods, buttonLabel: r.payment.buttonLabel,
    delivery: r.delivery, phoneHint: r.phoneHint
  }]))
});

module.exports = { PRODUCTS, REGIONS, DEFAULT_REGION, resolveRegion, publicCatalog };
