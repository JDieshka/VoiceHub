# 📋 Правильное копирование файлов на сервер

## Проблема

Скрипт `install.sh` не может найти `server/` потому что файлы скопированы неправильно.

---

## ✅ Правильная структура на сервере

На сервере в `/opt/voicehub/` должно быть:

```
/opt/voicehub/
├── server/
│   ├── main.go
│   ├── go.mod
│   ├── internal/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── database/
│   │   ├── handlers/
│   │   ├── models/
│   │   ├── sfu/
│   │   ├── signaling/
│   │   └── ws/
│   └── voicehub-server (после сборки)
├── src/
├── dist/
│   ├── index.html
│   └── assets/
├── install.sh
└── package.json
```

---

## 🔧 Как правильно скопировать файлы

### Вариант 1: С локальной машины (рекомендуется)

```bash
# На вашей локальной машине

# 1. Подключитесь к серверу
ssh root@31.77.158.177

# 2. Создайте директорию
mkdir -p /opt/voicehub
cd /opt/voicehub

# 3. Выйдите с сервера (Ctrl+D)
exit

# 4. Скопируйте файлы с локальной машины
# ВАЖНО: копируйте ИЗ директории voicehub, а не В неё!

cd /path/to/voicehub  # перейдите в корень проекта на локальной машине

# Скопируйте server/
scp -r ./server root@31.77.158.177:/opt/voicehub/

# Скопируйте src/
scp -r ./src root@31.77.158.177:/opt/voicehub/

# Скопируйте dist/ (собранный frontend)
scp -r ./dist root@31.77.158.177:/opt/voicehub/

# Скопируйте конфигурационные файлы
scp ./package.json root@31.77.158.177:/opt/voicehub/
scp ./tsconfig.json root@31.77.158.177:/opt/voicehub/
scp ./vite.config.ts root@31.77.158.177:/opt/voicehub/
scp ./tailwind.config.js root@31.77.158.177:/opt/voicehub/
scp ./postcss.config.js root@31.77.158.177:/opt/voicehub/
scp ./index.html root@31.77.158.177:/opt/voicehub/
scp ./.env root@31.77.158.177:/opt/voicehub/

# Скопируйте install.sh
scp ./install.sh root@31.77.158.177:/opt/voicehub/
```

### Вариант 2: Проверка структуры

После копирования проверьте структуру:

```bash
# На сервере
ssh root@31.77.158.177

cd /opt/voicehub

# Проверьте что server/ существует
ls -la server/

# Должно показать:
# main.go
# go.mod
# internal/
# ...

# Проверьте что dist/ существует
ls -la dist/

# Должно показать:
# index.html
# assets/
# ...
```

---

## 🚀 Запуск установки

После правильного копирования:

```bash
cd /opt/voicehub
chmod +x install.sh
./install.sh
```

---

## 🐛 Если структура неправильная

### Проверка 1: Где находится server/?

```bash
# Найдите где находится main.go
find / -name "main.go" 2>/dev/null | grep voicehub

# Если найдено в /opt/voicehub/server/server/main.go
# значит вы скопировали неправильно!

# Исправление:
cd /opt/voicehub
mv server/server/* server/ 2>/dev/null || true
rmdir server/server 2>/dev/null || true
```

### Проверка 2: Полная переустановка

```bash
# Удалите всё
rm -rf /opt/voicehub

# Создайте заново
mkdir -p /opt/voicehub
cd /opt/voicehub

# Скопируйте файлы правильно (см. Вариант 1 выше)
```

---

## 📝 Быстрая проверка

Перед запуском install.sh выполните:

```bash
cd /opt/voicehub

# Эта команда должна показать "OK"
[ -f "server/main.go" ] && echo "✅ server/main.go найден" || echo "❌ server/main.go НЕ найден"

# Эта команда должна показать "OK"
[ -f "dist/index.html" ] && echo "✅ dist/index.html найден" || echo "❌ dist/index.html НЕ найден"

# Эта команда должна показать "OK"
[ -f "install.sh" ] && echo "✅ install.sh найден" || echo "❌ install.sh НЕ найден"
```

Если все три проверки показывают ✅ — можно запускать install.sh!

---

## 🎯 Итоговая команда для копирования

Скопируйте и выполните на **локальной машине**:

```bash
# Перейдите в корень проекта
cd /path/to/voicehub

# Скопируйте всё одной командой
scp -r ./server ./src ./dist ./install.sh ./package.json ./tsconfig.json ./vite.config.ts ./tailwind.config.js ./postcss.config.js ./index.html ./.env root@31.77.158.177:/opt/voicehub/
```

Затем на сервере:

```bash
cd /opt/voicehub
chmod +x install.sh
./install.sh
```
