// src/hooks/useBankrTrade.js — SDK-Free Version (Direct API)
import { useState } from 'react';
import { getEnv } from '../lib/env';

export const useBankrTrade = ({ apiKey } = {}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const bankrKey = apiKey || getEnv('BANKR_API_KEY');
  const isBankrReady = Boolean(bankrKey);

  const copyEdgeViaBankr = async (market, analysis, size = 100) => {
    if (!isBankrReady) {
      throw new Error('Bankr API key missing — add REACT_APP_BANKR_API_KEY to Vercel env vars');
    }

    setIsExecuting(true);
    try {
      const intent = `@bankrbot buy $${size} ${market.outcome || 'YES'} shares on "${market.question}" via PolyEdge signal (edge score ${analysis?.score ?? 'N/A'}). Max slippage 0.5%.`;

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
        console.info('Bankr Bot executed copy trade', { hash: tx.hash });
      }
      return tx;
    } finally {
      setIsExecuting(false);
    }
  };

  return { copyEdgeViaBankr, isBankrReady, isExecuting };
};
