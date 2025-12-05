import { PrivyProvider } from '@privy-io/react-auth';
import PolyEdgeScanner from './PolyEdgeScanner';

const privyAppId = process.env.REACT_APP_PRIVY_APP_ID;

const MissingPrivyConfig = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    background: '#0f172a',
    color: '#e2e8f0',
    padding: '24px',
    textAlign: 'center',
  }}>
    <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Privy app ID missing</h1>
    <p style={{ maxWidth: '640px', lineHeight: 1.5 }}>
      Set <code>REACT_APP_PRIVY_APP_ID</code> in your environment variables (Vercel → Settings → Environment Variables)
      to enable X login, embedded wallets, and Bankr copy trading. The rest of the dashboard stays client-side and will
      render once the app ID is available.
    </p>
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
