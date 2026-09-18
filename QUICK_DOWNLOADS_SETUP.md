# 🚀 Быстрая настройка страницы загрузок

## Что нужно сделать

### 1. Скопируйте файлы на сервер

```bash
# На локальной машине
scp build-desktop.sh root@YOUR_SERVER_IP:/opt/VoiceHub/
scp server/downloads/index.html root@YOUR_SERVER_IP:/opt/VoiceHub/server/downloads/
scp server/main.go root@YOUR_SERVER_IP:/opt/VoiceHub/server/
```

### 2. Установите Rust на сервере

```bash
# На сервере
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version
```

### 3. Запустите сборку desktop приложения

```bash
cd /opt/VoiceHub
chmod +x build-desktop.sh
sudo ./build-desktop.sh
```

⏱️ **Сборка займет 5-10 минут**

### 4. Пересоберите и перезапустите сервер

```bash
cd /opt/VoiceHub/server
go build -o voicehub-server main.go
sudo systemctl restart voicehub
```

### 5. Откройте страницу загрузок

```
http://YOUR_SERVER_IP:8080/downloads
```

---

## ✅ Готово!

Теперь пользователи могут скачивать desktop приложение с вашей страницы загрузок!

**Полная документация:** [DOWNLOADS_SYSTEM.md](./DOWNLOADS_SYSTEM.md)
