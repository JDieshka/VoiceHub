# ⚡ Быстрое решение проблемы подключения

## Проблема

Desktop приложение показывает:
```
Не удалось подключиться к серверу
```

## Быстрая диагностика (выполните на сервере)

```bash
# 1. Проверьте что сервис запущен
sudo systemctl status voicehub

# 2. Проверьте что порт слушается
sudo netstat -tuln | grep 8080

# 3. Проверьте API локально
curl http://localhost:8080/health

# 4. Проверьте firewall
sudo ufw status | grep 8080
```

## Решение за 3 шага

### Шаг 1: Перезапустите сервис

```bash
sudo systemctl restart voicehub
sudo systemctl status voicehub
```

### Шаг 2: Проверьте порт

```bash
sudo netstat -tuln | grep 8080
```

**Должно показать:** `0.0.0.0:8080` (НЕ `127.0.0.1:8080`)

Если показывает `127.0.0.1:8080`:
```bash
sudo nano /etc/systemd/system/voicehub.service
```

Убедитесь что есть строка:
```ini
Environment="PORT=8080"
```

Затем:
```bash
sudo systemctl daemon-reload
sudo systemctl restart voicehub
```

### Шаг 3: Откройте порт в firewall

```bash
sudo ufw allow 8080/tcp
sudo ufw reload
```

## Проверка с вашего ПК

```bash
# Проверьте доступность
curl http://YOUR_SERVER_IP:8080/health

# Должно вернуть JSON
```

## В desktop приложении

Вводите URL **БЕЗ** `http://` и **БЕЗ** порта:
```
Правильно: 192.168.1.100
Неправильно: http://192.168.1.100:8080
```

Приложение автоматически добавит протокол и порт.

## Если не помогло

Запустите полную диагностику:
```bash
sudo ./server-diagnostic.sh
```

Подробная инструкция: [FIX_CONNECTION_ISSUE.md](./FIX_CONNECTION_ISSUE.md)
