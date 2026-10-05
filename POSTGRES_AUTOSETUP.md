# 🗄️ Автоматическая настройка PostgreSQL

## 📋 Обзор

Теперь установка PostgreSQL полностью автоматизирована! Скрипты сами:
- ✅ Инициализируют кластер PostgreSQL
- ✅ Создают директорию данных
- ✅ Настраивают конфигурацию
- ✅ Запускают PostgreSQL
- ✅ Создают пользователя и базу данных
- ✅ Выполняют миграции
- ✅ Проверяют что всё работает

---

## 🚀 Использование

### Вариант 1: Новая установка

Если вы устанавливаете VoiceHub с нуля:

```bash
# Просто запустите install.sh
sudo ./install.sh
```

Скрипт автоматически:
1. Установит PostgreSQL если его нет
2. Инициализирует кластер
3. Создаст базу данных и пользователя
4. Выполнит миграции
5. Соберет и запустит backend

### Вариант 2: Восстановление существующей установки

Если PostgreSQL сломался или не работает:

```bash
# Запустите скрипт восстановления
sudo ./fix-postgresql.sh
```

Скрипт автоматически:
1. Остановит PostgreSQL
2. Проверит/создаст директорию данных
3. Инициализирует кластер если нужно
4. Настроит конфигурацию
5. Запустит PostgreSQL
6. Создаст пользователя и базу данных
7. Выполнит миграции
8. Перезапустит VoiceHub

---

## 🔧 Что делают скрипты

### install.sh (Шаг 3: PostgreSQL)

```bash
# 1. Проверяет установлен ли PostgreSQL
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
fi

# 2. Определяет версию PostgreSQL
PG_VERSION=$(ls /etc/postgresql/ | head -n 1)

# 3. Проверяет директорию данных
PG_DATA_DIR="/var/lib/postgresql/$PG_VERSION/main"

# 4. Инициализирует кластер если нужно
if [ ! -f "$PG_DATA_DIR/PG_VERSION" ]; then
    mkdir -p "$PG_DATA_DIR"
    chown postgres:postgres "$PG_DATA_DIR"
    chmod 700 "$PG_DATA_DIR"
    
    sudo -u postgres /usr/lib/postgresql/$PG_VERSION/bin/initdb -D "$PG_DATA_DIR"
fi

# 5. Настраивает конфигурацию
cat >> "$PG_DATA_DIR/postgresql.conf" << 'EOF'
listen_addresses = 'localhost'
port = 5432
EOF

# 6. Настраивает аутентификацию
cat > "$PG_DATA_DIR/pg_hba.conf" << 'EOF'
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
EOF

# 7. Запускает PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# 8. Создает пользователя
sudo -u postgres psql -c "CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';"

# 9. Создает базу данных
sudo -u postgres psql -c "CREATE DATABASE voicehub OWNER voicehub;"

# 10. Выполняет миграции
sudo -u postgres psql -d voicehub -f server/migrations/001_initial_schema.sql
sudo -u postgres psql -d voicehub -f server/migrations/002_add_chats.sql
```

### fix-postgresql.sh

Делает то же самое, но:
- Останавливает PostgreSQL перед восстановлением
- Очищает поврежденную директорию данных
- Перезапускает VoiceHub после восстановления
- Более подробное логирование

---

## 📊 Структура базы данных

После выполнения миграций будут созданы следующие таблицы:

### Основные таблицы

1. **users** - пользователи
   - id (UUID)
   - username (VARCHAR)
   - email (VARCHAR)
   - password_hash (VARCHAR)
   - avatar (VARCHAR)
   - status (VARCHAR)
   - created_at, updated_at

2. **servers** - серверы
   - id (UUID)
   - name (VARCHAR)
   - icon (VARCHAR)
   - owner_id (UUID)
   - created_at

3. **server_members** - участники серверов
   - server_id (UUID)
   - user_id (UUID)
   - role (VARCHAR)
   - joined_at

4. **voice_channels** - голосовые каналы
   - id (UUID)
   - server_id (UUID)
   - name (VARCHAR)
   - bitrate (INTEGER)
   - user_limit (INTEGER)
   - created_at

5. **text_channels** - текстовые каналы
   - id (UUID)
   - server_id (UUID)
   - name (VARCHAR)
   - created_at

6. **messages** - сообщения
   - id (UUID)
   - channel_id (UUID, nullable)
   - chat_id (UUID, nullable)
   - user_id (UUID)
   - content (TEXT)
   - created_at

7. **refresh_tokens** - токены обновления
   - id (UUID)
   - user_id (UUID)
   - token (VARCHAR)
   - expires_at
   - created_at

### Новые таблицы (миграция 002)

8. **chats** - личные чаты
   - id (UUID)
   - name (VARCHAR)
   - created_at

9. **chat_members** - участники чатов
   - chat_id (UUID)
   - user_id (UUID)
   - joined_at

---

## 🔍 Проверка работы

### Проверка PostgreSQL

```bash
# Статус PostgreSQL
sudo systemctl status postgresql

# Должно быть: active (running)

# Проверка кластера
sudo systemctl status postgresql@15-main

# Должно быть: active (running)
```

### Проверка базы данных

```bash
# Подключение к PostgreSQL
sudo -u postgres psql

# Список баз данных
\l

# Должны увидеть: voicehub

# Подключение к voicehub
\c voicehub

# Список таблиц
\dt

# Должны увидеть:
# users, servers, server_members, voice_channels, text_channels,
# messages, refresh_tokens, chats, chat_members

# Выход
\q
```

