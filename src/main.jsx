import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx'; // <-- Removed .jsx extension

// This is the main entry point that renders the App component into the 'root' element
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
