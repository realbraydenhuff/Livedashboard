const cfg = window.DASHBOARD_CONFIG;
const state = {
  baselines: new Map(),
  intervalId: null,
  lastAlerts: []
};

const els = {
  statusText: document.getElementById('statusText'),
  lastUpdate: document.getElementById('lastUpdate'),
  refreshInterval: document.getElementById('refreshInterval'),
  refreshNow: document.getElementById('refreshNow'),
  kpiWallets: document.getElementById('kpiWallets'),
  kpiPositions: document.getElementById('kpiPositions'),
  kpiPnl: document.getElementById('kpiPnl'),
  kpiMarkets: document.getElementById('kpiMarkets'),
  walletTable: document.getElementById('walletTable'),
  tradeTable: document.getElementById('tradeTable'),
  marketTable: document.getElementById('marketTable'),
  alerts: document.getElementById('alerts'),
  walletList: document.getElementById('walletList'),
  marketList: document.getElementById('marketList')
};

const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n || 0));
const num = (n, d = 2) => Number(n || 0).toFixed(d);
function formatCentralTime(ts) {
  const date = new Date(ts);
function formatCentralTimeWithAgo(ts) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now - date;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);

  let ago = '';
  if (minutes < 60) {
    ago = `${minutes}m ago`;
  } else if (hours < 24) {
    ago = `${hours}h ago`;
  } else {
    ago = `${Math.floor(hours / 24)}d ago`;
  }

 formatCentralTimeWithAgo(trade.time)
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);

  return `${ago} • ${formatted} CT`;
}
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function setStatus(text, bad = false) {
  els.statusText.textContent = text;
  els.statusText.className = bad ? 'neg' : 'pos';
}

