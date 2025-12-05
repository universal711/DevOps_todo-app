// Конфигурации для разных типов тестов
export const scenarios = {
  smoke: {
    vus: 1,
    duration: '10s',
    gracefulStop: '5s',
    tags: { test_type: 'smoke' }
  },
  
  load: {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 0 },
    ],
    tags: { test_type: 'load' }
  },
  
  stress: {
    stages: [
      { duration: '2m', target: 200 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 400 },
      { duration: '5m', target: 400 },
      { duration: '2m', target: 0 },
    ],
    tags: { test_type: 'stress' }
  },
  
  soak: {
    stages: [
      { duration: '5m', target: 50 },
      { duration: '2h', target: 50 },
      { duration: '5m', target: 0 },
    ],
    tags: { test_type: 'soak' }
  },
  
  spike: {
    stages: [
      { duration: '1m', target: 50 },
      { duration: '10s', target: 500 },
      { duration: '1m', target: 500 },
      { duration: '10s', target: 0 },
    ],
    tags: { test_type: 'spike' }
  }
};

// Функция для получения конфигурации
export function getConfig(testType, customParams = {}) {
  const baseConfig = scenarios[testType] || scenarios.load;
  return { ...baseConfig, ...customParams };
}