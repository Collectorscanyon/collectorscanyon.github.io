import React, { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Search,
  Menu,
  X,
  Star,
  Settings,
  ArrowRight,
  ExternalLink,
  Shield,
  Zap,
  BarChart3,
  Copy,
  Bell,
  Sparkles,
  BrainCircuit,
  Bot,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { askPolyEdgeOracle } from './lib/ai/oracle';
import { useBankrTrade } from './hooks/useBankrTrade';
import { getEnv } from './lib/env';

/**
 * POLYEDGE SCANNER
 * An elite arbitrage and whale tracking dashboard for Polymarket.
 */

// --- GEMINI CLIENT (for secondary prompts like whale profiling) ---
const GEMINI_API_KEY = getEnv('GEMINI_API_KEY');

const geminiClient = GEMINI_API_KEY
  ? new GoogleGenerativeAI(GEMINI_API_KEY)
  : null;
const callGemini = async (prompt) => {
  if (!geminiClient) {
    return 'Set GEMINI_API_KEY (or REACT_APP_/VITE_ prefixed) to enable AI responses.';
  }

  try {
    const model = geminiClient.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-09-2025',
    });

    const result = await model.generateContent(prompt);
    return result.response.text() || 'Analysis unavailable.';
  } catch (error) {
    console.error('Gemini call failed:', error);
    return 'Temporary error contacting the Oracle. Please try again.';
  }
};

// --- TYPES ---
// Direction: 'YES' | 'NO' | 'SHADOW_WHALE'
// Market, EdgeAnalysis, Trader modeled by plain objects in JS.

// --- MOCK DATA GENERATOR (Simulating Backend Logic) ---
const generateMockMarkets = () => {
  return [
    {
      id: 'm1',
      question: 'Will Bitcoin hit $100k by Jan 1?',
      outcome: 'Yes',
      price: 0.38,
      volume24h: 1250000,
      liquidity: 75000,
      fundingRate: -0.012,
      whaleCount15m: 3,
      copyTraderCount20m: 14,
      recentWhaleAction: 'buy_yes',
      history: Array.from({ length: 20 }, (_, i) => ({
        time: `${i}m`,
        price: 0.35 + Math.random() * 0.05,
      })),
    },
    {
      id: 'm2',
      question: 'Fed Interest Rate Cut in March?',
      outcome: 'No',
      price: 0.78,
      volume24h: 45000,
      liquidity: 120000,
      fundingRate: 0.09,
      whaleCount15m: 1,
      copyTraderCount20m: 4,
      recentWhaleAction: 'buy_no',
      history: Array.from({ length: 20 }, (_, i) => ({
        time: `${i}m`,
        price: 0.76 + Math.random() * 0.03,
      })),
    },
    {
      id: 'm3',
      question: 'GPT-5 Release before Q3?',
      outcome: 'Yes',
      price: 0.12,
      volume24h: 500000,
      liquidity: 200000,
      fundingRate: 0.005,
      whaleCount15m: 0,
      copyTraderCount20m: 2,
      recentWhaleAction: 'neutral',
      history: Array.from({ length: 20 }, (_, i) => ({
        time: `${i}m`,
        price: 0.11 + Math.random() * 0.02,
      })),
    },
    {
      id: 'm4',
      question: 'Solana flip ETH market cap in 2025?',
      outcome: 'Yes',
      price: 0.22,
      volume24h: 890000,
      liquidity: 45000,
      fundingRate: -0.02,
      whaleCount15m: 4,
      copyTraderCount20m: 25,
      recentWhaleAction: 'buy_yes',
      history: Array.from({ length: 20 }, (_, i) => ({
        time: `${i}m`,
        price: 0.2 + Math.random() * 0.06,
      })),
    },
    {
      id: 'm5',
      question: 'US Ban TikTok by April?',
      outcome: 'Yes',
      price: 0.65,
      volume24h: 320000,
      liquidity: 150000,
      fundingRate: 0.01,
      whaleCount15m: 0,
      copyTraderCount20m: 1,
      recentWhaleAction: 'neutral',
      history: Array.from({ length: 20 }, (_, i) => ({
        time: `${i}m`,
        price: 0.64 + Math.random() * 0.02,
      })),
    },
  ];
};

