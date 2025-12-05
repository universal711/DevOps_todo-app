import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  console.log('🔍 ДИАГНОСТИКА СИСТЕМЫ');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'Фронтенд (порт 80)', url: 'http://localhost' },
    { name: 'Бэкенд (порт 8000)', url: 'http://localhost:8000' },
    { name: 'Health check', url: 'http://localhost:8000/health' },
    { name: 'Метрики Prometheus', url: 'http://localhost:8000/metrics' },
    { name: 'Grafana (порт 3001)', url: 'http://localhost:3001' },
    { name: 'Prometheus UI (порт 9090)', url: 'http://localhost:9090' },
  ];
  
  for (const test of tests) {
    console.log(`\n${test.name}:`);
    try {
      const response = http.get(test.url, { timeout: '10s' });
      console.log(`   Статус: ${response.status}`);
      console.log(`   Время ответа: ${response.timings.duration}ms`);
      console.log(`   Размер: ${response.body.length} байт`);
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Диагностика завершена');
}