function buildLists() {
  els.walletList.innerHTML = cfg.wallets.map(w => `<li><code>${esc(w.label)}</code> · ${esc(w.address)}</li>`).join('');
  els.marketList.innerHTML = cfg.markets.map(m => `<li><code>${esc(m)}</code></li>`).join('');
  els.refreshInterval.value = String(cfg.refreshMs || 15000);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchWalletSnapshot(wallet) {
  const positionsUrl = `https://data-api.polymarket.com/positions?user=${encodeURIComponent(wallet.address)}`;
  const tradesUrl = `https://data-api.polymarket.com/trades?user=${encodeURIComponent(wallet.address)}&limit=${encodeURIComponent(cfg.alerts.recentTradesPerWallet || 8)}`;
  const [positions, trades] = await Promise.all([
    fetchJson(positionsUrl).catch(() => []),
    fetchJson(tradesUrl).catch(() => [])
  ]);

  const openPositions = Array.isArray(positions) ? positions : [];
  const currentValue = openPositions.reduce((sum, p) => sum + Number(p.currentValue || 0), 0);
  const cashPnl = openPositions.reduce((sum, p) => sum + Number(p.cashPnl || 0), 0);
  const topPosition = [...openPositions].sort((a, b) => Number(b.currentValue || 0) - Number(a.currentValue || 0))[0];

  return {
    wallet,
    openPositions,
    currentValue,
    cashPnl,
    topPosition,
    trades: Array.isArray(trades) ? trades : []
  };
}

async function fetchMarketBySlug(slug) {
  const eventUrl = `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`;
  const data = await fetchJson(eventUrl);
  const event = Array.isArray(data) ? data[0] : data;
  const market = event?.markets?.[0] || event;
  const yes = Number(market?.lastTradePrice ?? market?.bestBid ?? market?.yesPrice ?? 0);
  const no = yes > 0 ? 1 - yes : Number(market?.noPrice ?? 0);
  const volume24 = Number(market?.volume24hr ?? market?.volume24Hr ?? market?.volume24h ?? market?.volumeNum ?? 0);
  const title = market?.question || event?.title || slug;
  return {
    slug,
    title,
    yes,
    no,
    volume24,
    raw: market || event || {}
  };
}

function renderWallets(wallets) {
  els.walletTable.innerHTML = wallets.map(({ wallet, openPositions, currentValue, cashPnl, topPosition }) => {
    const pnlClass = cashPnl >= 0 ? 'pos' : 'neg';
    return `
      <tr>
        <td><strong>${esc(wallet.label)}</strong><br><span class="muted"><code>${esc(wallet.address.slice(0, 10))}…</code></span></td>
        <td class="num">${openPositions.length}</td>
        <td class="num">${money(currentValue)}</td>
        <td class="num ${pnlClass}">${money(cashPnl)}</td>
        <td>${topPosition ? esc(topPosition.title || topPosition.slug || '—') : '<span class="muted">—</span>'}</td>
      </tr>`;
  }).join('') || `<tr><td colspan="5" class="muted">No wallet data loaded.</td></tr>`;
}

function renderTrades(wallets) {
  const rows = wallets
    .flatMap(({ wallet, trades }) => trades.map(t => ({ wallet: wallet.label, ...t })))
    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
    .slice(0, 30);

  els.tradeTable.innerHTML = rows.map(t => `
    <tr>
      <td>${t.timestamp ? timeAgo(Number(t.timestamp)) : '—'}</td>
      <td>${esc(t.wallet)}</td>
      <td>${esc(t.title || t.slug || '—')}</td>
      <td>${esc(t.side || '—')} ${t.outcome ? `<span class="muted">${esc(t.outcome)}</span>` : ''}</td>
      <td class="num">${num(t.price)}</td>
      <td class="num">${money(t.size)}</td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="muted">No recent trades loaded.</td></tr>`;
}

function renderMarkets(markets) {
  els.marketTable.innerHTML = markets.map(m => {
    const baseline = state.baselines.get(m.slug) ?? m.yes;
    if (!state.baselines.has(m.slug)) state.baselines.set(m.slug, m.yes);
    const movePct = baseline ? ((m.yes - baseline) / baseline) * 100 : 0;
    const signal = movePct >= cfg.alerts.marketMovePct ? ['good', `+${num(movePct,1)}% vs baseline`] : movePct <= -cfg.alerts.marketMovePct ? ['bad', `${num(movePct,1)}% vs baseline`] : ['warn', 'Watch'];
    return `
      <tr>
        <td><strong>${esc(m.title)}</strong><br><span class="muted"><code>${esc(m.slug)}</code></span></td>
        <td class="num">${num(m.yes)}</td>
        <td class="num">${num(m.no)}</td>
        <td class="num">${money(m.volume24)}</td>
        <td><span class="tag ${signal[0]}">${esc(signal[1])}</span></td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="5" class="muted">No market data loaded.</td></tr>`;
}

function buildAlerts(wallets, markets) {
  const alerts = [];
  wallets.forEach(w => {
    if (w.cashPnl >= (cfg.alerts.walletPnlSpike || 1000)) {
      alerts.push({
        level: 'good',
        title: `${w.wallet.label} PnL spike`,
        meta: `${w.openPositions.length} open positions`,
        body: `Cash PnL is ${money(w.cashPnl)}.`
      });
    }
    const recentTrade = w.trades?.[0];
    if (recentTrade) {
      alerts.push({
        level: 'warn',
        title: `${w.wallet.label} recent trade`,
        meta: recentTrade.timestamp ? new Date(Number(recentTrade.timestamp)).toLocaleString() : 'Recent',
        body: `${recentTrade.side || 'Trade'} ${recentTrade.outcome || ''} in ${recentTrade.title || recentTrade.slug || 'market'} at ${num(recentTrade.price)}.`
      });
    }
  });

  markets.forEach(m => {
    const baseline = state.baselines.get(m.slug) ?? m.yes;
    const movePct = baseline ? ((m.yes - baseline) / baseline) * 100 : 0;
    if (Math.abs(movePct) >= (cfg.alerts.marketMovePct || 10)) {
      alerts.push({
        level: movePct > 0 ? 'good' : 'bad',
        title: `${m.title} moved ${movePct > 0 ? 'up' : 'down'}`,
        meta: `${num(Math.abs(movePct), 1)}% vs session baseline`,
        body: `YES price is now ${num(m.yes)}.`
      });
    }
  });

  const deduped = alerts.slice(0, 18);
  state.lastAlerts = deduped;
  els.alerts.innerHTML = deduped.map(a => `
    <div class="alert ${a.level}">
      <div class="meta">${esc(a.meta)}</div>
      <div><strong>${esc(a.title)}</strong></div>
      <div>${esc(a.body)}</div>
    </div>
  `).join('') || '<div class="muted">No alerts yet.</div>';
}

function renderKpis(wallets, markets) {
  const openPositions = wallets.reduce((sum, w) => sum + w.openPositions.length, 0);
  const netPnl = wallets.reduce((sum, w) => sum + w.cashPnl, 0);
  els.kpiWallets.textContent = String(wallets.length);
  els.kpiPositions.textContent = String(openPositions);
  els.kpiPnl.textContent = money(netPnl);
  els.kpiMarkets.textContent = String(markets.length);
  els.kpiPnl.className = `value ${netPnl >= 0 ? 'pos' : 'neg'}`;
}

async function refresh() {
  setStatus('Refreshing…');
  try {
    const walletAddresses = cfg.wallets.map(w => w.address).join(',');
    const marketSlugs = cfg.markets.join(',');
    const url = `/api/snapshot?wallets=${encodeURIComponent(walletAddresses)}&markets=${encodeURIComponent(marketSlugs)}`;

    const snapshot = await fetchJson(url);

    const wallets = cfg.wallets.map(w => {
      const match = (snapshot.wallets || []).find(x => x.address.toLowerCase() === w.address.toLowerCase()) || {};
      const openPositions = Array.isArray(match.positions) ? match.positions : [];
      const currentValue = openPositions.reduce((sum, p) => sum + Number(p.currentValue || 0), 0);
      const cashPnl = openPositions.reduce((sum, p) => sum + Number(p.cashPnl || 0), 0);
      const topPosition = [...openPositions].sort((a, b) => Number(b.currentValue || 0) - Number(a.currentValue || 0))[0];

      return {
        wallet: w,
        openPositions,
        currentValue,
        cashPnl,
        topPosition,
        trades: Array.isArray(match.trades) ? match.trades : []
      };
    });

    const markets = Array.isArray(snapshot.markets) ? snapshot.markets : [];

    renderWallets(wallets);
    renderTrades(wallets);
    renderMarkets(markets);
    buildAlerts(wallets, markets);
    renderKpis(wallets, markets);
    els.lastUpdate.textContent = new Date().toLocaleString();
    setStatus('Live');
  } catch (err) {
    console.error(err);
    setStatus(`Update failed: ${err.message}`, true);
  }
}
function restartTimer() {
  if (state.intervalId) clearInterval(state.intervalId);
  const ms = Number(els.refreshInterval.value || cfg.refreshMs || 15000);
  cfg.refreshMs = ms;
  state.intervalId = setInterval(refresh, ms);
}

els.refreshNow.addEventListener('click', refresh);
els.refreshInterval.addEventListener('change', restartTimer);

buildLists();
restartTimer();
refresh();
