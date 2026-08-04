import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import logoImg from '../../assets/logo.png';

export const Login: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('demo123');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const uname = username.trim();
    if (!uname) {
      setError('Please enter your username.');
      return;
    }

    setLoading(true);
    try {
      const success = await login(uname, password);
      if (!success) {
        setError('Invalid username or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="loginScreen">
      {/* Floating Animated Radial Glow Backdrop */}
      <div className="loginGlowBackground"></div>

      <div className="loginContainer">
        {/* Visual Anchor: MESCO White Logo */}
        <div className="loginLogoWrapper">
          <img src={logoImg} alt="MESCO Switches & Sockets" className="loginLogo" />
        </div>

        <div className="loginCard">
          <h2>Sign in</h2>
          <p className="sub">Enter your account credentials to continue.</p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Username</label>
              <input
                type="text"
                placeholder="e.g. admin, manager, store, ali traders"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btnPrimary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <div className="loginErr">{error}</div>
          </form>

          <div className="demoNote">
            <b>Demo access accounts</b> (Password: <code>demo123</code>):
            <br />
            • <b>admin</b> — Admin Dashboard (Manage Users &amp; Roles)
            <br />
            • <b>manager</b> — Office Manager (Orders, Rates, Reports)
            <br />
            • <b>store</b> — Store Floor (Dispatch &amp; Printing)
            <br />
            • <b>ali traders</b> — Customer Ordering Account
          </div>
        </div>
      </div>
    </div>
  );
};
