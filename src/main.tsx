import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/surfaces.css';
import './styles/effects.css';
import './styles/variants.css';
import './styles/templates.css';
import './styles/edge.css';
import './styles/scale.css';
import './styles/gate.css';
import { App } from './App';
import { AuthGate } from './features/cloud-ui';
import { applySettings } from './data/settings';

applySettings();
createRoot(document.getElementById('root')!).render(<StrictMode><AuthGate><App /></AuthGate></StrictMode>);
