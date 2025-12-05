// src/hooks/useBankrTrade.js — FINAL VERSION
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState } from 'react';

export const useBankrTrade = () => {
  const { ready: privyReady, authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);

  const copyEdgeViaBankr = async (market, size = 250) => {
    if (!privyReady || !authenticated) {
      await login();
      return;
    }

    const wallet = wallets.find((w) => w.chainId === 'base:8453');
    if (!wallet) {
      alert('Connect Base wallet first (Privy will auto-create one)');
      return;
    }

    setLoading(true);
    try {
      const intent = `@bankrbot buy $${size} ${market.outcome} shares on "${market.question}" via PolyEdge signal. Max slippage 0.5%.`;

      const res = await fetch('https://api.bankr.bot/v1/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wallet.address}`,
          'X-Bankr-Wallet': wallet.address,
          'X-Privy-User': user?.id || '',
        },
        body: JSON.stringify({
          prompt: intent,
          wallet: wallet.address,
          chain: 'base',
          integrations: ['polymarket-clob'],
        }),
      });

      const data = await res.json();
      if (data.success || data.hash) {
        alert(`Copied! Tx: ${data.hash || 'pending'}`);
      } else {
        alert(`Bankr error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Bankr execution failed');
    } finally {
      setLoading(false);
    }
  };

  return { copyEdgeViaBankr, loading, ready: privyReady, authenticated };
};
