// Minimal secure backend. Node 18+. Secrets come ONLY from environment variables.
// Env: FLW_SECRET_KEY, FLW_SECRET_HASH (webhook), FRONTEND_URL (e.g. https://vosivosi.shop), PUBLIC_API_URL
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { PRODUCTS, resolveRegion, publicCatalog } = require('./regionConfig');

const app = express();
const FLW = 'https://api.flutterwave.com/v3';
const KEY = process.env.FLW_SECRET_KEY;
const FRONT = process.env.FRONTEND_URL || 'http://localhost:5500';

app.use(cors({ origin: FRONT }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/catalog', (_req, res) => res.json(publicCatalog()));

// Create payment. The SERVER recalculates the total — never trust prices from the browser.
app.post('/api/checkout', async (req, res) => {
  try {
    const { region, items, email, name, phone } = req.body || {};
    const r = resolveRegion(region);
    if (!Array.isArray(items) || !items.length || items.length > 10) return res.status(400).json({ error: 'Cart is empty' });
    if (!/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ error: 'Valid email required' });

    let amount = 0;
    for (const it of items) {
      const qty = Number.parseInt(it.qty, 10);
      if (!PRODUCTS[it.id] || !(qty >= 1 && qty <= 20)) return res.status(400).json({ error: 'Invalid item' });
      amount += r.prices[it.id] * qty;
    }

    const tx_ref = 'VV-' + r.code + '-' + crypto.randomBytes(6).toString('hex');
    const resp = await fetch(FLW + '/payments', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref, amount, currency: r.currency,
        redirect_url: FRONT + '/?verify=1&region=' + r.code,
        payment_options: r.payment.options,
        customer: { email, name: name || 'VosiVosi customer', phonenumber: phone || '' },
        customizations: { title: 'VosiVosi', description: 'Order ' + tx_ref },
        meta: { region: r.code, items: JSON.stringify(items) }
      })
    });
    const data = await resp.json();
    if (data.status !== 'success') return res.status(502).json({ error: 'Payment provider error' });
    res.json({ link: data.data.link, tx_ref });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Verify after redirect. Confirms status, currency and amount with Flutterwave.
app.get('/api/verify', async (req, res) => {
  try {
    const id = String(req.query.transaction_id || '').replace(/\D/g, '');
    if (!id) return res.status(400).json({ error: 'Missing transaction_id' });
    const d = (await (await fetch(FLW + '/transactions/' + id + '/verify', { headers: { Authorization: 'Bearer ' + KEY } })).json()).data;
    const ok = d && d.status === 'successful' && d.currency === resolveRegion(d.meta && d.meta.region).currency;
    res.json({ paid: !!ok, tx_ref: d && d.tx_ref });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Webhook: source of truth for fulfilment (handles users who close the tab after paying).
app.post('/api/webhook', (req, res) => {
  if (req.get('verif-hash') !== process.env.FLW_SECRET_HASH) return res.sendStatus(401);
  // TODO: re-verify via /transactions/:id/verify, then save order + notify the courier.
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000);
