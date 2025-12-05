import { PrivyProvider } from '@privy-io/react-auth';
import PolyEdgeScanner from './PolyEdgeScanner';

export default function App() {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || process.env.REACT_APP_PRIVY_APP_ID}
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
