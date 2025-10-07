// src/components/Auth.jsx
import React, { useState } from 'react'
import {
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from '../firebase';

export default function Auth({ user, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleAuth(e) {
    e.preventDefault();
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
      setEmail("");
      setPassword("");
      }
    catch (err) {
      setError(err.message);
    }
  }

  async function handleLogout() {
    await signOut(auth);
  }

  return (
    <div className="Auth">
      {user ? (
        <>
          <span style={{ marginRight: 8 }}>
            Welcome, {user.role}!
          </span>
          <button 
            className="Auth-button"
            onClick={handleLogout}>
            Logout
          </button>
        </>
      ) : (
        <form onSubmit={handleAuth} className="Auth-form">
          <input 
            className="Auth-input"
            name="email" 
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="Auth-input"
            name="password"
            id="password" 
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button 
            className="Auth-button"
            type="submit">
            Login
          </button>
          {error && <div style={{ color: "red" }}>{error}</div>}
        </form>
      )}
    </div>
  );
}
