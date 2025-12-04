import { useBankr } from '@bankr/sdk';
import { useCallback, useMemo, useState } from 'react';

/**
 * Lightweight Bankr Bot execution hook
 * - Wraps Bankr SDK executeTrade for PolyEdge copy-trade intents
 * - Falls back to a descriptive error when API key or SDK plumbing is missing
 */
export const useBankrTrade = ({ apiKey }) => {
  const bankr = useBankr(apiKey || '');
  const [isExecuting, setIsExecuting] = useState(false);

  const isBankrReady = useMemo(
    () => Boolean(apiKey && bankr && typeof bankr.executeTrade === 'function'),
    [apiKey, bankr]
  );

  const copyEdgeViaBankr = useCallback(
    async (market, analysis, size = 500) => {
      if (!isBankrReady) {
        throw new Error('Bankr SDK not ready — add BANKR_API_KEY or check SDK wiring.');
      }

      const prompt = `@bankrbot buy $${size} ${
        analysis.direction === 'YES' ? 'YES' : 'NO'
      } shares on "${market.question}" via PolyEdge signal. Max slippage 0.5%.`;

      setIsExecuting(true);
      try {
        const tx = await bankr.executeTrade({
          intent: prompt,
          wallet: 'embedded',
          chain: 'base',
          integrations: ['polymarket-clob', '0x-swap'],
        });
        return tx;
      } finally {
        setIsExecuting(false);
      }
    },
    [bankr, isBankrReady]
  );

  return { copyEdgeViaBankr, isBankrReady, isExecuting };
};
