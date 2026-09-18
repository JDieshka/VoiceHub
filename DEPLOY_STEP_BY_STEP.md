# 🚀 Пошаговая инструкция развертывания VoiceHub на VPS

## 📋 Требования

- VPS сервер с Ubuntu 22.04+
- Root доступ по SSH
- Минимум 1 GB RAM
- Минимум 20 GB disk space
- Открытые порты: 22 (SSH), 8080 (HTTP)

---

## Шаг 1: Подключение к серверу

```bash
# Подключитесь к серверу по SSH
ssh root@YOUR_SERVER_IP

# Или если используете ключ
ssh -i /path/to/key.pem root@YOUR_SERVER_IP
```

---

## Шаг 2: Клонирование репозитория

```bash
# Перейдите в директорию для проектов
cd /opt

# Клонируйте репозиторий
git clone -b go-desktop-voice-app-5e8f3 --single-branch https://github.com/JDieshka/VoiceHub.git

# Перейдите в директорию проекта
cd VoiceHub
```

---

## Шаг 3: Проверка структуры проекта

```bash
# Убедитесь что все файлы на месте
ls -la

# Должны увидеть:
# - server/          (Go backend)
# - src/             (React frontend)
# - src-tauri/       (Tauri desktop app)
# - install.sh       (скрипт установки)
# - package.json     (Node.js зависимости)
```

---

## Шаг 4: Установка необходимых инструментов

### 4.1 Установка Go (если не установлен)

```bash
# Проверьте версию Go
go version

# Если Go не установлен или версия < 1.24, установите Go 1.24
cd /tmp
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
rm go1.24.0.linux-amd64.tar.gz

# Проверьте установку
go version
# Должно показать: go version go1.24.0 linux/amd64

# Вернитесь в директорию проекта
cd /opt/VoiceHub
```

### 4.2 Установка PostgreSQL

```bash
# Обновите пакеты
sudo apt-get update

# Установите PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Запустите и добавьте в автозагрузку
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверьте статус
sudo systemctl status postgresql
# Должно показать: active (running)
```

### 4.3 Установка Node.js

```bash
# Установите Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверьте установку
node --version  # Должно показать: v20.x.x
npm --version   # Должно показать: 10.x.x
```

---

## Шаг 5: Настройка базы данных

```bash
# Подключитесь к PostgreSQL
sudo -u postgres psql

# В PostgreSQL выполните команды:

# 1. Создайте пользователя
CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';

# 2. Создайте базу данных
CREATE DATABASE voicehub OWNER voicehub;

# 3. Предоставьте привилегии
GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;

# 4. Выйдите из PostgreSQL
\q
```

**Проверка:**
```bash
# Убедитесь что БД создана
sudo -u postgres psql -l | grep voicehub
# Должна показать строку с voicehub

# Убедитесь что пользователь создан
sudo -u postgres psql -c "\du" | grep voicehub
# Должна показать строку с voicehub
```

---

## Шаг 6: Сборка Backend (Go)

### Вариант A: Если Go 1.24+ (полная версия с SFU)

```bash
cd /opt/VoiceHub/server

# Загрузите зависимости
go mod download

# Соберите бинарник
go build -o voicehub-server main.go

# Сделайте исполняемым
chmod +x voicehub-server

# Проверьте что бинарник создан
ls -lh voicehub-server
# Должен показать файл размером ~20-30 MB

# Вернитесь в корень проекта
cd ..
```

### Вариант B: Если Go < 1.24 (упрощенная версия без SFU)

```bash
cd /opt/VoiceHub/server

# Используйте упрощенную версию
cp main-simple.go main.go

# Загрузите зависимости
go mod download

# Соберите бинарник
go build -o voicehub-server main.go

# Сделайте исполняемым
chmod +x voicehub-server

# Восстановите оригинальный main.go
git checkout main.go

# Проверьте что бинарник создан
ls -lh voicehub-server

# Вернитесь в корень проекта
cd ..
```

---

## Шаг 7: Сборка Frontend (React)

```bash
cd /opt/VoiceHub

# Установите зависимости Node.js
npm install

# Соберите frontend
npm run build

# Проверьте что dist/ создан
ls -la dist/
# Должны увидеть: index.html, assets/

# Проверьте размер
du -sh dist/
# Должно быть ~5-10 MB
```

---

## Шаг 8: Настройка systemd service

```bash
# Создайте файл service
sudo nano /etc/systemd/system/voicehub.service
```

**Вставьте следующий код:**

```ini
[Unit]
Description=VoiceHub Server
After=network.target postgresql.service
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=root
WorkingDirectory=/opt/VoiceHub/server
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
Environment="DATABASE_URL=postgres://voicehub:VoiceHub2024SecurePass@localhost:5432/voicehub?sslmode=disable"
Environment="JWT_SECRET=VoiceHub2024SuperSecretJWTKeyChangeThisInProduction88!"
Environment="PORT=8080"
Environment="MODE=hybrid"
Environment="ALLOWED_ORIGINS=*"
ExecStart=/opt/VoiceHub/server/voicehub-server
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Сохраните файл:**
- Нажмите `Ctrl+O` (сохранить)
- Нажмите `Enter` (подтвердить)
- Нажмите `Ctrl+X` (выйти)

**Активируйте service:**
```bash
# Перезагрузите systemd
sudo systemctl daemon-reload

