import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './i18n/index.js';
import './styles/index.css';
import './styles/animations.css';
import './styles/layout.css';
import './styles/components.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
