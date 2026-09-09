import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { installChrome } from './ui/chrome.js';
import { installTapSounds } from './ui/sfx.js';

installChrome();
installTapSounds();

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
