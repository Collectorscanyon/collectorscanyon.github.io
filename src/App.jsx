import { PrivyProvider } from '@privy-io/react-auth';
import PolyEdgeScanner from './PolyEdgeScanner';

export default function App() {
  const appId = import.meta.env.VITE_PRIVY_APP_ID || process.env.REACT_APP_PRIVY_APP_ID;

  const MissingPrivyConfig = () => (
    <div className="min-h-screen bg-[#0a0b14] text-white flex items-center justify-center">
      <div className="text-center p-8 bg-slate-900 rounded-2xl border border-purple-500/30 max-w-xl">
        <h1 className="text-2xl font-bold mb-3">Privy app ID missing</h1>
        <p className="text-sm text-gray-300 mb-4">
          Set <code className="bg-slate-800 px-1 py-0.5 rounded">REACT_APP_PRIVY_APP_ID</code> in your environment variables (Vercel → Settings → Environment Variables)
          to enable X login, embedded wallets, and Bankr copy trading. The rest of the dashboard stays client-side and will render once the app ID is available.
        </p>
        <p className="text-xs text-gray-400">Add REACT_APP_PRIVY_APP_ID to your environment variables to enable these features.</p>
      </div>
    </div>
  );

  if (!appId) return <MissingPrivyConfig />;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['twitter', 'wallet'],
        embeddedWallets: { createOnLogin: true },
        appearance: { theme: 'dark' },
      }}
    >
      <PolyEdgeScanner />
    </PrivyProvider>
  );
}
