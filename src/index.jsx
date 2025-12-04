import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import PolyEdgeScanner from './PolyEdgeScanner';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<PolyEdgeScanner />);
