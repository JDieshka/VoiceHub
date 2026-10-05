# 🔧 Решение проблемы "Failed to fetch"

## Проблема

При вводе адреса сервера появляется ошибка:
```
Не удалось подключиться к серверу: Failed to fetch
```

## Быстрая проверка

### 1. Проверьте, что сервер запущен

```bash
# На сервере
curl http://localhost:8080/health
```

Должно вернуть:
```json
{"status":"ok","service":"voicehub-server","version":"2.0.0","time":"..."}
```

### 2. Проверьте firewall

```bash
# На сервере
ufw allow 8080/tcp
ufw reload
```

### 3. Проверьте URL

Убедитесь, что вводите правильный URL:
- ✅ `http://localhost:8080` (локально)
- ✅ `http://192.168.1.100:8080` (локальная сеть)
- ✅ `http://45.67.89.123:8080` (VPS)
- ❌ `http://45.67.89.123` (нет порта)

### 4. Откройте консоль браузера

1. Нажмите F12 (DevTools)
2. Перейдите на вкладку Console
3. Попробуйте подключиться к серверу
4. Посмотрите на ошибки

Должны быть логи:
```
[ServerSelection] Checking server: http://your-server:8080/health
[ServerSelection] Response status: 200
```

## Частые причины

### Сервер не запущен

```bash
# Запустите сервер
systemctl start voicehub

# Или вручную
cd /opt/voicehub/server
./voicehub-server
```

### Firewall блокирует порт

```bash
# Откройте порт
ufw allow 8080/tcp
ufw reload
```

### Неправильный URL

- Убедитесь, что указан порт (по умолчанию 8080)
- Убедитесь, что указан протокол (http:// или https://)
- Проверьте, что IP/домен правильный

### CORS проблемы

CORS уже настроен на сервере. Если проблема сохраняется, проверьте логи:
```bash
journalctl -u voicehub -f
```

## Подробная диагностика

Смотрите **[TROUBLESHOOTING_CONNECTION.md](./TROUBLESHOOTING_CONNECTION.md)** для полной инструкции по диагностике.

## Быстрые команды

```bash
# Проверить сервер
curl http://localhost:8080/health

# Перезапустить сервер
systemctl restart voicehub

# Проверить логи
journalctl -u voicehub -f

# Открыть порт
ufw allow 8080/tcp

# Проверить порт
netstat -tuln | grep 8080
```

## Если ничего не помогло

1. Проверьте консоль браузера (F12)
2. Проверьте логи сервера
3. Убедитесь, что сервер запущен
4. Проверьте firewall
5. Проверьте URL

**Удачи!** 🚀