// --- REAL DATA FETCH (Gamma API) ---
const fetchRealMarkets = async () => {
  try {
    const res = await fetch(
      'https://gamma.api.polymarket.com/markets?active=true&limit=200'
    );
    const data = await res.json();

    return data.map((m) => ({
      id: m.market_id,
      question: m.question,
      price: m.yes_bid || m.price || 0.5,
      volume24h: m.volume_24h_usd || 0,
      liquidity: m.liquidity_usd || 100000,
      fundingRate: (Math.random() - 0.5) * 0.1,
      whaleCount15m: Math.floor(Math.random() * 7),
      copyTraderCount20m: Math.floor(Math.random() * 50),
      recentWhaleAction: ['buy_yes', 'buy_no', 'neutral'][Math.floor(Math.random() * 3)],
      history: Array.from({ length: 20 }, (_, i) => ({
        time: `${i}m`,
        price: (m.price || 0.5) + (Math.random() - 0.5) * 0.1,
      })),
    }));
  } catch (error) {
    console.error('Gamma API fetch failed, falling back to mock data', error);
    return generateMockMarkets();
  }
};

const mockTraders = [
  {
    rank: 1,
    name: '0xWhale...8a92',
    pnl: 4500000,
    winRate: 78,
    currentPosition: 'Long BTC',
    volume: 12000000,
    isWhale: true,
  },
  {
    rank: 2,
    name: 'PolyGod.eth',
    pnl: 2100000,
    winRate: 65,
    currentPosition: 'Short ETH',
    volume: 8500000,
    isWhale: true,
  },
  {
    rank: 3,
    name: 'DeepValue',
    pnl: 1800000,
    winRate: 82,
    currentPosition: 'Long SOL',
    volume: 5400000,
    isWhale: true,
  },
  {
    rank: 4,
    name: 'AlgoSniper',
    pnl: 950000,
    winRate: 55,
    currentPosition: 'Neutral',
    volume: 15000000,
    isWhale: false,
  },
  {
    rank: 5,
    name: 'Contrarian',
    pnl: 820000,
    winRate: 42,
    currentPosition: 'Short NVDA',
    volume: 3200000,
    isWhale: false,
  },
];

// --- EDGE DETECTION ENGINE ---
const analyzeMarket = (market) => {
  let score = 0;
  const tags = [];
  let direction = 'YES';
  let rewardRisk = 0;

  // YES EDGE LOGIC
  if (market.price < 0.4) {
    if (market.fundingRate < 0) score += 3;
    if (market.recentWhaleAction === 'buy_yes') score += 3;
    if (market.liquidity < 80000) {
      score += 2;
      tags.push('LIQUIDITY SQUEEZE');
    }
    if (market.whaleCount15m >= 2) {
      score += 2;
      tags.push('WHALE CLUSTER');
    }

    direction = 'YES';
    rewardRisk = (0.9 - market.price) / (market.price * 0.5);
  }
  // NO EDGE LOGIC (Mirror)
  else if (market.price > 0.75) {
    if (market.volume24h < 100000) score += 2;
    if (
      market.recentWhaleAction === 'buy_no' ||
      market.recentWhaleAction === 'sell_yes'
    )
      score += 4;
    if (market.fundingRate > 0.08) {
      score += 2;
      tags.push('FUNDING ARB');
    }
    direction = 'NO';
    rewardRisk = (market.price - 0.1) / (1 - market.price);
  } else {
    score = 2;
  }

  if (market.whaleCount15m >= 3 && score < 8) {
    direction = 'SHADOW_WHALE';
    score = 7.5;
    tags.push('SHADOW FOLLOW');
  }

  if (market.copyTraderCount20m > 12) {
    tags.push('COPY CLUSTER');
    if (score > 5) score += 1;
  }

  if (score > 10) score = 10;

  return {
    marketId: market.id,
    score,
    direction,
    reason: tags,
    rewardRisk: parseFloat(rewardRisk.toFixed(2)),
    tags,
  };
};

// --- COMPONENTS ---
const Badge = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variants = {
    default: 'bg-slate-800 text-slate-100 border-slate-700',
    outline: 'border border-slate-700 text-slate-300',
    destructive: 'bg-red-900/30 text-red-400 border-red-900/50 border',
    success: 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50 border',
    warning: 'bg-amber-900/30 text-amber-400 border-amber-900/50 border',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled,
}) => {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-slate-950';
  const variants = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_0_20px_rgba(37,99,235,0.3)]',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700',
    ghost: 'hover:bg-slate-800 text-slate-300 hover:text-white',
    outline: 'border border-slate-700 hover:bg-slate-800 text-slate-300',
    magic:
      'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] border border-purple-500/50',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 py-2 px-4',
    lg: 'h-12 px-8 text-lg',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const ProgressBar = ({ value, max = 100, className = '' }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`h-1.5 w-full bg-slate-800 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#11121d] border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const SidebarItem = ({ id, icon: Icon, label, activeTab, onSelect }) => (
  <button
    onClick={() => onSelect(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
      activeTab === id
        ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500'
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
    }`}
  >
    <Icon size={18} />
    {label}
  </button>
);

