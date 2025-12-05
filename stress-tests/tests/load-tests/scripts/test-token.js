import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
};

// Используйте токен из переменной окружения или укажите здесь
const TEST_TOKEN = __ENV.TEST_TOKEN;

export default function () {
  if (!TEST_TOKEN) {
    console.log('❌ Токен не установлен!');
    console.log('📝 Используйте: TEST_TOKEN=ваш_токен k6 run test-token.js');
    return;
  }
  
  console.log('🔐 Тестирование работы с токеном');
  console.log('='.repeat(60));
  console.log(`🔑 Токен (первые 30 символов): ${TEST_TOKEN.substring(0, 30)}...`);
  console.log(`🔑 Длина токена: ${TEST_TOKEN.length} символов`);
  
  const baseUrl = 'http://localhost:8000';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_TOKEN}`,
  };
  
  // 1. Пробуем получить список задач
  console.log('\n📋 1. Получение списка задач...');
  const listResponse = http.get(`${baseUrl}/tasks`, { headers });
  
  console.log(`   Статус: ${listResponse.status}`);
  console.log(`   Время: ${listResponse.timings.duration}ms`);
  
  if (listResponse.status === 200) {
    try {
      const tasks = listResponse.json();
      console.log(`   📊 Найдено задач: ${Array.isArray(tasks) ? tasks.length : 'N/A'}`);
    } catch (e) {
      console.log(`   📄 Ответ: ${listResponse.body.substring(0, 200)}`);
    }
  }
  
  // 2. Пробуем создать задачу
  console.log('\n📝 2. Создание новой задачи...');
  const taskData = JSON.stringify({
    title: 'Test task with token',
    description: 'Testing API with authentication token',
    completed: false
  });
  
  const createResponse = http.post(`${baseUrl}/tasks`, taskData, { headers });
  
  console.log(`   Статус: ${createResponse.status}`);
  console.log(`   Время: ${createResponse.timings.duration}ms`);
  
  if (createResponse.status === 200) {
    try {
      const task = createResponse.json();
      console.log(`   ✅ Задача создана`);
      console.log(`   🆔 ID: ${task.id || 'N/A'}`);
      console.log(`   📝 Заголовок: ${task.title}`);
    } catch (e) {
      console.log(`   📄 Ответ: ${createResponse.body.substring(0, 200)}`);
    }
  }
  
  // 3. Проверяем публичные эндпоинты
  console.log('\n🌐 3. Проверка публичных эндпоинтов...');
  const publicEndpoints = ['/', '/health', '/metrics'];
  
  for (const endpoint of publicEndpoints) {
    const response = http.get(`${baseUrl}${endpoint}`);
    console.log(`   ${endpoint}: ${response.status} (${response.timings.duration}ms)`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Тестирование завершено');
  
  if (listResponse.status === 200 && createResponse.status === 200) {
    console.log('🎉 Токен работает корректно!');
  } else {
    console.log('⚠️  Возможны проблемы с токеном');
  }
}