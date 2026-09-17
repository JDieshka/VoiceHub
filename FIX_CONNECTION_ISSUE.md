# 🔧 Решение проблемы "Не удалось подключиться к серверу"

## Проблема

При вводе IP адреса сервера в desktop-приложении появляется ошибка:
```
Не удалось подключиться к серверу. Возможные причины:
• Сервер не запущен
• Неверный адрес
• Проблемы с сетью
• CORS не настроен на сервере
```

## Диагностика

### Шаг 1: Запустите скрипт диагностики на сервере

```bash
# Скопируйте скрипт на сервер
scp server-diagnostic.sh root@YOUR_SERVER_IP:/opt/VoiceHub/

# На сервере
cd /opt/VoiceHub
chmod +x server-diagnostic.sh
sudo ./server-diagnostic.sh
```

Скрипт проверит:
- ✅ Статус сервиса
- ✅ Прослушиваемые порты
- ✅ Доступность API локально и извне
- ✅ Настройки firewall
- ✅ CORS заголовки
- ✅ Состояние базы данных
- ✅ Последние логи

### Шаг 2: Проверьте вручную

#### 2.1 Проверьте что сервис запущен

```bash
sudo systemctl status voicehub
```

**Должно показать:**
```
● voicehub.service - VoiceHub Server
   Active: active (running)
```

**Если не запущен:**
```bash
sudo systemctl start voicehub
```

#### 2.2 Проверьте что порт 8080 слушается

```bash
sudo netstat -tuln | grep 8080
# или
sudo ss -tuln | grep 8080
```

**Должно показать:**
```
tcp   LISTEN   0   100   0.0.0.0:8080   0.0.0.0:*
```

**ВАЖНО:** Должно быть `0.0.0.0:8080`, а НЕ `127.0.0.1:8080`!

Если видите `127.0.0.1:8080` - сервер слушает только локально и недоступен извне.

#### 2.3 Проверьте API локально

```bash
curl http://localhost:8080/health
```

**Должно вернуть:**
```json
{"status":"ok","service":"voicehub-server","version":"2.0.0","time":"..."}
```

#### 2.4 Проверьте API извне

С вашего ПК (не с сервера):
```bash
curl http://YOUR_SERVER_IP:8080/health
```

**Должно вернуть тот же JSON.**

Если не работает - проблема с firewall или сетью.

#### 2.5 Проверьте firewall

```bash
sudo ufw status
```

**Должно показать:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp (SSH)               ALLOW       Anywhere
8080/tcp (VoiceHub HTTP)   ALLOW       Anywhere
```

**Если порт 8080 не разрешен:**
```bash
sudo ufw allow 8080/tcp
sudo ufw reload
```

#### 2.6 Проверьте CORS

```bash
curl -I http://localhost:8080/health | grep -i access-control
```

**Должно показать:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Решение проблем

### Проблема 1: Сервис не запущен

**Симптом:**
```bash
sudo systemctl status voicehub
# Показывает: inactive (dead)
```

**Решение:**
```bash
sudo systemctl start voicehub
sudo systemctl enable voicehub  # Автозапуск при загрузке
```

**Проверьте логи:**
```bash
sudo journalctl -u voicehub -n 50
```

### Проблема 2: Сервер слушает только на localhost

**Симптом:**
```bash
sudo netstat -tuln | grep 8080
# Показывает: 127.0.0.1:8080
```

**Решение:**

Откройте файл service:
```bash
sudo nano /etc/systemd/system/voicehub.service
```

Убедитесь что в секции `[Service]` есть:
```ini
Environment="PORT=8080"
```

Перезапустите:
```bash
sudo systemctl daemon-reload
sudo systemctl restart voicehub
```

Проверьте снова:
```bash
sudo netstat -tuln | grep 8080
# Должно показать: 0.0.0.0:8080
```

### Проблема 3: Firewall блокирует порт

**Симптом:**
- API работает локально (`curl http://localhost:8080/health`)
- API не работает извне (`curl http://YOUR_SERVER_IP:8080/health`)

**Решение:**
```bash
# Проверьте статус firewall
sudo ufw status

# Разрешите порт 8080
sudo ufw allow 8080/tcp

# Перезагрузите firewall
sudo ufw reload

# Проверьте снова
sudo ufw status
```