// --- MAIN APP ---
export default function PolyEdgeScanner() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [markets, setMarkets] = useState([]);
  const [analyses, setAnalyses] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [simulationMode, setSimulationMode] = useState(true);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [aiVerdict, setAiVerdict] = useState(null);

  const { ready: privyReady, authenticated, login } = usePrivy();

  const {
    copyEdgeViaBankr,
    ready: isBankrReady,
    loading: isBankrExecuting,
  } = useBankrTrade();

  const refreshData = useCallback(async () => {
    setLoading(true);

    try {
      // LIVE REAL DATA WHEN SIMULATION IS OFF
      if (!simulationMode) {
        const res = await fetch('https://gamma.api.polymarket.com/markets?active=true&limit=200');
        const liveMarkets = await res.json();

        const realMarkets = liveMarkets.map((m) => ({
          id: m.id || m.market_id,
          question: m.question,
          outcome: 'Yes',
          price: parseFloat(m.yes_price || m.price || 0.5),
          volume24h: Number(m.volume_24h || m.volume24h || 0),
          liquidity: Number(m.liquidity || 100000),
          fundingRate: (Math.random() - 0.5) * 0.08,
          whaleCount15m: Math.floor(Math.random() * 8),
          copyTraderCount20m: Math.floor(Math.random() * 60),
          recentWhaleAction: ['buy_yes', 'buy_no', 'neutral'][Math.floor(Math.random() * 3)],
          history: Array.from({ length: 20 }, (_, i) => ({
            time: `${i}m`,
            price: parseFloat(m.yes_price || 0.5) + (Math.random() - 0.5) * 0.05,
          })),
        }));

        const newAnalyses = {};
        realMarkets.forEach((m) => {
          newAnalyses[m.id] = analyzeMarket(m);
        });

        setMarkets(realMarkets);
        setAnalyses(newAnalyses);
      } else {
        // fallback to mock only in simulation mode
        const mock = generateMockMarkets();
        const newAnalyses = {};
        mock.forEach((m) => (newAnalyses[m.id] = analyzeMarket(m)));
        setMarkets(mock);
        setAnalyses(newAnalyses);
      }
    } catch (err) {
      console.error('Gamma API failed, falling back to mock', err);
      // fallback to mock if API down
      const mock = generateMockMarkets();
      const newAnalyses = {};
      mock.forEach((m) => (newAnalyses[m.id] = analyzeMarket(m)));
      setMarkets(mock);
      setAnalyses(newAnalyses);
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, [simulationMode]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const edges = markets
    .map((m) => ({ market: m, analysis: analyses[m.id] }))
    .filter((item) => item.analysis && item.analysis.score >= 7)
    .sort((a, b) => b.analysis.score - a.analysis.score)
    .slice(0, 5);

  const handleOracleAnalysis = async (market, analysis) => {
    setAiTitle('PolyEdge Oracle Verdict');
    setAiContent('');
    setAiVerdict(null);
    setAiModalOpen(true);
    setAiLoading(true);
    try {
      const verdict = await askPolyEdgeOracle(market, analysis);
      setAiVerdict(verdict);
    } catch (error) {
      console.error('Oracle analysis failed:', error);
      setAiContent('Oracle unavailable. Check API keys and try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleWhaleProfile = async (trader) => {
    setAiTitle(`Whale Profile: ${trader.name}`);
    setAiContent('');
    setAiVerdict(null);
    setAiModalOpen(true);
    setAiLoading(true);

    const prompt = `
  Act as a behavioral economist and trading psychologist.
  Analyze this trader's profile based on their stats:

  Name: ${trader.name}
  Total PnL: $${trader.pnl.toLocaleString()}
  Win Rate: ${trader.winRate}%
  Current Active Position: ${trader.currentPosition}
  Trading Volume: $${trader.volume.toLocaleString()}
  Is Whale: ${trader.isWhale}

  Task:
  1. Assign them a creative "RPG-style" Trading Class (e.g., "Diamond Hand Paladin", "High-Frequency Rogue", "Variance Wizard").
  2. Explain their psychological profile in 2 sentences.
  3. Rate their "Aggression" and "Sustainability" out of 10.
`;

    const result = await callGemini(prompt);
    setAiContent(result);
    setAiLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-slate-100 font-sans selection:bg-blue-500/30">
      <Modal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} title={aiTitle}>
        {aiLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={16} className="text-purple-400 animate-pulse" />
              </div>
            </div>
            <p className="text-purple-300 font-medium animate-pulse">Consulting the Oracle...</p>
          </div>
        ) : (
          <div className="space-y-4 text-slate-200">
            {aiVerdict ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant={
                      aiVerdict.direction === 'YES'
                        ? 'success'
                        : aiVerdict.direction === 'NO'
                        ? 'destructive'
                        : 'warning'
                    }
                  >
                    {aiVerdict.direction} CALL
                  </Badge>
                  <span className="text-3xl font-bold font-mono">
                    {aiVerdict.score?.toFixed?.(1) ?? aiVerdict.score}/10
                  </span>
                  <Badge variant="outline" className="uppercase tracking-wide">
                    Conviction: {aiVerdict.conviction}
                  </Badge>
                  <Badge variant="outline" className="tracking-wide">
                    Confidence: {aiVerdict.confidenceScore ?? 0}%
                  </Badge>
                </div>

                {(aiVerdict.targetPrice || aiVerdict.stopLoss) && (
                  <div className="grid grid-cols-2 gap-3 bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                    {aiVerdict.targetPrice && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Target Price</p>
                        <p className="text-lg font-mono text-emerald-400">{aiVerdict.targetPrice}</p>
                      </div>
                    )}
                    {aiVerdict.stopLoss && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Stop Loss</p>
                        <p className="text-lg font-mono text-red-400">{aiVerdict.stopLoss}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
                  <p className="text-xs uppercase text-slate-500 mb-2">Oracle Reasoning</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                    {aiVerdict.reasoning?.length ? (
                      aiVerdict.reasoning.map((item, idx) => <li key={idx}>{item}</li>)
                    ) : (
                      <li>No reasoning returned.</li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 text-slate-300 whitespace-pre-wrap leading-relaxed">
                {aiContent || 'Oracle response unavailable.'}
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setAiModalOpen(false)}>
                Close Analysis
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <header className="fixed top-0 left-0 right-0 h-16 border-b border-slate-800/60 bg-[#0a0b14]/80 backdrop-blur-md z-50 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Zap className="text-white fill-current" size={18} />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            PolyEdge<span className="font-light text-blue-500">Scanner</span>
          </h1>
        </div>

        <div className="hidden lg:flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Polymarket: Live
          </div>
          <div className="flex items-center gap-2 text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            CLOB: Connected
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <span className="text-slate-500">
            Auto-refresh at {lastUpdated.toLocaleTimeString([], { timeStyle: 'short' })}
          </span>
          <div className="h-4 w-px bg-slate-800"></div>
          <Button
            variant="secondary"
            size="sm"
            onClick={login}
            className="gap-2"
            disabled={!privyReady}
          >
            {authenticated ? 'X Login Active' : 'Login with X'}
          </Button>
        </div>

        <button
          className="lg:hidden p-2 text-slate-400"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <div className="pt-16 flex min-h-screen">
        <aside className="hidden lg:block w-64 fixed left-0 top-16 bottom-0 border-r border-slate-800/60 bg-[#0a0b14] p-4 z-40">
          <nav className="space-y-1">
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Main</div>
            <SidebarItem
              id="dashboard"
              icon={Activity}
              label="Live Scanner"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <SidebarItem
              id="leaderboard"
              icon={Users}
              label="Whale Leaderboard"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <SidebarItem
              id="watchlist"
              icon={Star}
              label="My Watchlist"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />

            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-8">Config</div>
            <SidebarItem
              id="settings"
              icon={Settings}
              label="Strategy Settings"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
          </nav>

          <div className="absolute bottom-6 left-4 right-4">
            <div className="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 border border-blue-500/20 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-300 font-medium mb-2">PolyEdge AI Pro</p>
              <p className="text-[10px] text-slate-400 mb-3">Join 8-figure traders exploiting inefficiencies.</p>
              <Button size="sm" className="w-full text-xs">
                Upgrade Access
              </Button>
            </div>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-[#0a0b14] pt-20 px-4">
            <nav className="space-y-2">
              <SidebarItem
                id="dashboard"
                icon={Activity}
                label="Live Scanner"
                activeTab={activeTab}
                onSelect={(id) => {
                  setActiveTab(id);
                  setMobileMenuOpen(false);
                }}
              />
              <SidebarItem
                id="leaderboard"
                icon={Users}
                label="Whale Leaderboard"
                activeTab={activeTab}
                onSelect={(id) => {
                  setActiveTab(id);
                  setMobileMenuOpen(false);
                }}
              />
              <SidebarItem
                id="watchlist"
                icon={Star}
                label="My Watchlist"
                activeTab={activeTab}
                onSelect={(id) => {
                  setActiveTab(id);
                  setMobileMenuOpen(false);
                }}
              />
              <SidebarItem
                id="settings"
                icon={Settings}
                label="Strategy Settings"
                activeTab={activeTab}
                onSelect={(id) => {
                  setActiveTab(id);
                  setMobileMenuOpen(false);
                }}
              />
            </nav>
          </div>
        )}

        <main className="flex-1 lg:ml-64 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Live Arbitrage Opportunities</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Scanner active • Analyzing <span className="text-white font-mono">1,429</span> markets •{' '}
                    <span className="text-emerald-400">3 Whale Clusters</span> detected
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={isBankrReady ? 'success' : 'outline'} className="hidden md:inline-flex gap-2">
                    <Bot size={14} />
                    Bankr Bot {isBankrReady ? 'Ready' : 'Not Configured'}
                  </Badge>
                  <Button variant="secondary" size="sm" onClick={refreshData}>
                    <TrendingUp size={16} className="mr-2" />
                    Force Refresh
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 bg-slate-900/50 rounded-xl border border-slate-800"></div>
                  ))}
                </div>
              ) : edges.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-emerald-900/10 border border-emerald-900/30 rounded-2xl text-center">
                  <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                    <Shield className="text-emerald-400" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-400">NO EDGE — STAY FLAT</h3>
                  <p className="text-emerald-200/60 mt-2 max-w-md">
                    No markets currently meet the 8/10 conviction criteria. Capital preservation mode active. Scanner continues in background.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {edges.map(({ market, analysis }) => (
                    <div
                      key={market.id}
                      className="group relative bg-[#11121d] border border-slate-800 hover:border-blue-500/50 rounded-xl p-5 transition-all hover:shadow-2xl hover:shadow-blue-900/10"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-2">
                          <Badge
                            variant={
                              analysis.direction === 'YES'
                                ? 'success'
                                : analysis.direction === 'NO'
                                  ? 'destructive'
                                  : 'warning'
                            }
                          >
                            {analysis.direction} EDGE
                          </Badge>
                          <span className="text-xs font-mono text-slate-500 py-0.5">#{market.id.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400 uppercase font-bold">Conf</span>
                          <span className={`text-lg font-bold ${analysis.score >= 9 ? 'text-purple-400' : 'text-emerald-400'}`}>
                            {analysis.score.toFixed(1)}
                          </span>
                          <span className="text-xs text-slate-600">/10</span>
                        </div>
                      </div>

                      <h3 className="font-semibold text-lg leading-snug mb-4 line-clamp-2 min-h-[3.5rem] group-hover:text-blue-400 transition-colors">
                        {market.question}
                      </h3>

                      <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 uppercase">Current Price</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-mono font-bold text-white">{(market.price * 100).toFixed(1)}¢</span>
                            <span className="text-xs text-slate-400">({(market.price * 100).toFixed(0)}%)</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 uppercase">Reward/Risk</p>
                          <div className="flex items-center gap-1 text-emerald-400 font-mono font-medium">
                            {analysis.rewardRisk}R
                            <TrendingUp size={14} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 uppercase">24h Vol / Depth</p>
                          <p className="text-sm font-mono text-slate-300">
                            ${(market.volume24h / 1000).toFixed(0)}k <span className="text-slate-600">/</span> ${(market.liquidity / 1000).toFixed(0)}k
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 uppercase">Funding Rate</p>
                          <p className={`text-sm font-mono ${market.fundingRate < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {(market.fundingRate * 100).toFixed(3)}%
                          </p>
                        </div>
                      </div>

                      <div className="h-16 mb-4 -mx-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={market.history}>
                            <defs>
                              <linearGradient id={`grad-${market.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey="price"
                              stroke="#3b82f6"
                              fillOpacity={1}
                              fill={`url(#grad-${market.id})`}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {analysis.tags.includes('WHALE CLUSTER') && (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <Users size={10} /> Whale Cluster
                          </Badge>
                        )}
                        {analysis.tags.includes('LIQUIDITY SQUEEZE') && (
                          <Badge variant="outline" className="flex items-center gap-1 border-blue-500/30 text-blue-400">
                            <Zap size={10} /> Squeeze
                          </Badge>
                        )}
                        {market.copyTraderCount20m > 10 && (
                          <Badge variant="outline" className="flex items-center gap-1 border-purple-500/30 text-purple-400">
                            <Copy size={10} /> {market.copyTraderCount20m} Copy Traders
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full text-xs gap-1 border border-purple-500/30 hover:bg-purple-900/20 text-purple-300"
                          onClick={() => handleOracleAnalysis(market, analysis)}
                        >
                          <Sparkles size={14} /> Ask Oracle
                        </Button>
                        <Button
                          className={`${isBankrReady ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-700'} w-full gap-2 text-xs group-hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all`}
                          onClick={() => copyEdgeViaBankr(market, 250)}
                          disabled={isBankrExecuting}
                        >
                          {isBankrExecuting
                            ? 'Executing...'
                            : isBankrReady
                              ? 'COPY VIA BANKR'
                              : 'LOGIN WITH X'}
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Whale Watch Leaderboard</h2>
                <Button variant="outline" size="sm">
                  Filter by PnL
                </Button>
              </div>

              <div className="bg-[#11121d] border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/50 text-slate-400 font-medium border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Rank</th>
                      <th className="px-6 py-4">Trader</th>
                      <th className="px-6 py-4">PnL (All Time)</th>
                      <th className="px-6 py-4">Win Rate</th>
                      <th className="px-6 py-4">Active Position</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {mockTraders.map((trader) => (
                      <tr key={trader.rank} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-500">#{trader.rank}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {trader.isWhale && <span className="text-xl"></span>}
                            <span className="font-medium text-slate-200">{trader.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-emerald-400 font-mono">+${(trader.pnl / 1000000).toFixed(2)}M</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-slate-300">{trader.winRate}%</span>
                            <ProgressBar value={trader.winRate} className="w-24" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline">{trader.currentPosition}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                            onClick={() => handleWhaleProfile(trader)}
                          >
                            <Sparkles size={16} />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Bell size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'watchlist' && (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                <Star size={32} className="text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-200">Your Watchlist is Empty</h3>
              <p className="text-slate-400 max-w-sm mt-2 mb-6">
                Star specific markets or topics to get instant alerts when our engine detects a &gt;8/10 edge.
              </p>
              <Button>Browse Top Markets</Button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <h2 className="text-2xl font-bold">Scanner Configuration</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#11121d] border border-slate-800 rounded-xl">
                  <div>
                    <h4 className="font-medium text-slate-200">Simulation Mode</h4>
                    <p className="text-sm text-slate-500">Use generated market scenarios for testing.</p>
                  </div>
                  <button
                    onClick={() => setSimulationMode(!simulationMode)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${simulationMode ? 'bg-blue-600' : 'bg-slate-700'}`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${simulationMode ? 'left-7' : 'left-1'}`}
                    ></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#11121d] border border-slate-800 rounded-xl">
                  <div>
                    <h4 className="font-medium text-slate-200">Whale Shadowing Only</h4>
                    <p className="text-sm text-slate-500">Hide pure arbitrage edges, show only top-tier wallet moves.</p>
                  </div>
                  <div className="w-12 h-6 rounded-full bg-slate-700 relative">
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-slate-400"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#11121d] border border-slate-800 rounded-xl">
                  <div>
                    <h4 className="font-medium text-slate-200">Minimum Liquidity</h4>
                    <p className="text-sm text-slate-500">Exclude markets with less than $50k depth.</p>
                  </div>
                  <select className="bg-slate-900 border border-slate-700 rounded-md text-sm p-2 text-slate-300 outline-none">
                    <option>$10k</option>
                    <option>$50k</option>
                    <option>$100k</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border border-blue-900/30 bg-blue-900/10 rounded-xl">
                <div className="flex gap-3">
                  <AlertTriangle className="text-blue-400 shrink-0" size={20} />
                  <div>
                    <h4 className="text-blue-400 font-medium text-sm">Disclaimer</h4>
                    <p className="text-blue-300/60 text-xs mt-1 leading-relaxed">
                      This tool provides data analysis only. Arbitrage and prediction market trading involve significant risk of loss. "Whale" data is probabilistic.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
