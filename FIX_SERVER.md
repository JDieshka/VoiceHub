# 🔧 Исправление проблем с сервером

## Проблема: Ничего не открывается на http://31.77.158.177:8080

### Шаг 1: Диагностика

Выполните на сервере:

```bash
cd /opt/voicehub
chmod +x diagnose.sh
./diagnose.sh
```

Это покажет что работает, а что нет.

---

## Шаг 2: Проверка Backend

```bash
# Проверьте статус сервиса
systemctl status voicehub

# Если не работает - посмотрите логи
journalctl -u voicehub -n 50 --no-pager

# Попробуйте перезапустить
systemctl restart voicehub

# Проверьте что порт слушается
ss -tuln | grep 8080
```

---

## Шаг 3: Проверка Frontend

```bash
# Проверьте что frontend собран
ls -la /opt/voicehub/dist/

# Если dist/ нет - соберите frontend
cd /opt/voicehub
npm install
npm run build

# Проверьте что dist/ появился
ls -la dist/
```

---

## Шаг 4: Пересборка Backend (с раздачей frontend)

```bash
cd /opt/voicehub/server

# Пересоберите backend
export PATH=$PATH:/usr/local/go/bin
go build -o voicehub-server main.go

# Перезапустите сервис
systemctl restart voicehub

# Проверьте статус
systemctl status voicehub
```

---

## Шаг 5: Проверка работы

```bash
# Тест API
curl http://localhost:8080/health

# Должно вернуть:
# {"status":"ok","service":"voicehub-server","version":"2.0.0"}

# Тест frontend
curl http://localhost:8080/

# Должно вернуть HTML
```

---

## Шаг 6: Проверка Firewall

```bash
# Проверьте что порты открыты
ufw status

# Если порты не открыты - откройте их
ufw allow 22/tcp
ufw allow 8080/tcp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw reload
```

---

## Шаг 7: Проверка извне

С вашей локальной машины:

```bash
# Проверьте доступность
curl http://31.77.158.177:8080/health

# Если не работает - проверьте firewall на хостинге
# (не только ufw, но и firewall провайдера)
```

---

## Частые проблемы

### Проблема 1: Backend не запускается

**Симптом:** `systemctl status voicehub` показывает "failed"

**Решение:**
```bash
# Посмотрите логи
journalctl -u voicehub -n 50

# Частые причины:
# 1. PostgreSQL не запущен
systemctl start postgresql

# 2. База данных не создана
sudo -u postgres psql << EOF
CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';
CREATE DATABASE voicehub OWNER voicehub;
GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;
EOF

# 3. Неправильный DATABASE_URL в systemd
cat /etc/systemd/system/voicehub.service | grep DATABASE_URL
```

---

### Проблема 2: Frontend не открывается

**Симптом:** API работает (`/health` отвечает), но `/` возвращает JSON вместо HTML

**Решение:**
```bash
# Убедитесь что frontend собран
cd /opt/voicehub
ls -la dist/

# Если dist/ пустой или нет - соберите
npm install
npm run build

# Пересоберите backend (он теперь раздаёт frontend)
cd server
go build -o voicehub-server main.go

# Перезапустите
systemctl restart voicehub
```

---

### Проблема 3: Порт 8080 не доступен извне

**Симптом:** `curl localhost:8080/health` работает, но из браузера не открывается

**Решение:**
```bash
# 1. Проверьте ufw
ufw status
ufw allow 8080/tcp

# 2. Проверьте firewall провайдера
# Зайдите в панель управления хостинга
# Откройте порт 8080 (TCP)

# 3. Проверьте что сервер слушает на 0.0.0.0
ss -tuln | grep 8080
# Должно быть: 0.0.0.0:8080 (не 127.0.0.1:8080)
```

---

### Проблема 4: PostgreSQL не подключается

**Симптом:** В логах ошибка "connection refused" или "authentication failed"

**Решение:**
```bash
# Проверьте что PostgreSQL запущен
systemctl status postgresql

# Проверьте что пользователь и БД созданы
sudo -u postgres psql
\l                    # список БД
\du                   # список пользователей

# Если нужно - создайте заново
CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';
CREATE DATABASE voicehub OWNER voicehub;
GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;

# Проверьте подключение
psql -U voicehub -d voicehub -h localhost -W
# Пароль: VoiceHub2024SecurePass
```

---

## Полная переустановка

Если ничего не помогает - переустановите с нуля:

```bash
# Остановите сервис
systemctl stop voicehub

# Удалите старые файлы
rm -rf /opt/voicehub

# Создайте заново
mkdir -p /opt/voicehub

# Скопируйте файлы с локальной машины (на локальной машине!)
scp -r ./server root@31.77.158.177:/opt/voicehub/
scp -r ./src root@31.77.158.177:/opt/voicehub/
scp ./package.json root@31.77.158.177:/opt/voicehub/
scp ./index.html root@31.77.158.177:/opt/voicehub/
scp ./.env root@31.77.158.177:/opt/voicehub/

# На сервере установите зависимости
ssh root@31.77.158.177

cd /opt/voicehub

# Frontend
npm install
npm run build

# Backend
cd server
export PATH=$PATH:/usr/local/go/bin
go mod download
go build -o voicehub-server main.go

# Перезапустите сервис
systemctl restart voicehub

# Проверьте
systemctl status voicehub
curl http://localhost:8080/health
```

---

## Полезные команды

```bash
# Логи в реальном времени
journalctl -u voicehub -f

# Последние 100 строк логов
journalctl -u voicehub -n 100 --no-pager

# Перезапуск сервиса
systemctl restart voicehub

# Остановка сервиса
systemctl stop voicehub

# Запуск сервиса
systemctl start voicehub

# Статус сервиса
systemctl status voicehub

# Проверка портов
ss -tuln | grep -E "8080|5432"

# Проверка PostgreSQL
sudo -u postgres psql -d voicehub -c "SELECT count(*) FROM users;"

# Проверка дискового пространства
df -h

# Проверка использования памяти
free -h
```

---

## Если всё ещё не работает

Напишите мне:

1. Вывод команды `./diagnose.sh`
2. Вывод команды `journalctl -u voicehub -n 50`
3. Вывод команды `ss -tuln | grep 8080`
4. Какую ОС используете на сервере? (`cat /etc/os-release`)

Я помогу разобраться! 🚀