**Если используете iptables:**
```bash
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

### Проблема 4: Порт не открыт на VPS

**Симптом:**
- Firewall настроен правильно
- API всё равно недоступен извне

**Решение:**

Проверьте настройки VPS в панели управления провайдера:
- Откройте порт 8080 в Security Groups (AWS)
- Откройте порт 8080 в Firewall Rules (DigitalOcean)
- Откройте порт 8080 в Network Settings (Hetzner)

### Проблема 5: CORS не настроен

**Симптом:**
В консоли браузера (F12) видны ошибки CORS:
```
Access to fetch at 'http://...' from origin '...' has been blocked by CORS policy
```

**Решение:**

Проверьте что в `server/main.go` есть CORS middleware:

```go
// CORS middleware
corsMiddleware := func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}
```

Пересоберите и перезапустите:
```bash
cd /opt/VoiceHub/server
go build -o voicehub-server main.go
sudo systemctl restart voicehub
```

### Проблема 6: Desktop приложение использует неправильный URL

**Симптом:**
- API работает из браузера
- Desktop приложение не подключается

**Решение:**

В desktop приложении вводите URL БЕЗ `http://` и БЕЗ порта:
```
Правильно: YOUR_SERVER_IP
Неправильно: http://YOUR_SERVER_IP:8080
```

Приложение автоматически добавит протокол и порт.

**Или введите полный URL:**
```
http://YOUR_SERVER_IP:8080
```

### Проблема 7: Tauri HTTP API не работает

**Симптом:**
- Веб-версия работает
- Desktop приложение не подключается

**Решение:**

Проверьте что в `src-tauri/tauri.conf.json` есть разрешения:

```json
{
  "tauri": {
    "allowlist": {
      "http": {
        "all": true,
        "request": true,
        "scope": ["http://**", "https://**"]
      }
    }
  }
}
```

Пересоберите desktop приложение:
```bash
cd src-tauri
cargo tauri build
```

---

## Полная проверка

Выполните все команды и убедитесь что всё работает:

```bash
# 1. Сервис запущен
sudo systemctl status voicehub

# 2. Порт слушается на 0.0.0.0
sudo netstat -tuln | grep 8080

# 3. API работает локально
curl http://localhost:8080/health

# 4. Firewall разрешает порт
sudo ufw status | grep 8080

# 5. API работает извне (с вашего ПК)
curl http://YOUR_SERVER_IP:8080/health
```

**Все 5 проверок должны пройти успешно!**

---

## Быстрое решение (копипаст)

Если не хотите разбираться, выполните эти команды на сервере:

```bash
# Остановите сервис
sudo systemctl stop voicehub

# Убедитесь что порт свободен
sudo fuser -k 8080/tcp 2>/dev/null || true

# Проверьте что бинарник существует
ls -lh /opt/VoiceHub/server/voicehub-server

# Пересоберите если нужно
cd /opt/VoiceHub/server
go build -o voicehub-server main.go
chmod +x voicehub-server

# Проверьте конфигурацию service
cat /etc/systemd/system/voicehub.service | grep -E "(PORT|ExecStart)"

# Перезагрузите и запустите
sudo systemctl daemon-reload
sudo systemctl start voicehub

# Проверьте статус
sudo systemctl status voicehub

# Проверьте порты
sudo netstat -tuln | grep 8080

# Проверьте API
curl http://localhost:8080/health

# Разрешите порт в firewall
sudo ufw allow 8080/tcp
sudo ufw reload

# Проверьте извне
curl http://YOUR_SERVER_IP:8080/health
```

---

## Логи для отладки

Если ничего не помогает, соберите полную информацию:

```bash
# На сервере
echo "=== Статус сервиса ==="
sudo systemctl status voicehub

echo ""
echo "=== Последние логи ==="
sudo journalctl -u voicehub -n 50

echo ""
echo "=== Порты ==="
sudo netstat -tuln | grep -E "(8080|5432)"

echo ""
echo "=== Firewall ==="
sudo ufw status

echo ""
echo "=== Тест API ==="
curl -v http://localhost:8080/health

echo ""
echo "=== IP сервера ==="
hostname -I
```

Скопируйте вывод и пришлите для анализа.

---

## Проверка с клиента

С вашего ПК выполните:

```bash
# Проверьте доступность порта
telnet YOUR_SERVER_IP 8080

# Или
nc -zv YOUR_SERVER_IP 8080

# Проверьте API
curl -v http://YOUR_SERVER_IP:8080/health

# Проверьте CORS
curl -H "Origin: http://localhost" -I http://YOUR_SERVER_IP:8080/health | grep -i access-control
```

---

## Итог

После выполнения всех шагов:

✅ Сервис запущен  
✅ Порт 8080 слушается на 0.0.0.0  
✅ API отвечает локально  
✅ API отвечает извне  
✅ Firewall разрешает порт 8080  
✅ CORS настроен  

**Desktop приложение должно подключиться!**

Введите в приложении:
```
YOUR_SERVER_IP
```

Или:
```
http://YOUR_SERVER_IP:8080
```

---

## Полезные ссылки

- [Полная инструкция по развертыванию](./DEPLOY_STEP_BY_STEP.md)
- [Быстрое развертывание](./QUICK_DEPLOY.md)
- [Исправление зависимостей](./FIX_DEPENDENCIES.md)
