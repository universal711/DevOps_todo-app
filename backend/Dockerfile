#Используем официальный образ Python
FROM python:3.11-alpine

#Устанавливаем рабочую дирректорию
WORKDIR /app

#Копируем зависимости
COPY requirements.txt .

# Устанавливаем зависимости c повтором при таймауте
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt --timeout 100 --retries 5

#Копируем исхоодный код
COPY . .

#Создаём непривилегированного пользователя (для безопасности)
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser /app
USER appuser

#Открываем порт( в нашем случае 3000)
EXPOSE 8000

#Команда для запуска приложения
CMD ["python", "main.py"]