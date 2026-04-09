module.exports = async function handler(req, res) {
  try {
    const wallets = (req.query.wallets || "").split(",").map(s => s.trim()).filter(Boolean);
    const markets = (req.query.markets || "").split(",").map(s => s.trim()).filter(Boolean);

    const fetchJson = async (url) => {
      const r = await fetch(url, {
        headers: { accept: "application/json" }
      });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status} for ${url}`);
      }
      return r.json();
    };

    const walletResults = await Promise.all(
      wallets.map(async (address) => {
        const [positions, trades] = await Promise.all([
          fetchJson(`https://data-api.polymarket.com/positions?user=${encodeURIComponent(address)}`).catch(() => []),
          fetchJson(`https://data-api.polymarket.com/trades?user=${encodeURIComponent(address)}&limit=8`).catch(() => [])
        ]);

        return {
          address,
          positions: Array.isArray(positions) ? positions : [],
          trades: Array.isArray(trades) ? trades : []
        };
      })
    );

    const marketResults = await Promise.all(
      markets.map(async (slug) => {
        const data = await fetchJson(`https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`);
        const event = Array.isArray(data) ? data[0] : data;
        const market = event?.markets?.[0] || event || {};
        return {
          slug,
          title: market.question || event?.title || slug,
          yes: Number(market.lastTradePrice ?? market.bestBid ?? market.yesPrice ?? 0),
          no: Number(market.noPrice ?? 0),
          volume24: Number(market.volume24hr ?? market.volume24Hr ?? market.volume24h ?? market.volumeNum ?? 0),
          raw: market
        };
      })
    );

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      wallets: walletResults,
      markets: marketResults,
      fetchedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: String(err.message || err)
    });
  }
};
