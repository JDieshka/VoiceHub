# 🔧 Быстрое исправление SSH проблемы

## Проблема

После установки VoiceHub SSH работает нестабильно через PuTTY.

## Причина

Firewall (ufw) включался **ДО** разрешения SSH порта.

## Быстрое решение

### На сервере выполните:

```bash
# 1. Подключитесь к серверу (если SSH работает)
ssh root@YOUR_SERVER_IP

# 2. Разрешите SSH в firewall
ufw allow 22/tcp comment 'SSH'

# 3. Перезагрузите firewall
ufw reload

# 4. Проверьте статус
ufw status | grep 22

# Должно показать:
# 22/tcp (SSH)    ALLOW   Anywhere
```

## Если SSH не работает

Используйте **консоль провайдера** (VPS panel):

1. Зайдите в панель управления VPS
2. Откройте консоль (Web Console / VNC)
3. Выполните команды выше

## Полная переустановка

Если проблема не решена:

```bash
# На сервере
systemctl stop voicehub
cd /opt/voicehub
rm -rf *

# На локальной машине
scp install.sh root@YOUR_SERVER_IP:/opt/voicehub/
scp deploy.sh root@YOUR_SERVER_IP:/opt/voicehub/

# На сервере
cd /opt/voicehub
chmod +x install.sh
./install.sh
```

## Проверка

```bash
# Проверьте SSH
ssh root@YOUR_SERVER_IP

# Проверьте firewall
ufw status

# Проверьте сервис
systemctl status voicehub

# Проверьте сервер
curl http://YOUR_SERVER_IP:8080/health
```

## Готово!

✅ SSH должен работать стабильно  
✅ Firewall настроен правильно  
✅ Сервер работает корректно  

**Подробная документация:** [FIX_SSH_ISSUE.md](./FIX_SSH_ISSUE.md)
