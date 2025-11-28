from prometheus_client import Counter, Histogram

# Создаем метрики
REQUEST_COUNT = Counter('request_count', 'App Request Count', ['method', 'endpoint', 'status_code'])
REQUEST_LATENCY = Histogram('request_latency_seconds', 'Request latency', ['method', 'endpoint'])
TASK_CREATED = Counter('tasks_created_total', 'Total tasks created')
TASK_COMPLETED = Counter('tasks_completed_total', 'Total tasks completed')