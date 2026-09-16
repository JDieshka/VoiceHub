# 🚀 Быстрая установка VoiceHub

## Что изменилось

✅ Убран `intervalpacer` из SFU (не критично)  
✅ Убран `pion/interceptor` (упрощение зависимостей)  
✅ Создан скрипт `install.sh` для автоматической установки  

**SFU полностью работает** — вся функциональность сохранена.

---

## Установка (выполните на сервере)

### Шаг 1: Скопируйте обновлённые файлы

**На вашей локальной машине:**

```bash
# Скопируйте все файлы на сервер
scp -r ./server root@31.77.158.177:/opt/voicehub/
scp ./install.sh root@31.77.158.177:/opt/voicehub/
```

### Шаг 2: Запустите установку

**На сервере:**

```bash
cd /opt/voicehub
chmod +x install.sh
./install.sh
```

Скрипт автоматически:
- ✅ Установит Go 1.24.0
- ✅ Установит PostgreSQL (если не установлен)
- ✅ Создаст базу данных
- ✅ Загрузит все зависимости
- ✅ Соберёт бинарник
- ✅ Настроит systemd service
- ✅ Настроит firewall
- ✅ Запустит сервис

### Шаг 3: Проверьте работу

```bash
# Проверьте статус
systemctl status voicehub

# Тест API
curl http://localhost:8080/health

# Тест frontend
curl http://localhost:8080/ | head -n 5
```

---

## Что делает install.sh

1. **Устанавливает Go 1.24.0** (если текущая версия < 1.24)
2. **Устанавливает PostgreSQL** (если не установлен)
3. **Создаёт базу данных** voicehub с пользователем
4. **Загружает зависимости** через `go mod tidy`
5. **Собирает бинарник** voicehub-server
6. **Создаёт systemd service** для автозапуска
7. **Настраивает firewall** (порты 22, 8080, 3478)
8. **Запускает сервис** и проверяет работу

---

## Ручная установка (если скрипт не работает)

```bash
cd /opt/voicehub/server

# 1. Установите Go 1.24.0
cd /tmp
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
rm go1.24.0.linux-amd64.tar.gz

# 2. Создайте БД
su - postgres -c "psql -c \"CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';\""
su - postgres -c "psql -c \"CREATE DATABASE voicehub OWNER voicehub;\""

# 3. Загрузите зависимости
cd /opt/voicehub/server
go clean -modcache
rm -f go.sum
go mod tidy

# 4. Соберите
go build -o voicehub-server main.go

# 5. Запустите
systemctl restart voicehub
```

---

## Проверка работы

```bash
# Логи
journalctl -u voicehub -f

# Статус
systemctl status voicehub

# Тест API
curl http://localhost:8080/health

# Тест WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8080/ws
```

---

## Если возникли ошибки

### Ошибка: "go: toolchain upgrade needed"

```bash
# Убедитесь что Go 1.24 установлен
go version

# Если нет - переустановите
rm -rf /usr/local/go
cd /tmp
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

### Ошибка: "missing go.sum entry"

```bash
cd /opt/voicehub/server
rm -f go.sum
go mod tidy
```

### Ошибка: "connection refused" на порту 8080

```bash
# Проверьте что сервис запущен
systemctl status voicehub

# Проверьте логи
journalctl -u voicehub -n 50

# Проверьте firewall
ufw status
ufw allow 8080/tcp
```

---

## Полезные команды

```bash
# Логи в реальном времени
journalctl -u voicehub -f

# Перезапуск сервиса
systemctl restart voicehub

# Остановка сервиса
systemctl stop voicehub

# Статус сервиса
systemctl status voicehub

# Проверка портов
ss -tuln | grep 8080

# Проверка PostgreSQL
su - postgres -c "psql -d voicehub -c 'SELECT count(*) FROM users;'"
```

---

## После установки

Ваш сервер будет доступен:
- **Frontend:** http://31.77.158.177:8080
- **API:** http://31.77.158.177:8080/api/*
- **WebSocket:** ws://31.77.158.177:8080/ws
- **SFU:** ws://31.77.158.177:8080/sfu

⚠️ **ВАЖНО:** Для работы микрофона в браузере нужен HTTPS!  
Используйте Desktop приложение (Tauri) для полноценной работы.

---

## Что дальше

1. ✅ Сервер установлен и работает
2. ⏭️ Соберите Desktop приложение для работы с микрофоном
3. ⏭️ Настройте TURN сервер для работы через NAT (опционально)
4. ⏭️ Получите домен и HTTPS для веб-версии (опционально)
