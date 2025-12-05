import { BACKEND_URL, FRONTEND_URL, API_PREFIX } from '../configs/config.js';

// K6 требует экспортированную функцию по умолчанию
export default function () {
  console.log('='.repeat(60));
  console.log('📋 ПРОВЕРКА КОНФИГУРАЦИИ ТЕСТОВ');
  console.log('='.repeat(60));
  console.log('🌐 АДРЕСА СЕРВИСОВ:');
  console.log(`✅ Бэкенд (API): ${BACKEND_URL}`);
  console.log(`✅ Фронтенд (UI): ${FRONTEND_URL}`);
  console.log(`✅ Префикс API: ${API_PREFIX}`);
  console.log('');
  console.log('🔗 ПРИМЕРЫ ЗАПРОСОВ:');
  console.log(`📝 API список задач: ${BACKEND_URL}${API_PREFIX}/todos`);
  console.log(`🏠 Главная страница: ${FRONTEND_URL}`);
  console.log('');
  console.log('⚙️  НАСТРОЙКА ОКРУЖЕНИЯ:');
  console.log('   Используйте переменные окружения:');
  console.log('   TEST_ENV=local    - локальная разработка');
  console.log('   TEST_ENV=docker   - Docker окружение');
  console.log('   TEST_ENV=nginx    - через nginx (порт 80)');
  console.log('');
  console.log('   Пример: TEST_ENV=local k6 run smoke-test.js');
  console.log('='.repeat(60));
}