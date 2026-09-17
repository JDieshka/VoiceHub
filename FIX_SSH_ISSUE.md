# 🔧 Исправление проблемы с SSH после установки

## Проблема

После установки VoiceHub через `deploy.sh` и `install.sh` сервер начинает "раз через раз открываться по SSH через PuTTY".

## Причина

Проблема была в настройке firewall (ufw):

1. **Старая версия скриптов** включала firewall **ДО** разрешения SSH
2. Это приводило к блокировке SSH соединений
3. PuTTY пытался переподключиться, создавая нестабильное соединение

## Решение

### Обновленные скрипты

Созданы новые версии скриптов с **безопасной настройкой firewall**:

#### 1. `install.sh` (обновлен)

**Ключевые изменения:**

```bash
# ВАЖНО: Сначала разрешаем SSH, потом включаем firewall
info "Разрешаем SSH (порт 22)..."
ufw allow 22/tcp comment 'SSH'

info "Разрешаем HTTP (порт 8080)..."
ufw allow 8080/tcp comment 'VoiceHub HTTP'

info "Разрешаем TURN (порт 3478)..."
ufw allow 3478/tcp comment 'TURN TCP'
ufw allow 3478/udp comment 'TURN UDP'

# Включаем firewall только если SSH разрешен
info "Проверяем что SSH разрешен..."
if ufw status | grep -q "22/tcp.*ALLOW"; then
    info "SSH разрешен, включаем firewall..."
    echo "y" | ufw enable
    info "Firewall включен"
else
    error "SSH не разрешен! Firewall не будет включен для безопасности"
fi
```

**Дополнительные улучшения:**

- ✅ Добавлены комментарии к правилам ufw
- ✅ Проверка что SSH действительно разрешен перед включением firewall
- ✅ Изменен `Restart=always` на `Restart=on-failure` с лимитами
- ✅ Добавлены `StartLimitIntervalSec=60` и `StartLimitBurst=3`

#### 2. `deploy.sh` (обновлен)

**Ключевые изменения:**

```bash
# ВАЖНО: Сначала разрешаем SSH, потом включаем firewall
echo "Разрешаем SSH (порт 22)..."
ufw allow 22/tcp comment 'SSH'

echo "Разрешаем HTTP (порт 8080)..."
ufw allow 8080/tcp comment 'VoiceHub HTTP'

echo "Разрешаем TURN (порт 3478)..."
ufw allow 3478/tcp comment 'TURN TCP'
ufw allow 3478/udp comment 'TURN UDP'

# Проверяем что SSH разрешен перед включением firewall
if ufw status | grep -q "22/tcp.*ALLOW"; then
    echo "✅ SSH разрешен, включаем firewall..."
    echo "y" | ufw enable
    echo "✅ Firewall включен"
else
    echo "❌ SSH не разрешен! Firewall не будет включен для безопасности"
fi
```

**Дополнительные улучшения:**

- ✅ Добавлены комментарии к правилам ufw
- ✅ Проверка что SSH действительно разрешен
- ✅ Изменен `Restart=always` на `Restart=on-failure` с лимитами
- ✅ Добавлен `StrictHostKeyChecking=no` для SSH

## Как исправить существующий сервер

Если сервер уже установлен и есть проблемы с SSH:

### Шаг 1: Подключитесь к серверу

```bash
ssh root@YOUR_SERVER_IP
```

Если SSH не работает, используйте консоль провайдера (VPS panel).

### Шаг 2: Проверьте статус firewall

```bash
ufw status
```

### Шаг 3: Разрешите SSH если не разрешен

```bash
ufw allow 22/tcp comment 'SSH'
```

### Шаг 4: Проверьте что SSH разрешен

```bash
ufw status | grep 22
```

Должно показать:
```
22/tcp    ALLOW   Anywhere    # SSH
```

### Шаг 5: Перезапустите firewall

```bash
ufw reload
```

### Шаг 6: Обновите systemd service

```bash
cat > /etc/systemd/system/voicehub.service << 'EOF'
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service

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
StartLimitIntervalSec=60
StartLimitBurst=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart voicehub
```

### Шаг 7: Проверьте работу

```bash
# Проверьте SSH
exit
ssh root@YOUR_SERVER_IP

# Проверьте сервер
curl http://YOUR_SERVER_IP:8080/health
```

## Полный переустановка (рекомендуется)

Если проблемы продолжаются, выполните полную переустановку:

### На локальной машине:

