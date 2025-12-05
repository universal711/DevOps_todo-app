import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { BACKEND_URL, ENDPOINTS } from '../configs/config.js';
import { getAuthToken } from './auth-helper.js';

const errorRate = new Rate('errors');
const tasksCreated = new Counter('tasks_created');

export const options = {
  stages: [
    { duration: '1m', target: 5 },
    { duration: '3m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.02'],
  },
};

export default function () {
  const userId = __VU;
  const authToken = getAuthToken(userId);
  
  if (authToken) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };
    
    const scenario = Math.random();
    
    if (scenario < 0.4) {
      const taskData = JSON.stringify({
        title: `Soak test task ${Date.now()}`,
        description: 'Long running test',
        completed: false
      });
      
      const response = http.post(
        `${BACKEND_URL}${ENDPOINTS.tasks}`,
        taskData,
        { headers }
      );
      
      check(response, {
        '✅ Создание задачи (soak)': (r) => r.status === 200,
      }) || errorRate.add(1);
      
      if (response.status === 200) {
        tasksCreated.add(1);
      }
    } else if (scenario < 0.8) {
      const response = http.get(
        `${BACKEND_URL}${ENDPOINTS.tasks}`,
        { headers }
      );
      
      check(response, {
        '✅ Получение списка (soak)': (r) => r.status === 200,
      }) || errorRate.add(1);
    } else {
      const response = http.get(`${BACKEND_URL}${ENDPOINTS.health}`);
      check(response, {
        '✅ Health check (soak)': (r) => r.status === 200,
      }) || errorRate.add(1);
    }
  }
  
  sleep(Math.random() * 5 + 2);
}

export function setup() {
  console.log('🚀 Начинаем SOAK-ТЕСТ (тест на выносливость)');
  console.log(`🌐 Бэкенд: ${BACKEND_URL}`);
  console.log(`👥 Максимальная нагрузка: 10 виртуальных пользователей`);
  console.log(`⏱️  Длительность теста: 5 минут`);
  console.log('='.repeat(60));
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log('✅ Soak-тест завершен');
  console.log(`⏱️  Общее время: ${duration.toFixed(2)} секунд`);
  console.log(`📊 Создано задач: ${tasksCreated ? tasksCreated : 'N/A'}`);
}