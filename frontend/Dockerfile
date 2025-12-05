# Этап сборки
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --fetch-timeout=300000 --fetch-retries=3
COPY . .
RUN npm run build

# Этап production
FROM nginx:alpine

# Создаем директории для логов внутри контейнера
RUN mkdir -p /var/log/frontend/nginx && \
    touch /var/log/frontend/nginx/access.log && \
    touch /var/log/frontend/nginx/error.log && \
    chown -R nginx:nginx /var/log/frontend && \
    chmod -R 777 /var/log/frontend  # Даем полные права

# Копируем собранное приложение
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]