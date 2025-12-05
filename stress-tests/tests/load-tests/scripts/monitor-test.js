import http from 'k6/http';
import { check, sleep } from 'k6';
import { BACKEND_URL, ENDPOINTS } from '../configs/config.js';

export const options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const userId = __VU;
  
  // Чередуем разные типы запросов
  const requestType = Math.random();
  
  if (requestType < 0.3) {
    // Health check
    const response = http.get(`${BACKEND_URL}${ENDPOINTS.health}`);
    check(response, {
      '✅ Health check': (r) => r.status === 200,
    });
  } else if (requestType < 0.6) {
    // Метрики Prometheus
    const response = http.get(`${BACKEND_URL}${ENDPOINTS.metrics}`);
    check(response, {
      '✅ Метрики Prometheus': (r) => r.status === 200,
      '✅ Метрики не пустые': (r) => r.body.length > 1000,
    });
  } else {
    // Корневой эндпоинт
    const response = http.get(`${BACKEND_URL}${ENDPOINTS.root}`);
    check(response, {
      '✅ Корневой эндпоинт': (r) => r.status === 200,
    });
  }
  
  sleep(Math.random() * 2 + 1);
}

export function teardown() {
  console.log('📊 Проверьте метрики в мониторинге:');
  console.log('   Grafana:      http://localhost:3001 (admin/admin123)');
  console.log('   Prometheus:   http://localhost:9090');
  console.log('   Loki:         http://localhost:3100');
}