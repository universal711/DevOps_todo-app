// Конфигурация для разных окружений
export const environments = {
  local: {
    baseUrl: 'http://localhost:3000',
    apiPrefix: '/api',
    timeout: '30s',
  },
  docker: {
    baseUrl: 'http://backend:8000',  // имя сервиса в docker-compose
    apiPrefix: '/api',
    timeout: '30s',
  },
  staging: {
    baseUrl: 'https://staging.todo-app.com',
    apiPrefix: '/api/v1',
    timeout: '60s',
  },
  production: {
    baseUrl: 'https://todo-app.com',
    apiPrefix: '/api/v1',
    timeout: '60s',
  },
};

// Выбор окружения через переменную окружения
const env = __ENV.ENV || 'local';
export const config = environments[env];