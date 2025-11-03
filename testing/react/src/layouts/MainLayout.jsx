import { Outlet, Link } from "react-router-dom";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { formatWalletAddress, getRandomAvatar } from "../utils";
import { useState, useCallback } from "react";

function MainLayout() {
  const { algoStakeXClient } = useSDK();
  const [, forceUpdate] = useState({});

  const refreshHeader = useCallback(() => {
    forceUpdate({});
  }, []);

  useSDKEvents({
    onWalletConnect: refreshHeader,
    onWalletDisconnect: refreshHeader,
  });

  return (
    <>
      <header>
        <div className="container header-content">
          <div className="logo">
            <h1>🎮 AlgoStakeX Game Platform</h1>
          </div>
          {algoStakeXClient?.account && (
            <div className="profile-section">
              <div className="wallet-info">
                <span>{formatWalletAddress(algoStakeXClient.account)}</span>
              </div>
              <div className="profile-avatar">
                <img src={getRandomAvatar()} alt="Profile" />
              </div>
            </div>
          )}
        </div>
      </header>

      <nav>
        <div className="container">
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/feature">Premium Features</Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer>
        <div className="container footer-content">
          <p>
            &copy; {new Date().getFullYear()} AlgoStakeX Game Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

export default MainLayout;

