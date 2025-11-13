import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Game from './pages/Game';
import { useSDK } from './hooks/useSDK';

function App() {
  const { algoStakeXClient } = useSDK();
  if (!algoStakeXClient) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading SDK...</h2>
        <p>Please wait while we initialize the AlgoStakeX SDK</p>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
          Make sure the SDK is built and loaded from dist/algostakex.js
        </p>
      </div>
    );
  }

  const RequireAuth = ({ children }) => {
    if (!algoStakeXClient?.account) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={algoStakeXClient?.account ? <Navigate to="/game" replace /> : <Home />} />
          <Route path="game" element={<RequireAuth><Game /></RequireAuth>} />
          <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

