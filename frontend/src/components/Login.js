import React, { useState } from 'react';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(credentials);
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>🔐 Вход в систему</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Пароль"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              required
            />
          </div>
          <button type="submit" className="btn-primary">Войти</button>
        </form>
        <p>
          Нет аккаунта?{' '}
          <span className="auth-link" onClick={onSwitchToRegister}>
            Зарегистрируйтесь
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;