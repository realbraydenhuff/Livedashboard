window.DASHBOARD_CONFIG = {
  refreshMs: 15000,
  wallets: [
    {
      label: 'JPMorgan101',
      address: '0xb6d6e99d3bfe055874a04279f659f009fd57be17'
    },
    {
      label: 'denizz',
      address: '0xbaa2bcb5439e985ce4ccf815b4700027d1b92c73'
    },
    {
      label: 'SecondWindCapital',
      address: '0x8c80d213c0cbad777d06ee3f58f6ca4bc03102c3'
    },
    {
      label: 'The Spirit of Ukraine>UMA',
      address: '0x0c0e270cf879583d6a0142fc817e05b768d0434e'
    }
  ],
  markets: [
    'us-recession-in-2026',
    'will-the-fed-decrease-interest-rates-by-25-bps-after-the-april-2026-meeting',
    'gpt-55-released-by-april-30',
    'strait-of-hormuz-traffic-returns-to-normal-by-april-30'
  ],
  alerts: {
    walletPnlSpike: 1000,
    marketMovePct: 10,
    recentTradesPerWallet: 8
  }
};
