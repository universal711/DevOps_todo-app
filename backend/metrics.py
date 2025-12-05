from prometheus_client import Counter, Histogram, generate_latest, REGISTRY, Gauge
from prometheus_client.core import CollectorRegistry
import time
from fastapi import Request, Response
import asyncio
import psutil
import os

# Метрики HTTP запросов
REQUEST_COUNT = Counter(
    'http_requests_total', 
    'Total HTTP Requests', 
    ['method', 'endpoint', 'status_code']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds', 
    'Request latency in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0]  # Добавляем бакеты для гистограммы
)

# Бизнес-метрики
TASKS_BY_CATEGORY = Gauge('tasks_by_category', 'Tasks count by category', ['category_id'])
TASKS_BY_STATUS = Gauge('tasks_by_status', 'Tasks count by status', ['status'])
TASK_CREATED = Counter('tasks_created_total', 'Total tasks created')
TASK_COMPLETED = Counter('tasks_completed_total', 'Total tasks completed')
ACTIVE_USERS = Gauge('active_users_current', 'Current active users')

# Системные метрики
DATABASE_ERRORS = Counter('database_errors_total', 'Total database errors')
RESPONSE_SIZE = Histogram(
    'http_response_size_bytes',
    'Response size in bytes',
    ['method', 'endpoint'],
    buckets=[100, 1000, 10000, 100000, 1000000]  # Бакеты для размеров ответов
)

# Дополнительные метрики для лучшего мониторинга
EXCEPTIONS_COUNT = Counter(
    'exceptions_total',
    'Total exceptions',
    ['exception_type', 'endpoint']
)

REQUESTS_IN_PROGRESS = Gauge(
    'http_requests_in_progress',
    'Number of requests in progress',
    ['method', 'endpoint']
)

# Метрики процесса
PROCESS_MEMORY_USAGE = Gauge('process_memory_usage_bytes', 'Memory usage of the process')
PROCESS_CPU_USAGE = Gauge('process_cpu_usage_percent', 'CPU usage of the process')

class MetricsMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, request: Request, call_next):
        start_time = time.time()
        
        # Пропускаем метрики и health check, чтобы избежать рекурсии
        if request.url.path in ["/metrics", "/health"]:
            response = await call_next(request)
            return response
        
        # Увеличиваем счетчик активных запросов
        REQUESTS_IN_PROGRESS.labels(
            method=request.method,
            endpoint=request.url.path
        ).inc()
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Собираем метрики
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code
            ).inc()
            
            REQUEST_LATENCY.labels(
                method=request.method,
                endpoint=request.url.path
            ).observe(process_time)
            
            # Пытаемся получить размер ответа
            try:
                if hasattr(response, 'body') and response.body:
                    response_size = len(response.body)
                    RESPONSE_SIZE.labels(
                        method=request.method,
                        endpoint=request.url.path
                    ).observe(response_size)
                elif hasattr(response, 'headers') and 'content-length' in response.headers:
                    response_size = int(response.headers.get('content-length', 0))
                    RESPONSE_SIZE.labels(
                        method=request.method,
                        endpoint=request.url.path
                    ).observe(response_size)
            except Exception:
                # Игнорируем ошибки измерения размера ответа
                pass
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            
            # Считаем ошибки
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=request.url.path,
                status_code=500
            ).inc()
            
            EXCEPTIONS_COUNT.labels(
                exception_type=type(e).__name__,
                endpoint=request.url.path
            ).inc()
            
            # Поднимаем исключение дальше
            raise e
        finally:
            # Уменьшаем счетчик активных запросов
            REQUESTS_IN_PROGRESS.labels(
                method=request.method,
                endpoint=request.url.path
            ).dec()

def update_process_metrics():
    """Обновление метрик процесса"""
    try:
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        PROCESS_MEMORY_USAGE.set(memory_info.rss)  # RSS - Resident Set Size
        
        cpu_percent = process.cpu_percent()
        PROCESS_CPU_USAGE.set(cpu_percent)
    except Exception:
        # Игнорируем ошибки сбора метрик процесса
        pass

def setup_metrics(app):
    """Настройка метрик для FastAPI приложения"""
    
    # Добавляем middleware
    app.add_middleware(MetricsMiddleware)
    
    @app.get("/metrics")
    async def metrics():
        """Эндпоинт для сбора метрик Prometheus"""
        # Обновляем метрики процесса перед отдачей
        update_process_metrics()
        
        return Response(
            content=generate_latest(REGISTRY),
            media_type="text/plain"
        )
    
    @app.get("/health")
    async def health_check():
        """Эндпоинт для проверки здоровья"""
        # Можно добавить проверки БД и других зависимостей
        health_status = {
            "status": "healthy",
            "timestamp": time.time(),
            "service": "todo-backend",
            "version": "1.0.0"
        }
        
        # Простая проверка доступности
        try:
            # Если есть подключение к БД, можно добавить проверку
            # db_status = check_database_connection()
            # health_status["database"] = db_status
            pass
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["error"] = str(e)
        
        return health_status

# Функции для обновления бизнес-метрик из других частей приложения
def increment_task_created():
    """Увеличить счетчик созданных задач"""
    TASK_CREATED.inc()

def increment_task_completed():
    """Увеличить счетчик завершенных задач"""
    TASK_COMPLETED.inc()

def increment_database_error():
    """Увеличить счетчик ошибок БД"""
    DATABASE_ERRORS.inc()

def set_active_users(count: int):
    """Установить количество активных пользователей"""
    ACTIVE_USERS.set(count)