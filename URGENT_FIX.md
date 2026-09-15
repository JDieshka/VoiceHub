# 🚨 Срочное исправление сервера

## Что произошло

После запуска `deploy.sh` сервер не отвечает на http://31.77.158.177:8080

**Причины:**
1. Backend возможно не запустился
2. Frontend собран, но не раздаётся (нужен Nginx или встроенный сервер)
3. Firewall может блокировать порты

---

## ✅ Быстрое решение (2 минуты)

### Шаг 1: Скопируйте новые файлы на сервер

**На вашей ЛОКАЛЬНОЙ машине:**

```bash
# Скопируйте исправленные файлы
scp ./server/main.go root@31.77.158.177:/opt/voicehub/server/
scp ./fix.sh root@31.77.158.177:/opt/voicehub/
scp ./diagnose.sh root@31.77.158.177:/opt/voicehub/
```

### Шаг 2: Запустите исправление

**На СЕРВЕРЕ (подключитесь по SSH):**

```bash
ssh root@31.77.158.177

cd /opt/voicehub
chmod +x fix.sh
./fix.sh
```

Скрипт автоматически:
- ✅ Проверит PostgreSQL
- ✅ Пересоберёт frontend
- ✅ Пересоберёт backend (с раздачей frontend)
- ✅ Настроит firewall
- ✅ Запустит сервис

### Шаг 3: Проверьте работу

Откройте в браузере: **http://31.77.158.177:8080**

Должна открыться страница VoiceHub!

---

## 🔍 Если не помогло

### Диагностика

```bash
cd /opt/voicehub
chmod +x diagnose.sh
./diagnose.sh
```

### Ручная проверка

```bash
# 1. Проверьте что сервис запущен
systemctl status voicehub

# 2. Проверьте логи
journalctl -u voicehub -n 50

# 3. Проверьте порты
ss -tuln | grep 8080

# 4. Тест API
curl http://localhost:8080/health

# 5. Тест frontend
curl http://localhost:8080/
```

---

## 🐛 Частые проблемы

### Проблема 1: "voicehub-server: no such file"

**Решение:**
```bash
cd /opt/voicehub/server
export PATH=$PATH:/usr/local/go/bin
go build -o voicehub-server main.go
systemctl restart voicehub
```

---

### Проблема 2: "connection refused" на порту 8080

**Решение:**
```bash
# Проверьте что сервис запущен
systemctl status voicehub

# Если не запущен - запустите
systemctl start voicehub

# Проверьте что порт слушается
ss -tuln | grep 8080

# Если порт не слушается - посмотрите логи
journalctl -u voicehub -n 50
```

---

### Проблема 3: Порт 8080 не доступен извне

**Решение:**
```bash
# 1. Проверьте ufw
ufw status
ufw allow 8080/tcp

# 2. Проверьте firewall провайдера
# Зайдите в панель управления хостинга
# Откройте порт 8080 (TCP inbound)
```

---

### Проблема 4: Frontend не открывается (виден JSON вместо HTML)

**Решение:**
```bash
# Пересоберите backend (он теперь раздаёт frontend)
cd /opt/voicehub/server
export PATH=$PATH:/usr/local/go/bin
go build -o voicehub-server main.go

# Перезапустите
systemctl restart voicehub

# Проверьте
curl http://localhost:8080/
# Должен вернуть HTML, а не JSON
```

---

## 📋 Полная переустановка

Если ничего не помогает:

```bash
# На СЕРВЕРЕ
cd /opt/voicehub

# Остановите сервис
systemctl stop voicehub

# Удалите старые файлы (кроме конфигурации)
rm -rf server/src server/main.go server/go.sum
rm -rf src dist node_modules

# Скопируйте заново с локальной машины
# (на локальной машине):
scp -r ./server root@31.77.158.177:/opt/voicehub/
scp -r ./src root@31.77.158.177:/opt/voicehub/
scp ./package.json root@31.77.158.177:/opt/voicehub/
scp ./index.html root@31.77.158.177:/opt/voicehub/

# На СЕРВЕРЕ
cd /opt/voicehub

# Frontend
npm install
npm run build

# Backend
cd server
export PATH=$PATH:/usr/local/go/bin
go mod download
go build -o voicehub-server main.go

# Запуск
systemctl start voicehub

# Проверка
systemctl status voicehub
curl http://localhost:8080/health
```

---

## 🆘 Если всё ещё не работает

Выполните на сервере:

```bash
# Диагностика
cd /opt/voicehub
./diagnose.sh > /tmp/diagnose.txt 2>&1

# Логи
journalctl -u voicehub -n 100 > /tmp/voicehub.log 2>&1

# Порты
ss -tuln > /tmp/ports.txt 2>&1

# Отправьте мне эти файлы
```

Или просто скопируйте вывод команд:

```bash
echo "=== Диагностика ==="
./diagnose.sh

echo ""
echo "=== Логи ==="
journalctl -u voicehub -n 30

echo ""
echo "=== Порты ==="
ss -tuln | grep -E "8080|5432"

echo ""
echo "=== Статус ==="
systemctl status voicehub --no-pager
```

---

## ✅ Что должно работать после исправления

1. **http://31.77.158.177:8080** — главная страница (frontend)
2. **http://31.77.158.177:8080/health** — проверка API (JSON)
3. **ws://31.77.158.177:8080/ws** — WebSocket для P2P
4. **ws://31.77.158.177:8080/sfu** — WebSocket для SFU

---

## 📞 Быстрая помощь

Если нужна срочная помощь, выполните:

```bash
# На СЕРВЕРЕ
cd /opt/voicehub
chmod +x fix.sh
./fix.sh
```

Это автоматически исправит большинство проблем!
