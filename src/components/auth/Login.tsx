import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import logoImg from '../../assets/logo.png';

export const Login: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
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
    if (!password) {
      setError('Please enter your password.');
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
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div className="field">
              <label>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '42px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '15px',
                    color: 'var(--ink-dim)',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <button type="submit" className="btnPrimary" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <div className="loginErr">{error}</div>
          </form>
        </div>
      </div>
    </div>
  );
};
