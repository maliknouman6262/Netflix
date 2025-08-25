import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './style.css'; // style.css ko yahan import kiya gaya hai

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
