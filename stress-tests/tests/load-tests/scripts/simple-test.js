import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BACKEND_URL, FRONTEND_URL, ENDPOINTS } from '../configs/config.js';

const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '20s', target: 100 },
    { duration: '10s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const userId = __VU;
  
  // Только публичные запросы
  const endpoints = [
    `${BACKEND_URL}${ENDPOINTS.root}`,
    `${BACKEND_URL}${ENDPOINTS.health}`,
    `${BACKEND_URL}${ENDPOINTS.metrics}`,
    FRONTEND_URL
  ];
  
  const url = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const response = http.get(url, {
    tags: { vu: userId, url: url },
    timeout: '10s'
  });
  
  responseTime.add(response.timings.duration);
  
  check(response, {
    '✅ Статус < 500': (r) => r.status < 500,
    '✅ Ответ получен': (r) => r.timings.duration < 2000,
  });
  
  sleep(Math.random() * 2 + 0.5);
}

export function setup() {
  console.log('🚀 Простой стресс-тест (без аутентификации)');
  console.log(`⏱️  Длительность: 1 минута 20 секунд`);
  console.log(`👥 Максимальная нагрузка: 100 VUs`);
  console.log('='.repeat(60));
}

export function teardown() {
  console.log('✅ Тест завершен');
  console.log(`📊 Среднее время ответа: ${responseTime.mean ? responseTime.mean.toFixed(2) + 'ms' : 'N/A'}`);
}