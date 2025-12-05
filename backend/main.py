import logging
import sys
import time
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from prometheus_client import Counter, Histogram, generate_latest, REGISTRY, CONTENT_TYPE_LATEST
from pythonjsonlogger import jsonlogger

from core.config import settings
from models import Base, engine
from routers import auth, tasks, categories, users
from metrics import REQUEST_COUNT, REQUEST_LATENCY, TASK_CREATED, TASK_COMPLETED

# ========== НАСТРОЙКА ЛОГИРОВАНИЯ ==========
# Создаем директорию для логов если её нет
log_dir = "/var/log/backend"
os.makedirs(log_dir, exist_ok=True)

# Настройка корневого логгера
logger = logging.getLogger("todo-app")
logger.setLevel(logging.INFO)

# Форматтер для JSON логов
json_formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s %(module)s %(funcName)s %(lineno)d',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# 1. Console handler (stdout)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(json_formatter)
console_handler.setLevel(logging.INFO)

# 2. File handler для Loki (с ротацией)
file_handler = RotatingFileHandler(
    filename=os.path.join(log_dir, "backend.log"),
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5,
    encoding='utf-8'
)
file_handler.setFormatter(json_formatter)
file_handler.setLevel(logging.INFO)

# 3. Error file handler (отдельный файл для ошибок)
error_file_handler = RotatingFileHandler(
    filename=os.path.join(log_dir, "error.log"),
    maxBytes=5 * 1024 * 1024,  # 5MB
    backupCount=3,
    encoding='utf-8'
)
error_file_handler.setFormatter(json_formatter)
error_file_handler.setLevel(logging.ERROR)

# Добавляем все обработчики к логгеру
logger.addHandler(console_handler)
logger.addHandler(file_handler)
logger.addHandler(error_file_handler)

# Отключаем логирование от uvicorn по умолчанию
logging.getLogger("uvicorn").handlers = []
logging.getLogger("uvicorn.access").handlers = []

# ========== СОЗДАНИЕ ПРИЛОЖЕНИЯ ==========
app = FastAPI(
    title="Todo App API",
    version="1.0.0",
    description="Backend для управления задачами с мониторингом",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ========== MIDDLEWARE ==========
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware для логирования запросов и сбора метрик"""
    start_time = time.time()
    
    # Пропускаем метрики и health check
    if request.url.path in ["/metrics", "/health", "/favicon.ico"]:
        response = await call_next(request)
        return response
    
    request_id = f"{int(time.time() * 1000)}_{hash(request.client.host if request.client else 'unknown') % 10000}"
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        status_code = response.status_code
        
        # Логируем успешный запрос
        logger.info(
            "Request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "status_code": status_code,
                "process_time_ms": round(process_time * 1000, 2),
                "client_ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", ""),
                "response_size": len(response.body) if hasattr(response, 'body') else 0
            }
        )
        
        # Обновляем метрики
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status_code=status_code
        ).inc()
        
        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(process_time)
        
        # Добавляем заголовок с временем обработки
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id
        
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        
        # Логируем ошибку
        logger.error(
            f"Request failed: {str(e)}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "process_time_ms": round(process_time * 1000, 2),
                "client_ip": request.client.host if request.client else "unknown",
                "error_type": type(e).__name__,
                "error_message": str(e)
            },
            exc_info=True
        )
        
        raise e

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://frontend:80",
        "http://frontend:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time", "X-Request-ID"]
)

# ========== ЭНДПОИНТЫ ==========
@app.get("/")
async def root():
    """Корневой эндпоинт"""
    logger.info("Root endpoint accessed")
    return {
        "message": "TODO App API",
        "version": "1.0.0",
        "docs": "/docs",
        "metrics": "/metrics",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Health check эндпоинт для мониторинга"""
    health_data = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "todo-backend",
        "uptime": time.time() - app_start_time,
        "database": "connected",  # В реальном приложении проверьте соединение с БД
        "version": "1.0.0"
    }
    logger.debug("Health check performed", extra=health_data)
    return health_data

@app.get("/metrics")
async def metrics():
    """Эндпоинт для метрик Prometheus"""
    logger.debug("Metrics endpoint accessed")
    return Response(
        generate_latest(REGISTRY),
        media_type=CONTENT_TYPE_LATEST,
        headers={"Cache-Control": "no-cache"}
    )

# ========== ПОДКЛЮЧЕНИЕ РОУТЕРОВ ==========
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])

# ========== СОБЫТИЯ ПРИЛОЖЕНИЯ ==========
app_start_time = time.time()

@app.on_event("startup")
async def startup_event():
    """Действия при запуске приложения"""
    try:
        # Создаем таблицы в БД
        Base.metadata.create_all(bind=engine)
        
        logger.info(
            "Application started successfully",
            extra={
                "event": "startup",
                "timestamp": datetime.utcnow().isoformat(),
                "log_dir": log_dir,
                "log_level": "INFO"
            }
        )
        
        # Логируем метрики
        logger.info(
            "Available metrics endpoints",
            extra={
                "metrics_endpoint": "/metrics",
                "health_endpoint": "/health"
            }
        )
        
    except Exception as e:
        logger.critical(
            f"Failed to start application: {str(e)}",
            extra={"event": "startup_failed"},
            exc_info=True
        )
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Действия при остановке приложения"""
    logger.info(
        "Application shutting down",
        extra={
            "event": "shutdown",
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": round(time.time() - app_start_time, 2)
        }
    )

# ========== ОБРАБОТЧИКИ ИСКЛЮЧЕНИЙ ==========
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Обработчик HTTP исключений"""
    logger.warning(
        f"HTTP exception: {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "detail": exc.detail,
            "headers": exc.headers
        }
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Обработчик всех остальных исключений"""
    logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={
            "exception_type": type(exc).__name__,
            "request_url": str(request.url)
        },
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# ========== ЗАПУСК ПРИЛОЖЕНИЯ ==========
if __name__ == "__main__":
    import uvicorn
    
    # Конфигурация uvicorn
    uvicorn_config = {
        "app": "main:app",
        "host": "0.0.0.0",
        "port": 8000,
        "reload": False,  # Отключаем в продакшене
        "log_config": None,  # Используем нашу конфигурацию логирования
        "access_log": False,  # Отключаем access логи uvicorn
        "workers": 1  # Для начала достаточно 1 воркера
    }
    
    logger.info("Starting uvicorn server", extra=uvicorn_config)
    uvicorn.run(**uvicorn_config)