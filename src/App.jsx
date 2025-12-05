import { PrivyProvider } from '@privy-io/react-auth';
import PolyEdgeScanner from './PolyEdgeScanner';

const privyAppId = process.env.REACT_APP_PRIVY_APP_ID;

const MissingPrivyConfig = () => (
  <div className="min-h-screen bg-[#0a0b14] text-white flex items-center justify-center">
    <div className="text-center p-8 bg-slate-900 rounded-2xl border border-purple-500/30">
      <h1 className="text-3xl font-bold mb-4">PolyEdge Scanner</h1>
      <p className="text-red-400 mb-4">Missing Privy App ID</p>
      <p className="text-sm text-gray-400">
        Add REACT_APP_PRIVY_APP_ID to your environment variables
      </p>
    </div>
  </div>
);

export default function App() {
  if (!privyAppId) {
    return <MissingPrivyConfig />;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
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
