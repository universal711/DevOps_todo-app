# Инструкция по настройке сервера для деплоя

## 1. Подготовка сервера

```bash
# На сервере:
sudo apt update
sudo apt install -y docker.io docker-compose git

# Настройка Docker без sudo
sudo usermod -aG docker $USER
newgrp docker

# Создание директории проекта
mkdir -p /opt/todo-app
cd /opt/todo-app