### Проверка подключения от backend

```bash
# Проверка health endpoint
curl http://localhost:8080/health

# Должны получить:
# {"status":"ok","service":"voicehub-server","version":"2.0.0","time":"..."}

# Проверка логов
sudo journalctl -u voicehub -n 20

# Должны увидеть:
# ✅ Database connected and migrated
```

---

## 🐛 Решение проблем

### Проблема 1: PostgreSQL не запускается

**Симптом:**
```
× postgresql@15-main.service - PostgreSQL Cluster 15-main
     Active: failed (Result: protocol)
```

**Решение:**
```bash
# Запустите скрипт восстановления
sudo ./fix-postgresql.sh
```

### Проблема 2: Директория данных отсутствует

**Симптом:**
```
Error: /var/lib/postgresql/15/main is not accessible or does not exist
```

**Решение:**
```bash
# Запустите скрипт восстановления
sudo ./fix-postgresql.sh
```

### Проблема 3: База данных не создана

**Симптом:**
```
FATAL: database "voicehub" does not exist
```

**Решение:**
```bash
# Создайте базу данных вручную
sudo -u postgres psql -c "CREATE DATABASE voicehub OWNER voicehub;"

# Выполните миграции
sudo -u postgres psql -d voicehub -f server/migrations/001_initial_schema.sql
sudo -u postgres psql -d voicehub -f server/migrations/002_add_chats.sql
```

### Проблема 4: Таблицы не созданы

**Симптом:**
```
ERROR: relation "users" does not exist
```

**Решение:**
```bash
# Выполните миграции
sudo -u postgres psql -d voicehub -f server/migrations/001_initial_schema.sql
sudo -u postgres psql -d voicehub -f server/migrations/002_add_chats.sql
```

### Проблема 5: Backend не может подключиться к БД

**Симптом:**
```
❌ Database connection failed
```

**Решение:**
```bash
# Проверьте что PostgreSQL запущен
sudo systemctl status postgresql

# Проверьте что пользователь существует
sudo -u postgres psql -c "\du" | grep voicehub

# Проверьте что база данных существует
sudo -u postgres psql -l | grep voicehub

# Перезапустите backend
sudo systemctl restart voicehub
```

---

## 📋 Ручная настройка PostgreSQL

Если скрипты не работают, можно настроить PostgreSQL вручную:

### Шаг 1: Установка PostgreSQL

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
```

### Шаг 2: Инициализация кластера

```bash
# Определите версию
PG_VERSION=$(ls /etc/postgresql/ | head -n 1)

# Создайте директорию данных
sudo mkdir -p /var/lib/postgresql/$PG_VERSION/main
sudo chown postgres:postgres /var/lib/postgresql/$PG_VERSION/main
sudo chmod 700 /var/lib/postgresql/$PG_VERSION/main

# Инициализируйте кластер
sudo -u postgres /usr/lib/postgresql/$PG_VERSION/bin/initdb -D /var/lib/postgresql/$PG_VERSION/main
```

### Шаг 3: Настройка конфигурации

```bash
PG_DATA_DIR="/var/lib/postgresql/$PG_VERSION/main"

# Добавьте в postgresql.conf
cat >> $PG_DATA_DIR/postgresql.conf << 'EOF'

# VoiceHub configuration
listen_addresses = 'localhost'
port = 5432
EOF

# Настройте pg_hba.conf
cat > $PG_DATA_DIR/pg_hba.conf << 'EOF'
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
EOF

sudo chown postgres:postgres $PG_DATA_DIR/postgresql.conf
sudo chown postgres:postgres $PG_DATA_DIR/pg_hba.conf
```

### Шаг 4: Запуск PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Шаг 5: Создание пользователя и базы данных

```bash
sudo -u postgres psql << EOF
CREATE USER voicehub WITH PASSWORD 'VoiceHub2024SecurePass';
CREATE DATABASE voicehub OWNER voicehub;
GRANT ALL PRIVILEGES ON DATABASE voicehub TO voicehub;
EOF
```

### Шаг 6: Выполнение миграций

```bash
sudo -u postgres psql -d voicehub -f server/migrations/001_initial_schema.sql
sudo -u postgres psql -d voicehub -f server/migrations/002_add_chats.sql
```

### Шаг 7: Проверка

```bash
# Проверка таблиц
sudo -u postgres psql -d voicehub -c "\dt"

# Должны увидеть все таблицы
```

---

## 🎯 Итог

Теперь установка PostgreSQL полностью автоматизирована:

✅ **install.sh** - автоматически настраивает PostgreSQL при новой установке  
✅ **fix-postgresql.sh** - автоматически восстанавливает PostgreSQL при проблемах  
✅ **Миграции** - автоматически выполняются при установке  
✅ **Проверки** - автоматически проверяется что всё работает  

**Вам больше не нужно настраивать PostgreSQL вручную!** 🎉

Просто запустите:
```bash
sudo ./install.sh
```

Или если PostgreSQL сломался:
```bash
sudo ./fix-postgresql.sh
```

---

## 📚 Документация

- **install.sh** - основной скрипт установки
- **fix-postgresql.sh** - скрипт восстановления PostgreSQL
- **server/migrations/001_initial_schema.sql** - основная схема БД
- **server/migrations/002_add_chats.sql** - миграция для чатов
- **POSTGRES_AUTOSETUP.md** - этот файл
