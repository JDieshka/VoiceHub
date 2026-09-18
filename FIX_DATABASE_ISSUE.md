# Решение проблемы с базой данных

## Проблема

При установке VoiceHub появляется сообщение:
```
⚠ Пользователь уже существует
⚠ База данных уже существует
```

Это означает что база данных и пользователь уже были созданы ранее и не были удалены.

## Причины

1. **Неполное удаление** - скрипт `uninstall.sh` не удалил БД
2. **Прерванная установка** - предыдущая установка была прервана
3. **Повторная установка** - VoiceHub уже был установлен ранее

## Решение

### Вариант 1: Использовать скрипт очистки БД (рекомендуется)

```bash
# Скопируйте скрипт на сервер
scp cleanup-db.sh root@YOUR_SERVER_IP:/opt/voicehub/

# На сервере
cd /opt/voicehub
chmod +x cleanup-db.sh
sudo ./cleanup-db.sh
```

Скрипт предложит варианты:
1. Удалить базу данных и пользователя
2. Удалить только базу данных
3. Удалить только пользователя
4. Очистить все таблицы
5. Выход

**Рекомендуется выбрать вариант 1** для полной очистки.

### Вариант 2: Ручное удаление БД

```bash
# Подключитесь к серверу
ssh root@YOUR_SERVER_IP

# Остановите VoiceHub
sudo systemctl stop voicehub

# Подключитесь к PostgreSQL
sudo -u postgres psql

# В PostgreSQL выполните:
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='voicehub';
DROP DATABASE IF EXISTS voicehub;
DROP USER IF EXISTS voicehub;
\q

# Проверьте что БД удалена
sudo -u postgres psql -l | grep voicehub
# Не должно быть вывода
```

### Вариант 3: Использовать обновленный install.sh

Новая версия `install.sh` автоматически определяет существующую БД и предлагает пересоздать её:

```bash
# Скопируйте обновленный install.sh на сервер
scp install.sh root@YOUR_SERVER_IP:/opt/voicehub/

# На сервере
cd /opt/voicehub
chmod +x install.sh
sudo ./install.sh
```

При запуске скрипт спросит:
```
⚠ Пользователь voicehub уже существует
Удалить и пересоздать пользователя voicehub? [y/N]
```

Ответьте **y** для пересоздания.

Затем:
```
⚠ База данных voicehub уже существует
Удалить и пересоздать базу данных voicehub? [y/N]
```

Снова ответьте **y**.

## Что было исправлено

### В uninstall.sh

**Было:**
```bash
# Остановка PostgreSQL
systemctl stop postgresql 2>/dev/null || true

# Удаление БД и пользователя
su - postgres -c "psql -c \"DROP DATABASE IF EXISTS voicehub;\"" 2>/dev/null || true
```

**Проблема:** PostgreSQL останавливался перед удалением БД, поэтому команды DROP не выполнялись.

**Стало:**
```bash
# Убедимся что PostgreSQL запущен
if ! systemctl is-active --quiet postgresql; then
    systemctl start postgresql
    sleep 2
fi

# Удаление подключений к БД
su - postgres -c "psql -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='voicehub';\""

# Удаление БД и пользователя
su - postgres -c "psql -c \"DROP DATABASE IF EXISTS voicehub;\""
su - postgres -c "psql -c \"DROP USER IF EXISTS voicehub;\""
```

### В install.sh

**Было:**
```bash
su - postgres -c "psql -c \"CREATE USER voicehub WITH PASSWORD '...';\"" 2>/dev/null || warn "Пользователь уже существует"
su - postgres -c "psql -c \"CREATE DATABASE voicehub OWNER voicehub;\"" 2>/dev/null || warn "База данных уже существует"
```

**Проблема:** Ошибки скрывались через `2>/dev/null`, не было возможности пересоздать БД.

**Стало:**
```bash
# Проверяем существует ли пользователь
if su - postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='voicehub'\"" | grep -q 1; then
    warn "Пользователь voicehub уже существует"
    
    if confirm "Удалить и пересоздать пользователя voicehub?"; then
        # Удаляем и пересоздаем
        su - postgres -c "psql -c \"DROP USER IF EXISTS voicehub;\""
        su - postgres -c "psql -c \"CREATE USER voicehub WITH PASSWORD '...';\""
    fi
else
    # Создаем нового пользователя
    su - postgres -c "psql -c \"CREATE USER voicehub WITH PASSWORD '...';\""
fi

# Аналогично для БД
```

## Полная переустановка

Если хотите начать с чистого листа:

```bash
# 1. Остановите сервис
sudo systemctl stop voicehub

# 2. Удалите БД
sudo ./cleanup-db.sh
# Выберите вариант 1

# 3. Удалите файлы проекта
sudo rm -rf /opt/voicehub/*

# 4. Скопируйте файлы заново
# (на локальной машине)
scp -r ./* root@YOUR_SERVER_IP:/opt/voicehub/

# 5. Запустите установку
cd /opt/voicehub
chmod +x install.sh
sudo ./install.sh
```

## Проверка состояния БД

```bash
# Подключитесь к PostgreSQL
sudo -u postgres psql

# Список БД
\l

# Список пользователей
\du

# Подключитесь к voicehub
\c voicehub

# Список таблиц
\dt

# Размер БД
SELECT pg_size_pretty(pg_database_size('voicehub'));

# Выход
\q
```

## Частые проблемы

### Проблема: "database is being accessed by other users"

**Решение:**
```bash
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='voicehub';"
sudo -u postgres psql -c "DROP DATABASE voicehub;"
```

### Проблема: "cannot drop user because it owns objects"

**Решение:**
```bash
sudo -u postgres psql -c "DROP DATABASE IF EXISTS voicehub;"
sudo -u postgres psql -c "DROP USER IF EXISTS voicehub;"
```

### Проблема: "permission denied"

**Решение:**
```bash
# Убедитесь что запускаете с sudo
sudo -u postgres psql
```

## Итог

✅ Исправлен `uninstall.sh` - теперь правильно удаляет БД  
✅ Улучшен `install.sh` - предлагает пересоздать существующую БД  
✅ Создан `cleanup-db.sh` - быстрая очистка БД  
✅ Создана документация по решению проблем  

**Теперь установка должна проходить без проблем!** 🚀
