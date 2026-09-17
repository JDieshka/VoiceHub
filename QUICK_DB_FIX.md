# 🔧 Быстрое решение проблемы с БД

## Проблема

При установке появляется:
```
⚠ Пользователь уже существует
⚠ База данных уже существует
```

## Решение

### Вариант 1: Использовать скрипт очистки (быстро)

```bash
# Скопируйте на сервер
scp cleanup-db.sh root@YOUR_SERVER_IP:/opt/voicehub/

# На сервере
cd /opt/voicehub
chmod +x cleanup-db.sh
sudo ./cleanup-db.sh

# Выберите вариант 1: "Удалить базу данных и пользователя"
```

### Вариант 2: Обновленный install.sh

```bash
# Скопируйте обновленный install.sh
scp install.sh root@YOUR_SERVER_IP:/opt/voicehub/

# На сервере
cd /opt/voicehub
sudo ./install.sh

# Когда спросит:
# "Удалить и пересоздать пользователя?" → ответьте y
# "Удалить и пересоздать базу данных?" → ответьте y
```

### Вариант 3: Ручное удаление

```bash
# На сервере
sudo systemctl stop voicehub

sudo -u postgres psql << EOF
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='voicehub';
DROP DATABASE IF EXISTS voicehub;
DROP USER IF EXISTS voicehub;
EOF

# Затем запустите установку
sudo ./install.sh
```

## Что было исправлено

✅ **uninstall.sh** - теперь правильно удаляет БД (PostgreSQL не останавливается перед удалением)  
✅ **install.sh** - предлагает пересоздать существующую БД  
✅ **cleanup-db.sh** - новый скрипт для быстрой очистки БД  

## Проверка

```bash
# Проверьте что БД удалена
sudo -u postgres psql -l | grep voicehub
# Не должно быть вывода

# Проверьте что пользователь удален
sudo -u postgres psql -c "\du" | grep voicehub
# Не должно быть вывода
```

## Полная переустановка

```bash
# 1. Очистите БД
sudo ./cleanup-db.sh  # выберите вариант 1

# 2. Удалите файлы
sudo rm -rf /opt/voicehub/*

# 3. Скопируйте файлы заново
# (на локальной машине)
scp -r ./* root@YOUR_SERVER_IP:/opt/voicehub/

# 4. Установите
cd /opt/voicehub
sudo ./install.sh
```

**Готово!** Теперь установка должна пройти без проблем. 🚀