# Включите автозапуск
sudo systemctl enable voicehub

# Запустите сервис
sudo systemctl start voicehub

# Проверьте статус
sudo systemctl status voicehub
# Должно показать: active (running)
```

---

## Шаг 9: Настройка Firewall

```bash
# Установите UFW если не установлен
sudo apt-get install -y ufw

# Разрешите SSH (ВАЖНО сделать первым!)
sudo ufw allow 22/tcp comment 'SSH'

# Разрешите HTTP для VoiceHub
sudo ufw allow 8080/tcp comment 'VoiceHub HTTP'

# Разрешите TURN для WebRTC (опционально)
sudo ufw allow 3478/tcp comment 'TURN TCP'
sudo ufw allow 3478/udp comment 'TURN UDP'

# Включите firewall
sudo ufw enable

# Проверьте статус
sudo ufw status verbose
```

**Ожидаемый вывод:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp (SSH)               ALLOW IN    Anywhere
8080/tcp (VoiceHub HTTP)   ALLOW IN    Anywhere
3478/tcp (TURN TCP)        ALLOW IN    Anywhere
3478/udp (TURN UDP)        ALLOW IN    Anywhere
```

---

## Шаг 10: Проверка работы

### 10.1 Проверка API

```bash
# Проверьте что API отвечает
curl http://localhost:8080/health

# Должно вернуть:
# {"status":"ok","service":"voicehub-server","version":"2.0.0","time":"..."}
```

### 10.2 Проверка из браузера

Откройте в браузере:
```
http://YOUR_SERVER_IP:8080
```

Должна загрузиться страница VoiceHub.

### 10.3 Проверка логов

```bash
# Просмотр логов в реальном времени
sudo journalctl -u voicehub -f

# Последние 50 строк
sudo journalctl -u voicehub -n 50

# Выйти из просмотра: Ctrl+C
```

---

## Шаг 11: Тестирование функциональности

### 11.1 Регистрация пользователя

