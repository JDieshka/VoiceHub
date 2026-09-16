# 🚀 Развертывание на сервере 31.77.158.177

## ✅ Универсальная конфигурация

Приложение автоматически определит URL сервера. Вам не нужно указывать IP адрес вручную!

---

## 📋 Инструкция

### Шаг 1: Подключитесь к серверу

```bash
ssh root@31.77.158.177
```

### Шаг 2: Перейдите в директорию проекта

```bash
cd /opt/voicehub
```

### Шаг 3: Соберите фронтенд

```bash
npm run build
```

### Шаг 4: Запустите preview сервер

```bash
npm run preview -- --host 0.0.0.0 --port 3000
```

### Шаг 5: Откройте приложение

В браузере откройте: **http://31.77.158.177:3000**

Приложение автоматически подключится к **http://31.77.158.177:8080**

---

## 🔧 Если нужно указать URL вручную

Создайте файл `.env`:

```bash
cat > .env << EOF
VITE_API_URL=http://31.77.158.177:8080
VITE_WS_URL=ws://31.77.158.177:8080/ws
EOF
```

Затем пересоберите:

```bash
npm run build
```

---

## 🐳 Развертывание с Docker

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://voicehub:VoiceHub2024SecurePass@db:5432/voicehub
      - JWT_SECRET=VoiceHub2024SuperSecretJWTKey
    depends_on:
      - db
  
  frontend:
    build: .
    ports:
      - "3000:80"
    # Не нужно указывать URL - приложение само определит
    depends_on:
      - backend
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=voicehub
      - POSTGRES_PASSWORD=VoiceHub2024SecurePass
      - POSTGRES_DB=voicehub
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Запуск

```bash
docker-compose up -d
```

### Доступ

Откройте: **http://31.77.158.177:3000**

---

## 🌐 Развертывание с Nginx

### Установите Nginx

```bash
apt update
apt install nginx
```

### Создайте конфигурацию

```bash
cat > /etc/nginx/sites-available/voicehub << EOF
server {
    listen 80;
    server_name 31.77.158.177;
    
    # Фронтенд
    location / {
        root /opt/voicehub/dist;
        try_files \$uri \$uri/ /index.html;
    }
    
    # API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }
}
EOF
```

### Активируйте конфигурацию

```bash
ln -s /etc/nginx/sites-available/voicehub /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Доступ

Откройте: **http://31.77.158.177**

Приложение автоматически подключится к **http://31.77.158.177:8080**

---

## 🔒 Развертывание с HTTPS

### Установите Certbot

```bash
apt install certbot python3-certbot-nginx
```

### Получите SSL сертификат

```bash
certbot --nginx -d 31.77.158.177
```

**Примечание:** Для SSL нужен домен, не IP адрес.

### С доменом

```bash
# Получите домен (например, voicehub.example.com)
# Настройте DNS запись на 31.77.158.177

certbot --nginx -d voicehub.example.com
```

### Создайте .env файл

```bash
cat > /opt/voicehub/.env << EOF
VITE_API_URL=https://voicehub.example.com
VITE_WS_URL=wss://voicehub.example.com/ws
EOF
```

### Пересоберите

```bash
cd /opt/voicehub
npm run build
```

### Доступ

Откройте: **https://voicehub.example.com**

---

## 📊 Проверка работы

### Проверьте бэкенд

```bash
curl http://localhost:8080/health
```

Должно вернуть:
```json
{"status":"ok","service":"voicehub-server","version":"2.0.0"}
```

### Проверьте фронтенд

```bash
curl http://localhost:3000
```

Должно вернуть HTML страницу.

### Проверьте в браузере

1. Откройте http://31.77.158.177:3000
2. Откройте DevTools (F12)
3. Перейдите на вкладку Console
4. Должны быть логи:
   ```
   [Auth] API_BASE: http://31.77.158.177:8080
   [WS] Connecting to: ws://31.77.158.177:8080/ws
   ```

---

## 🐛 Решение проблем

### Проблема: Не подключается к серверу

**Решение:**
```bash
# Проверьте что бэкенд запущен
systemctl status voicehub

# Проверьте что порт открыт
ufw allow 8080/tcp
ufw allow 3000/tcp
```

### Проблема: Не определяется URL

**Решение:**
Создайте `.env` файл с явным указанием URL:
```bash
cat > .env << EOF
VITE_API_URL=http://31.77.158.177:8080
VITE_WS_URL=ws://31.77.158.177:8080/ws
EOF

npm run build
```

### Проблема: CORS ошибки

**Решение:**
Проверьте CORS настройки в `server/main.go`:
```go
mux.Use(func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        next.ServeHTTP(w, r)
    })
})
```

---

## 📝 Итоговая проверка

- ✅ Бэкенд запущен на порту 8080
- ✅ Фронтенд запущен на порту 3000
- ✅ Приложение доступно по http://31.77.158.177:3000
- ✅ Автоматически подключается к http://31.77.158.177:8080
- ✅ Не нужно указывать IP адрес вручную

---

## 🎉 Готово!

Приложение развернуто и работает с универсальной конфигурацией!

**Доступ:** http://31.77.158.177:3000

**Приложение автоматически определило URL сервера!** 🚀
