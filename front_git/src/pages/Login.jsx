import { useState } from 'react';
import { auth } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await auth.login(email, password);
      onLogin(token, user);
    } catch (err) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', margin: '0 0 8px', fontSize: 24 }}>CRM 3D</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Вход в систему</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@crm.local"
              required
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
          Демо: admin@crm.local / operator@crm.local, пароль: admin123
        </p>
      </div>
    </div>
  );
}
