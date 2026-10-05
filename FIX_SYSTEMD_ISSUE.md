# 🔧 Исправление проблемы с systemd service

## Проблема

В логах `journalctl -u voicehub -n 50` видны ошибки:

```
Unknown key 'StartLimitIntervalSec' in section [Service], ignoring.
Failed to locate executable /opt/voicehub/server/voicehub-server: No such file or directory
```

## Причины

1. **`StartLimitIntervalSec` в неправильной секции** - должен быть в `[Unit]`, а не в `[Service]`
2. **Бинарник не найден** - файл `/opt/voicehub/server/voicehub-server` не существует

## Решение

### Вариант 1: Автоматическое исправление (рекомендуется)

```bash
# На сервере
cd /opt/voicehub
chmod +x diagnose-fix.sh
sudo ./diagnose-fix.sh
```

Скрипт автоматически:
- ✅ Проверит структуру проекта
- ✅ Проверит Go
- ✅ Соберет бинарник если его нет
- ✅ Исправит конфигурацию systemd service
- ✅ Проверит PostgreSQL
- ✅ Запустит сервис
- ✅ Протестирует API

### Вариант 2: Ручное исправление

#### Шаг 1: Исправить systemd service

```bash
# На сервере
sudo nano /etc/systemd/system/voicehub.service
```

Замените содержимое на:

```ini
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=root
WorkingDirectory=/opt/voicehub/server
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
Environment="DATABASE_URL=postgres://voicehub:VoiceHub2024SecurePass@localhost:5432/voicehub?sslmode=disable"
Environment="JWT_SECRET=VoiceHub2024SuperSecretJWTKeyChangeThisInProduction88!"
Environment="PORT=8080"
Environment="MODE=hybrid"
Environment="ALLOWED_ORIGINS=*"
ExecStart=/opt/voicehub/server/voicehub-server
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Важно:** `StartLimitIntervalSec` и `StartLimitBurst` должны быть в секции `[Unit]`, а не в `[Service]`!

#### Шаг 2: Перезагрузить systemd

```bash
sudo systemctl daemon-reload
```

#### Шаг 3: Собрать бинарник

```bash
cd /opt/voicehub/server

# Убедитесь что Go в PATH
export PATH=$PATH:/usr/local/go/bin

# Загрузите зависимости
go mod tidy

# Соберите бинарник
go build -o voicehub-server main.go

# Сделайте исполняемым
chmod +x voicehub-server

# Проверьте что бинарник создан
ls -lh voicehub-server
```

#### Шаг 4: Запустить сервис

```bash
# Сбросить счетчик перезапусков
sudo systemctl reset-failed voicehub

# Запустить сервис
sudo systemctl start voicehub

# Проверить статус
sudo systemctl status voicehub
```

#### Шаг 5: Проверить работу

```bash
# Проверить логи
sudo journalctl -u voicehub -f

# В другом терминале проверить API
curl http://localhost:8080/health
```

Должно вернуть:
```json
{"status":"ok","service":"voicehub-server","version":"2.0.0","time":"..."}
```

### Вариант 3: Полная переустановка

Если ничего не помогло, выполните полную переустановку:

```bash
# На сервере
cd /opt/voicehub

# Удалить старый сервис
sudo systemctl stop voicehub
sudo rm -f /etc/systemd/system/voicehub.service
sudo systemctl daemon-reload

# Удалить бинарник
rm -f server/voicehub-server

# Скопировать новые скрипты с локальной машины
# (на локальной машине)
scp install.sh root@YOUR_SERVER_IP:/opt/voicehub/
scp diagnose-fix.sh root@YOUR_SERVER_IP:/opt/voicehub/

# На сервере
chmod +x install.sh diagnose-fix.sh
sudo ./diagnose-fix.sh
```

## Проверка после исправления

```bash
# Проверить статус сервиса
sudo systemctl status voicehub

# Должно показать:
# ● voicehub.service - VoiceHub Server
#      Active: active (running)

# Проверить логи
sudo journalctl -u voicehub -n 20

# Должны быть логи запуска без ошибок

# Проверить API
curl http://YOUR_SERVER_IP:8080/health

# Должно вернуть JSON с status: ok
```

## Частые проблемы

### Проблема: "Failed to locate executable"

**Причина:** Бинарник не собран или находится в другом месте

**Решение:**
```bash
cd /opt/voicehub/server
export PATH=$PATH:/usr/local/go/bin
go build -o voicehub-server main.go
chmod +x voicehub-server
```

### Проблема: "Unknown key 'StartLimitIntervalSec'"

**Причина:** Параметр в неправильной секции

**Решение:** Переместите `StartLimitIntervalSec` и `StartLimitBurst` в секцию `[Unit]`

### Проблема: Сервис постоянно перезапускается

**Причина:** Ошибка в коде или конфигурации

**Решение:**
```bash
# Посмотреть логи
sudo journalctl -u voicehub -n 50

# Запустить вручную для диагностики
cd /opt/voicehub/server
./voicehub-server
```

### Проблема: "connection refused" на порту 8080

**Причина:** Сервис не запущен или firewall блокирует

**Решение:**
```bash
# Проверить что сервис запущен
sudo systemctl status voicehub

# Проверить firewall
sudo ufw status
sudo ufw allow 8080/tcp
```

## Полезные команды

```bash
# Просмотр логов в реальном времени
sudo journalctl -u voicehub -f

# Последние 50 строк логов
sudo journalctl -u voicehub -n 50

# Перезапуск сервиса
sudo systemctl restart voicehub

# Остановка сервиса
sudo systemctl stop voicehub

# Запуск сервиса
sudo systemctl start voicehub

# Статус сервиса
sudo systemctl status voicehub

# Сброс счетчика перезапусков
sudo systemctl reset-failed voicehub

# Проверка конфигурации service
sudo systemctl cat voicehub

# Проверка порта
sudo netstat -tulpn | grep 8080
```

## Итог

После исправления:
- ✅ Systemd service настроен правильно
- ✅ Бинарник собран и исполняемый
- ✅ Сервис запускается без ошибок
- ✅ API отвечает на запросы

**Сервер готов к использованию!** 🚀
