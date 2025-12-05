import http from 'k6/http';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  console.log('🔧 Настройка тестового пользователя для нагрузочного тестирования');
  console.log('='.repeat(60));
  
  const baseUrl = 'http://localhost:8000';
  const email = 'loadtest@k6.com';
  const password = 'Testpassword123!';
  
  // 1. Пробуем зарегистрировать пользователя
  const registerData = JSON.stringify({
    email: email,
    password: password
  });
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  console.log(`📝 Регистрация пользователя: ${email}`);
  const registerResponse = http.post(
    `${baseUrl}/auth/register`,
    registerData,
    { headers, timeout: '10s' }
  );
  
  let token = null;
  
  if (registerResponse.status === 200) {
    console.log('✅ Пользователь успешно зарегистрирован');
    const userData = registerResponse.json();
    console.log(`📧 Email: ${userData.email}`);
    console.log(`🆔 ID: ${userData.id || 'N/A'}`);
    
    // 2. Теперь логинимся, чтобы получить токен
    console.log('\n🔐 Логин для получения токена...');
    const loginData = JSON.stringify({
      email: email,
      password: password
    });
    
    const loginResponse = http.post(
      `${baseUrl}/auth/login`,
      loginData,
      { headers, timeout: '10s' }
    );
    
    if (loginResponse.status === 200) {
      const loginResult = loginResponse.json();
      token = loginResult.access_token;
      console.log('✅ Успешный вход');
      console.log(`🔑 Токен получен: ${token.substring(0, 30)}...`);
      console.log(`🔑 Тип токена: ${loginResult.token_type}`);
    } else {
      console.log(`❌ Ошибка входа: ${loginResponse.status}`);
      console.log(`📄 Ответ: ${loginResponse.body}`);
    }
    
  } else if (registerResponse.status === 400) {
    console.log('⚠️  Пользователь уже существует, пробуем войти...');
    
    const loginData = JSON.stringify({
      email: email,
      password: password
    });
    
    const loginResponse = http.post(
      `${baseUrl}/auth/login`,
      loginData,
      { headers, timeout: '10s' }
    );
    
    if (loginResponse.status === 200) {
      const loginResult = loginResponse.json();
      token = loginResult.access_token;
      console.log('✅ Успешный вход');
      console.log(`🔑 Токен: ${token.substring(0, 30)}...`);
      console.log(`🔑 Тип токена: ${loginResult.token_type}`);
    } else {
      console.log(`❌ Ошибка входа: ${loginResponse.status}`);
      console.log(`📄 Ответ: ${loginResponse.body}`);
    }
  } else {
    console.log(`❌ Ошибка регистрации: ${registerResponse.status}`);
    console.log(`📄 Ответ: ${registerResponse.body}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Проверка доступности сервисов:');
  
  const endpoints = [
    { name: 'Корневой эндпоинт', path: '/' },
    { name: 'Health check', path: '/health' },
    { name: 'Метрики', path: '/metrics' }
  ];
  
  for (const endpoint of endpoints) {
    const response = http.get(`${baseUrl}${endpoint.path}`);
    console.log(`   ${endpoint.name}: ${response.status} (${response.timings.duration}ms)`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (token) {
    console.log('🚀 Для использования в тестах:');
    console.log('');
    console.log('1. Экспортируйте переменную окружения:');
    console.log(`   export TEST_TOKEN="${token}"`);
    console.log('');
    console.log('2. Или используйте в командной строке:');
    console.log(`   TEST_TOKEN="${token}" k6 run auth-stress.js`);
    console.log('');
    console.log('3. Или добавьте в скрипты:');
    console.log(`   const token = __ENV.TEST_TOKEN || "${token.substring(0, 20)}...";`);
  } else {
    console.log('❌ Не удалось получить токен для тестирования');
  }
  
  console.log('='.repeat(60));
}