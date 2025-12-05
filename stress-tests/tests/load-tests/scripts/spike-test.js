import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BACKEND_URL, FRONTEND_URL, ENDPOINTS } from '../configs/config.js';
import { getAuthToken } from './auth-helper.js';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '10s', target: 100 },
    { duration: '20s', target: 100 },
    { duration: '5s', target: 20 },
    { duration: '10s', target: 200 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const currentVUs = __VU;
  
  if (currentVUs > 50) {
    const endpoints = [ENDPOINTS.health, ENDPOINTS.root];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    
    const response = http.get(`${BACKEND_URL}${endpoint}`);
    check(response, {
      '✅ Публичный endpoint (spike)': (r) => r.status === 200,
    }) || errorRate.add(1);
  } else {
    const token = getAuthToken(__VU);
    
    if (token) {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      
      const response = http.get(
        `${BACKEND_URL}${ENDPOINTS.tasks}`,
        { headers }
      );
      
      check(response, {
        '✅ Задачи (spike)': (r) => r.status === 200,
      }) || errorRate.add(1);
    }
  }
  
  if (currentVUs > 100) {
    sleep(Math.random() * 0.5);
  } else {
    sleep(Math.random() * 2 + 1);
  }
}

export function setup() {
  console.log('🚀 Начинаем SPIKE-ТЕСТ (тест на скачки нагрузки)');
  console.log(`🌐 Бэкенд: ${BACKEND_URL}`);
  console.log(`🎨 Фронтенд: ${FRONTEND_URL}`);
  console.log(`👥 Максимальная нагрузка: 200 виртуальных пользователей`);
  console.log(`⏱️  Длительность теста: 1 минута`);
  console.log('='.repeat(60));
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log('✅ Spike-тест завершен');
  console.log(`⏱️  Общее время: ${duration.toFixed(2)} секунд`);
  console.log(`📊 Процент ошибок: ${errorRate.values ? (errorRate.values.rate * 100).toFixed(2) + '%' : 'N/A'}`);
}