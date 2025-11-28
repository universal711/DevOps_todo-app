import React, { useState } from 'react';

const Register = ({ onRegister, onSwitchToLogin }) => {
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userData.password !== userData.confirmPassword) {
      alert('Пароли не совпадают!');
      return;
    }
    onRegister(userData);
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>👤 Регистрация</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={userData.email}
              onChange={(e) => setUserData({...userData, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Пароль"
              value={userData.password}
              onChange={(e) => setUserData({...userData, password: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Подтвердите пароль"
              value={userData.confirmPassword}
              onChange={(e) => setUserData({...userData, confirmPassword: e.target.value})}
              required
            />
          </div>
          <button type="submit" className="btn-primary">Зарегистрироваться</button>
        </form>
        <p>
          Уже есть аккаунт?{' '}
          <span className="auth-link" onClick={onSwitchToLogin}>
            Войдите
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;