# Этап сборки
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --fetch-timeout=300000 --fetch-retries=3
COPY . .
RUN npm run build

# Этап production
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80 (исправлено)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]