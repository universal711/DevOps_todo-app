import http from 'k6/http';
import { BACKEND_URL, ENDPOINTS } from '../configs/config.js';

// Кеш токенов для каждого VU
const tokenCache = new Map();

/**
 * Получение токена аутентификации
 * @param {number} userId - ID виртуального пользователя
 * @returns {string|null} - токен или null при ошибке
 */
export function getAuthToken(userId) {
  // Проверяем кеш (токен действителен 5 минут)
  const cached = tokenCache.get(userId);
  if (cached && Date.now() < cached.expiry) {
    return cached.token;
  }
  
  // Более надежный email для каждого VU
  const email = `vu${userId}@test.k6`;
  const password = 'Testpassword123!';
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // 1. Пытаемся зарегистрироваться
  const registerData = JSON.stringify({
    email: email,
    password: password
  });
  
  const registerResponse = http.post(
    `${BACKEND_URL}${ENDPOINTS.auth}/register`,
    registerData,
    { 
      headers, 
      tags: { type: 'register', vu: userId },
      timeout: '15s'
    }
  );
  
  let token = null;
  
  if (registerResponse.status === 200) {
    // Регистрация успешна
    token = registerResponse.json().access_token;
  } else if (registerResponse.status === 400) {
    // Пользователь уже существует - пробуем войти
    const loginData = JSON.stringify({
      email: email,
      password: password
    });
    
    const loginResponse = http.post(
      `${BACKEND_URL}${ENDPOINTS.auth}/login`,
      loginData,
      { 
        headers, 
        tags: { type: 'login', vu: userId },
        timeout: '15s'
      }
    );
    
    if (loginResponse.status === 200) {
      token = loginResponse.json().access_token;
    } else {
      console.log(`⚠️  VU ${userId}: Ошибка входа ${loginResponse.status} - ${loginResponse.body.substring(0, 100)}`);
    }
  } else {
    console.log(`⚠️  VU ${userId}: Ошибка регистрации ${registerResponse.status} - ${registerResponse.body.substring(0, 100)}`);
  }
  
  // Кешируем токен
  if (token) {
    tokenCache.set(userId, {
      token: token,
      expiry: Date.now() + 300000 // 5 минут
    });
    return token;
  }
  
  return null;
}

/**
 * Упрощенная функция для тестов, которые не требуют токена
 * @param {number} userId - ID виртуального пользователя
 * @returns {string|null} - токен или null
 */
export function getSimpleAuthToken(userId) {
  // Для стресс-тестов используем общий токен или простую аутентификацию
  const testEmail = 'test@k6.com';
  const testPassword = 'Testpassword123!';
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Пробуем логин с тестовыми учетными данными
  const loginData = JSON.stringify({
    email: testEmail,
    password: testPassword
  });
  
  try {
    const loginResponse = http.post(
      `${BACKEND_URL}${ENDPOINTS.auth}/login`,
      loginData,
      { headers, timeout: '10s' }
    );
    
    if (loginResponse.status === 200) {
      return loginResponse.json().access_token;
    }
  } catch (error) {
    // Игнорируем ошибки аутентификации в стресс-тестах
  }
  
  return null;
}