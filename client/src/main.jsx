import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Splash from './components/Splash.jsx'

function Root() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <App />
      {showSplash && <Splash duration={5000} onFinish={() => setShowSplash(false)} />}
    </>
  );
}

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
} else {
  console.error('Root element not found');
}

