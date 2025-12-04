// src/hooks/useBankrTrade.js — SDK-Free Version (Direct API)
import { useState } from 'react';
import { getEnv } from '../lib/env';

export const useBankrTrade = () => {
  const [loading, setLoading] = useState(false);
  const bankrKey = getEnv('BANKR_API_KEY');

  const copyEdgeViaBankr = async (market, size = 100) => {
    if (!bankrKey) {
      alert('Bankr API key missing — add REACT_APP_BANKR_API_KEY to Vercel env vars');
      return;
    }

    setLoading(true);
    try {
      const intent = `@bankrbot buy $${size} ${market.outcome} shares on "${market.question}" via PolyEdge signal. Max slippage 0.5%.`;

      const response = await fetch('https://api.bankr.bot/v1/execute', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bankrKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: intent,
          chain: 'base', // Polymarket's chain
          wallet: 'embedded', // Privy
          integrations: ['polymarket-clob']
        }),
      });

      if (!response.ok) throw new Error(`Bankr API error: ${response.statusText}`);

      const tx = await response.json();
      if (tx.hash) {
        alert(`Copied via Bankr! Tx: ${tx.hash}`);
        // Log to oracle
      }
    } catch (error) {
      console.error('Bankr execution failed:', error);
      alert('Fallback to manual copy — check console');
    } finally {
      setLoading(false);
    }
  };

  return { copyEdgeViaBankr, loading };
};
