import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { formatWalletAddress, getRandomAvatar } from "../utils";
import { useState, useCallback, useEffect } from "react";

function MainLayout() {
  const { algoStakeXClient } = useSDK();
  const navigate = useNavigate();
  const location = useLocation();
  const [, forceUpdate] = useState({});

  const refreshHeader = useCallback(() => {
    forceUpdate({});
  }, []);

  useSDKEvents({
    onWalletConnect: refreshHeader,
    onWalletDisconnect: refreshHeader,
  });

  useEffect(() => {
    if (algoStakeXClient?.account && location.pathname === "/") {
      navigate("/game", { replace: true });
    }
  }, [algoStakeXClient?.account, location.pathname, navigate]);

  return (
    <>
      <header>
        <div className="container header-content">
          <div className="logo">
            <h1>🎮 Solo Arena</h1>
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
            {!algoStakeXClient?.account ? (
              <Link to="/">Home</Link>
            ) : (
              <>
                <Link to="/game">Game</Link>
                <Link to="/profile">Profile</Link>
              </>
            )}
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
            &copy; {new Date().getFullYear()} Solo Arena. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

export default MainLayout;

