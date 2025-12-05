import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BACKEND_URL, ENDPOINTS } from '../configs/config.js';

const responseTime = new Trend('response_time');

// Используйте токен, полученный из setup-test-user.js
// Пример: TEST_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... k6 run auth-stress.js
const AUTH_TOKEN = __ENV.TEST_TOKEN;

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '20s', target: 15 },
    { duration: '10s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Если токен не установлен, пропускаем тест
  if (!AUTH_TOKEN) {
    console.log('⚠️  Токен не установлен! Запустите:');
    console.log('   k6 run setup-test-user.js');
    console.log('   затем:');
    console.log('   TEST_TOKEN=ваш_токен k6 run auth-stress.js');
    return;
  }
  
  const userId = __VU;
  const iteration = __ITER;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
  
  // Чередуем разные типы запросов
  const requestType = Math.random();
  
  let response;
  
  if (requestType < 0.4) {
    // 40% - Создание задачи
    const taskData = JSON.stringify({
      title: `Task V${userId}-I${iteration}`,
      description: 'Created during authenticated stress test',
      completed: false
    });
    
    response = http.post(
      `${BACKEND_URL}${ENDPOINTS.tasks}`,
      taskData,
      { 
        headers,
        tags: { type: 'create', vu: userId }
      }
    );
    
    check(response, {
      '✅ Создание задачи': (r) => r.status === 200,
    });
    
  } else if (requestType < 0.7) {
    // 30% - Получение списка задач
    response = http.get(
      `${BACKEND_URL}${ENDPOINTS.tasks}`,
      { 
        headers,
        tags: { type: 'list', vu: userId }
      }
    );
    
    check(response, {
      '✅ Получение списка': (r) => r.status === 200,
    });
    
  } else if (requestType < 0.9) {
    // 20% - Обновление задачи (сначала получаем список)
    const listResponse = http.get(
      `${BACKEND_URL}${ENDPOINTS.tasks}?limit=5`,
      { headers }
    );
    
    if (listResponse.status === 200 && listResponse.json().length > 0) {
      const tasks = listResponse.json();
      const task = tasks[Math.floor(Math.random() * tasks.length)];
      
      const updateData = JSON.stringify({
        completed: !task.completed,
        description: `Updated by VU ${userId}`
      });
      
      response = http.put(
        `${BACKEND_URL}${ENDPOINTS.tasks}/${task.id}`,
        updateData,
        { 
          headers,
          tags: { type: 'update', vu: userId }
        }
      );
      
      check(response, {
        '✅ Обновление задачи': (r) => r.status === 200,
      });
    } else {
      // Если нет задач, создаем новую
      const taskData = JSON.stringify({
        title: `Fallback task V${userId}`,
        description: 'Created because no tasks found',
        completed: false
      });
      
      response = http.post(
        `${BACKEND_URL}${ENDPOINTS.tasks}`,
        taskData,
        { headers }
      );
    }
    
  } else {
    // 10% - Health check (публичный, без токена)
    response = http.get(
      `${BACKEND_URL}${ENDPOINTS.health}`,
      { tags: { type: 'health', vu: userId } }
    );
    
    check(response, {
      '✅ Health check': (r) => r.status === 200,
    });
  }
  
  if (response) {
    responseTime.add(response.timings.duration);
  }
  
  sleep(Math.random() * 2 + 0.5);
}

export function setup() {
  console.log('🔐 Аутентифицированный стресс-тест');
  console.log('='.repeat(60));
  
  if (!AUTH_TOKEN) {
    console.log('❌ Токен не установлен!');
    console.log('');
    console.log('📝 Инструкция:');
    console.log('1. Сначала запустите: k6 run setup-test-user.js');
    console.log('2. Скопируйте токен из вывода');
    console.log('3. Запустите: TEST_TOKEN=ваш_токен k6 run auth-stress.js');
    console.log('='.repeat(60));
    return;
  }
  
  console.log(`✅ Токен установлен (длина: ${AUTH_TOKEN.length} символов)`);
  console.log(`👥 Количество VU: до 15`);
  console.log(`⏱️  Длительность: 1 минута 20 секунд`);
  console.log(`📡 Тестируемые эндпоинты:`);
  console.log(`   - ${BACKEND_URL}${ENDPOINTS.tasks} (GET/POST/PUT)`);
  console.log(`   - ${BACKEND_URL}${ENDPOINTS.health} (GET)`);
  console.log('='.repeat(60));
}

export function teardown() {
  console.log('✅ Аутентифицированный тест завершен');
  console.log(`📊 Среднее время ответа: ${responseTime.mean ? responseTime.mean.toFixed(2) + 'ms' : 'N/A'}`);
  console.log(`📈 95 перцентиль: ${responseTime.values ? responseTime.values.p95 + 'ms' : 'N/A'}`);
}