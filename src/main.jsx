import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../SampleSizeCalculator.jsx';
import ToolSwitcher from './ToolSwitcher.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToolSwitcher active="c3" />
    <App />
  </React.StrictMode>
);
