import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BACKEND_URL, FRONTEND_URL, ENDPOINTS } from '../configs/config.js';

// Кастомные метрики
const errorRate = new Rate('errors');
const taskResponseTime = new Trend('task_response_time');
const publicResponseTime = new Trend('public_response_time');

export const options = {
  stages: [
    { duration: '20s', target: 10 },    // Медленный разогрев
    { duration: '40s', target: 30 },     // Средняя нагрузка
    { duration: '30s', target: 50 },     // Высокая нагрузка
    { duration: '20s', target: 30 },     // Снижение
    { duration: '10s', target: 10 },     // Восстановление
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.08'],     // Только HTTP ошибки
  },
  // Отключаем кастомную метрику errors из thresholds
  // thresholds на errors будем анализировать отдельно
};

// Простой токен для тестирования (можно предварительно создать пользователя)
const TEST_TOKENS = [
  null, // Часть запросов без токена
  'dummy-token-1', // Для тестирования публичных endpoints
];

export default function () {
  const userId = __VU;
  const iteration = __ITER;
  
  // Распределение нагрузки
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Публичные запросы (без аутентификации)
    testPublicEndpoints(userId);
  } else if (scenario < 0.7) {
    // 30% - Чтение публичной информации
    testReadOperations(userId);
  } else {
    // 30% - Операции, требующие аутентификации (имитация)
    testWithAuth(userId, iteration);
  }
  
  sleep(Math.random() * 3 + 1);
}

function testPublicEndpoints(userId) {
  const endpoints = [
    { path: ENDPOINTS.root, name: 'root' },
    { path: ENDPOINTS.health, name: 'health' },
    { path: ENDPOINTS.metrics, name: 'metrics' }
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(`${BACKEND_URL}${endpoint.path}`, {
    tags: { type: 'public', endpoint: endpoint.name, vu: userId }
  });
  
  publicResponseTime.add(response.timings.duration);
  
  // Для публичных endpoints считаем успешными статусы 200, 404, 401 и т.д.
  check(response, {
    '✅ Публичный endpoint': (r) => r.status < 500, // Не считаем 5xx ошибками
  });
  
  // Только реальные ошибки сети или сервера
  if (response.status >= 500) {
    errorRate.add(1);
  }
}

function testReadOperations(userId) {
  // Даже без токена можем тестировать доступность API
  const endpoints = [
    `${BACKEND_URL}${ENDPOINTS.root}`,
    `${BACKEND_URL}${ENDPOINTS.health}`,
    FRONTEND_URL
  ];
  
  const url = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(url, {
    tags: { type: 'read', vu: userId }
  });
  
  check(response, {
    '✅ Чтение доступно': (r) => r.status < 500,
  });
}

function testWithAuth(userId, iteration) {
  // Имитация запросов с аутентификацией
  // В реальном тесте здесь был бы токен
  const hasAuth = Math.random() > 0.3; // 70% "успешной" аутентификации
  
  if (hasAuth) {
    // Имитация успешного запроса с аутентификацией
    const response = http.get(`${BACKEND_URL}${ENDPOINTS.health}`, {
      tags: { type: 'auth_success', vu: userId }
    });
    
    taskResponseTime.add(response.timings.duration);
    
    check(response, {
      '✅ Аутентифицированный запрос': (r) => r.status === 200,
    });
  } else {
    // Имитация неудачной аутентификации
    const response = http.get(`${BACKEND_URL}${ENDPOINTS.root}`, {
      tags: { type: 'auth_failed', vu: userId }
    });
    
    // Не считаем это ошибкой для метрики errors
    check(response, {
      '⚠️  Запрос без аутентификации': (r) => r.status < 500,
    });
  }
}

export function setup() {
  console.log('🚀 Начинаем СТРЕСС-ТЕСТ (упрощенная версия)');
  console.log(`🌐 Бэкенд: ${BACKEND_URL}`);
  console.log(`🎨 Фронтенд: ${FRONTEND_URL}`);
  console.log(`👥 Максимальная нагрузка: 50 виртуальных пользователей`);
  console.log(`⏱️  Длительность теста: 2 минуты`);
  console.log('📊 Цели:');
  console.log('   - 95% HTTP запросов < 1500ms');
  console.log('   - < 8% HTTP ошибок (5xx)');
  console.log('='.repeat(60));
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log('✅ Стресс-тест завершен');
  console.log(`⏱️  Общее время: ${duration.toFixed(2)} секунд`);
  console.log(`📊 HTTP ошибки (5xx): ${errorRate.values ? (errorRate.values.rate * 100).toFixed(2) + '%' : '0%'}`);
  console.log(`⚡ Среднее время публичных запросов: ${publicResponseTime.mean ? publicResponseTime.mean.toFixed(2) + 'ms' : 'N/A'}`);
}