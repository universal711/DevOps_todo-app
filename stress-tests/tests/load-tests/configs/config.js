// Конфигурация для тестов Todo App (FastAPI версия)
export const environments = {
  local: {
    backend: 'http://localhost:8000',    // бэкенд на порту 8000
    frontend: 'http://localhost',        // фронтенд на порту 80
    endpoints: {
      tasks: '/tasks',
      auth: '/auth',
      categories: '/categories',
      users: '/users',
      health: '/health',
      metrics: '/metrics',
      root: '/'
    },
    timeout: '30s',
  },
  
  docker: {
    backend: 'http://backend:8000',
    frontend: 'http://frontend:80',
    endpoints: {
      tasks: '/tasks',
      auth: '/auth',
      categories: '/categories',
      users: '/users',
      health: '/health',
      metrics: '/metrics',
      root: '/'
    },
    timeout: '30s',
  }
};

// Выбор окружения
const env = __ENV.TEST_ENV || 'local';
export const config = environments[env];

// Экспортируем основные URL для удобства
export const BACKEND_URL = config.backend;
export const FRONTEND_URL = config.frontend;
export const ENDPOINTS = config.endpoints;
export const REQUEST_TIMEOUT = config.timeout;

// Для обратной совместимости
export const BASE_URL = BACKEND_URL;
export const API_PREFIX = ''; // У FastAPI нет единого префикса /api