1. Откройте `http://YOUR_SERVER_IP:8080` в браузере
2. Введите URL сервера: `YOUR_SERVER_IP` (без http:// и порта)
3. Нажмите "Подключиться"
4. Перейдите на вкладку "Регистрация"
5. Заполните форму:
   - Никнейм: testuser
   - Email: test@example.com
   - Пароль: password123
   - Подтверждение пароля: password123
6. Нажмите "Зарегистрироваться"

### 11.2 Создание сервера

1. Перейдите на вкладку "Голосовые чаты"
2. Нажмите "Создать сервер"
3. Введите название: "Тестовый сервер"
4. Нажмите "Создать"

### 11.3 Создание комнаты

1. Нажмите "Создать комнату"
2. Введите название: "Комната 1"
3. Нажмите "Создать"

### 11.4 Подключение к комнате

1. Нажмите на "Комната 1"
2. Разрешите доступ к микрофону и камере
3. Проверьте что видите себя в видео

---

## Шаг 12: Полезные команды

### Управление сервисом

```bash
# Статус сервиса
sudo systemctl status voicehub

# Перезапуск сервиса
sudo systemctl restart voicehub

# Остановка сервиса
sudo systemctl stop voicehub

# Запуск сервиса
sudo systemctl start voicehub

# Отключение автозапуска
sudo systemctl disable voicehub

# Включение автозапуска
sudo systemctl enable voicehub
```

### Просмотр логов

```bash
# Логи в реальном времени
sudo journalctl -u voicehub -f

# Последние 100 строк
sudo journalctl -u voicehub -n 100

# Логи за сегодня
sudo journalctl -u voicehub --since today

# Логи за последний час
sudo journalctl -u voicehub --since "1 hour ago"
```

### Работа с БД

```bash
# Подключиться к БД
sudo -u postgres psql voicehub

# Список таблиц
\dt

# Размер БД
SELECT pg_size_pretty(pg_database_size('voicehub'));

# Количество пользователей
SELECT count(*) FROM users;

# Выйти
\q
```

### Мониторинг ресурсов

```bash
# Использование CPU и RAM
htop

# Дисковое пространство
df -h

# Сетевые подключения
sudo netstat -tulpn | grep -E '(8080|5432)'
```

---

## 🔧 Решение проблем

### Проблема 1: Сервис не запускается

```bash
# Проверьте логи
sudo journalctl -u voicehub -n 50

# Проверьте что бинарник существует
ls -lh /opt/VoiceHub/server/voicehub-server

# Проверьте что бинарник исполняемый
file /opt/VoiceHub/server/voicehub-server

# Попробуйте запустить вручную
cd /opt/VoiceHub/server
./voicehub-server
```

### Проблема 2: API не отвечает

```bash
# Проверьте что сервис запущен
sudo systemctl status voicehub

# Проверьте что порт слушается
sudo netstat -tulpn | grep 8080

# Проверьте firewall
sudo ufw status

# Попробуйте обратиться локально
curl http://localhost:8080/health
```

### Проблема 3: Ошибки БД

```bash
# Проверьте что PostgreSQL запущен
sudo systemctl status postgresql

# Проверьте что БД существует
sudo -u postgres psql -l | grep voicehub

# Проверьте что пользователь существует
sudo -u postgres psql -c "\du" | grep voicehub

# Пересоздайте БД
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS voicehub;
DROP USER IF EXISTS voicehub;
CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';
CREATE DATABASE voicehub OWNER voicehub;
GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;
EOF
```

### Проблема 4: Frontend не загружается

```bash
# Проверьте что dist/ существует
ls -la /opt/VoiceHub/dist/

# Пересоберите frontend
cd /opt/VoiceHub
npm install
npm run build

# Перезапустите сервис
sudo systemctl restart voicehub
```

### Проблема 5: SSH блокируется firewall

**ВАЖНО:** Если SSH заблокирован, вы потеряете доступ к серверу!

```bash
# Убедитесь что SSH разрешен ПЕРЕД включением firewall
sudo ufw allow 22/tcp

# Проверьте что правило добавлено
sudo ufw status | grep 22

# Только потом включайте firewall
sudo ufw enable
```

---

## 📊 Мониторинг

### Автоматический мониторинг

Создайте скрипт для проверки здоровья:

```bash
nano /opt/VoiceHub/health-check.sh
```

**Вставьте:**
```bash
#!/bin/bash

# Проверка API
if curl -s http://localhost:8080/health | grep -q "ok"; then
    echo "✅ API работает"
else
    echo "❌ API не отвечает"
    sudo systemctl restart voicehub
fi

# Проверка БД
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw voicehub; then
    echo "✅ БД существует"
else
    echo "❌ БД не найдена"
fi

# Проверка сервиса
if systemctl is-active --quiet voicehub; then
    echo "✅ Сервис запущен"
else
    echo "❌ Сервис не запущен"
    sudo systemctl start voicehub
fi
```

**Сделайте исполняемым:**
```bash
chmod +x /opt/VoiceHub/health-check.sh
```

**Добавьте в cron (каждые 5 минут):**
```bash
crontab -e
```

**Добавьте строку:**
```
*/5 * * * * /opt/VoiceHub/health-check.sh >> /var/log/voicehub-health.log 2>&1
```

---

## 🔄 Обновление

### Обновление кода

```bash
# Перейдите в директорию проекта
cd /opt/VoiceHub

# Остановите сервис
sudo systemctl stop voicehub

# Получите последние изменения
git pull

# Пересоберите backend
cd server
go build -o voicehub-server main.go
cd ..

# Пересоберите frontend
npm install
npm run build

# Запустите сервис
sudo systemctl start voicehub

# Проверьте работу
curl http://localhost:8080/health
```

---

## 📝 Итоговая проверка

После выполнения всех шагов проверьте:

```bash
# 1. Сервис запущен
sudo systemctl status voicehub
# Должно показать: active (running)

# 2. API отвечает
curl http://localhost:8080/health
# Должно вернуть JSON с "status":"ok"

# 3. Firewall настроен
sudo ufw status
# Должны быть разрешены порты 22, 8080, 3478

# 4. БД работает
sudo -u postgres psql -l | grep voicehub
# Должна показать базу данных voicehub

# 5. Frontend доступен
curl http://localhost:8080/ | grep -q "<!DOCTYPE html>"
# Должно вернуть true
```

---

## 🎉 Готово!

Ваш VoiceHub сервер работает и доступен по адресу:
```
http://YOUR_SERVER_IP:8080
```

Пользователи могут:
1. Открыть приложение
2. Ввести URL сервера: `YOUR_SERVER_IP`
3. Зарегистрироваться
4. Создавать серверы и комнаты
5. Общаться голосом и видео

---

## 📚 Дополнительная информация

- **Логи:** `sudo journalctl -u voicehub -f`
- **Конфигурация:** `/etc/systemd/system/voicehub.service`
- **База данных:** PostgreSQL на localhost:5432
- **Backend:** Go на порту 8080
- **Frontend:** React (статические файлы)

---

## 🆘 Поддержка

Если возникли проблемы:

1. Проверьте логи: `sudo journalctl -u voicehub -n 50`
2. Проверьте статус: `sudo systemctl status voicehub`
3. Проверьте порты: `sudo netstat -tulpn | grep 8080`
4. Проверьте firewall: `sudo ufw status`
5. Проверьте БД: `sudo -u postgres psql -l`

**Полезные команды для диагностики:**
```bash
# Полная диагностика
sudo systemctl status voicehub
sudo journalctl -u voicehub -n 50
curl http://localhost:8080/health
sudo netstat -tulpn | grep 8080
sudo ufw status
```
