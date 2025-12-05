import http from 'k6/http';
import { check, sleep } from 'k6';
import { BACKEND_URL, FRONTEND_URL, ENDPOINTS } from '../configs/config.js';
import { getAuthToken, safeRequest } from './auth-helper.js';

export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    http_req_duration: ['avg < 500', 'p(95) < 1000'],  // Увеличиваем порог
    http_req_failed: ['rate < 0.05'],  // Снижаем до 5%
  },
};

export default function () {
  const userId = __VU;
  const iteration = __ITER;
  
  // 1. Тестируем фронтенд
  const frontendResponse = http.get(FRONTEND_URL, { 
    tags: { type: 'frontend', vu: userId } 
  });
  
  check(frontendResponse, {
    '✅ Фронтенд доступен': (r) => r.status === 200 || r.status === 304,
    '✅ Фронтенд быстрый': (r) => r.timings.duration < 1000,
  });
  
  // 2. Тестируем публичные эндпоинты бэкенда
  const rootResponse = http.get(`${BACKEND_URL}${ENDPOINTS.root}`, {
    tags: { type: 'public', endpoint: 'root' }
  });
  
  check(rootResponse, {
    '✅ Бэкенд доступен': (r) => r.status === 200,
    '✅ Корректный JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });
  
  // 3. Работа с задачами (требует аутентификации)
  const token = getAuthToken(userId);
  
  if (token) {
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    // 3.1 Создаем задачу
    const taskData = JSON.stringify({
      title: `Smoke task V${userId}-I${iteration}`,
      description: 'Created during smoke test',
      completed: false
    });
    
    const createResponse = http.post(
      `${BACKEND_URL}${ENDPOINTS.tasks}`,
      taskData,
      { 
        headers: authHeaders,
        tags: { type: 'tasks', action: 'create', vu: userId }
      }
    );
    
    check(createResponse, {
      '✅ Создание задачи': (r) => r.status === 200,
    });
    
    let taskId = null;
    if (createResponse.status === 200) {
      const task = createResponse.json();
      taskId = task.id;
    }
    
    // 3.2 Получаем список задач
    const listResponse = http.get(
      `${BACKEND_URL}${ENDPOINTS.tasks}`,
      { 
        headers: authHeaders,
        tags: { type: 'tasks', action: 'list', vu: userId }
      }
    );
    
    check(listResponse, {
      '✅ Получение списка': (r) => r.status === 200,
    });
    
    // 3.3 Если задача создана, обновляем ее
    if (taskId) {
      const updateData = JSON.stringify({
        completed: true,
        description: `Updated at iteration ${iteration}`
      });
      
      const updateResponse = http.put(
        `${BACKEND_URL}${ENDPOINTS.tasks}/${taskId}`,
        updateData,
        { 
          headers: authHeaders,
          tags: { type: 'tasks', action: 'update', vu: userId }
        }
      );
      
      check(updateResponse, {
        '✅ Обновление задачи': (r) => r.status === 200,
      });
    }
  } else {
    console.log(`⚠️  VU ${userId}: Пропускаем тесты с задачами (нет токена)`);
  }
  
  // 4. Health check (публичный)
  const healthResponse = http.get(`${BACKEND_URL}${ENDPOINTS.health}`, {
    tags: { type: 'health', vu: userId }
  });
  
  check(healthResponse, {
    '✅ Health check': (r) => r.status === 200,
  });
  
  sleep(Math.random() * 2 + 1);
}