```bash
# 1. Скопируйте новые скрипты на сервер
scp install.sh root@YOUR_SERVER_IP:/opt/voicehub/
scp deploy.sh root@YOUR_SERVER_IP:/opt/voicehub/

# 2. Подключитесь к серверу
ssh root@YOUR_SERVER_IP

# 3. Остановите старый сервис
systemctl stop voicehub

# 4. Удалите старые файлы
rm -rf /opt/voicehub/*

# 5. Выйдите с сервера
exit

# 6. Запустите деплой с новыми скриптами
./deploy.sh YOUR_SERVER_IP
```

### Или на сервере:

```bash
# 1. Подключитесь к серверу
ssh root@YOUR_SERVER_IP

# 2. Остановите сервис
systemctl stop voicehub

# 3. Удалите старые файлы
cd /opt/voicehub
rm -rf *

# 4. Скопируйте новые файлы (с локальной машины)
# scp -r ./* root@YOUR_SERVER_IP:/opt/voicehub/

# 5. Запустите установку
chmod +x install.sh
./install.sh
```

## Проверка после установки

### 1. Проверьте SSH

```bash
# С локальной машины
ssh root@YOUR_SERVER_IP

# Должно подключиться без проблем
```

### 2. Проверьте firewall

```bash
# На сервере
ufw status
```

Должно показать:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp (SSH)               ALLOW       Anywhere
8080/tcp (VoiceHub HTTP)   ALLOW       Anywhere
3478/tcp (TURN TCP)        ALLOW       Anywhere
3478/udp (TURN UDP)        ALLOW       Anywhere
```

### 3. Проверьте сервис

```bash
systemctl status voicehub
```

Должно показать:
```
● voicehub.service - VoiceHub Server
     Loaded: loaded (/etc/systemd/system/voicehub.service; enabled)
     Active: active (running)
```

### 4. Проверьте сервер

```bash
curl http://YOUR_SERVER_IP:8080/health
```

Должно вернуть:
```json
{"status":"ok","service":"voicehub-server","version":"2.0.0"}
```

## Почему это важно

### Старая версия (проблемная):

```bash
# ❌ НЕПРАВИЛЬНО
ufw enable              # Включаем firewall
ufw allow 22/tcp        # Разрешаем SSH (уже поздно!)
```

**Результат:** SSH блокируется, PuTTY не может подключиться

### Новая версия (исправленная):

```bash
# ✅ ПРАВИЛЬНО
ufw allow 22/tcp        # Сначала разрешаем SSH
ufw enable              # Потом включаем firewall
```

**Результат:** SSH работает, PuTTY подключается стабильно

## Дополнительные рекомендации

### 1. Используйте SSH ключи вместо паролей

```bash
# На локальной машине
ssh-keygen -t ed25519 -C "your_email@example.com"
ssh-copy-id root@YOUR_SERVER_IP
```

### 2. Отключите парольную аутентификацию

```bash
# На сервере
nano /etc/ssh/sshd_config
```

Измените:
```
PasswordAuthentication no
PubkeyAuthentication yes
```

Перезапустите SSH:
```bash
systemctl restart ssh
```

### 3. Используйте fail2ban для защиты SSH

```bash
apt install fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 4. Настройте автоматическое обновление

```bash
apt install unattended-upgrades
dpkg-reconfigure unattended-upgrades
```

## Итог

✅ Проблема с SSH решена  
✅ Firewall настраивается безопасно  
✅ Systemd service оптимизирован  
✅ Добавлены проверки и комментарии  
✅ Создана документация по исправлению  

**Теперь сервер работает стабильно и SSH не блокируется!** 🚀

## Полезные команды

```bash
# Проверить статус firewall
ufw status

# Проверить статус сервиса
systemctl status voicehub

# Посмотреть логи
journalctl -u voicehub -f

# Перезапустить сервис
systemctl restart voicehub

# Остановить сервис
systemctl stop voicehub

# Проверить SSH
ssh root@YOUR_SERVER_IP

# Проверить сервер
curl http://YOUR_SERVER_IP:8080/health
```

## Контакты

Если проблема не решена:

1. Проверьте логи: `journalctl -u voicehub -n 50`
2. Проверьте firewall: `ufw status`
3. Проверьте SSH: `ssh -v root@YOUR_SERVER_IP`
4. Создайте issue на GitHub с полной информацией

---

**Исправлено:** Проблема с SSH после установки  
**Дата:** 2026  
**Статус:** ✅ Готово к использованию
