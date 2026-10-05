# 🗑️ Полное удаление VoiceHub с сервера

## Обзор

Скрипт `uninstall.sh` выполняет полное удаление VoiceHub и всех связанных компонентов с сервера.

## ⚠️ ВНИМАНИЕ

**Это действие необратимо!** Все данные будут удалены без возможности восстановления:
- База данных PostgreSQL
- Файлы проекта
- Конфигурации
- Логи

**Рекомендуется создать резервную копию перед удалением!**

## Использование

### Базовое использование

```bash
# Сделать скрипт исполняемым
chmod +x uninstall.sh

# Запустить интерактивное удаление
sudo ./uninstall.sh
```

### Автоматическое удаление (без подтверждений)

```bash
# Удалить всё
sudo ./uninstall.sh --all

# или
sudo ./uninstall.sh --force
```

### Выборочное удаление

```bash
# Оставить базу данных
sudo ./uninstall.sh --keep-db

# Оставить Go и Node.js
sudo ./uninstall.sh --keep-go --keep-node

# Оставить TURN сервер
sudo ./uninstall.sh --keep-turn

# Комбинирование флагов
sudo ./uninstall.sh --keep-db --keep-go --keep-node
```

## Флаги

| Флаг | Описание |
|------|----------|
| `--all` | Удалить всё без подтверждений |
| `--keep-db` | Оставить базу данных PostgreSQL |
| `--keep-go` | Оставить Go установленным |
| `--keep-node` | Оставить Node.js установленным |
| `--keep-turn` | Оставить TURN сервер (coturn) |
| `--force` | Принудительное удаление без проверок |
| `-h, --help` | Показать справку |

## Что удаляется

### 1. Сервисы
- ✅ VoiceHub systemd service
- ✅ TURN сервер (coturn) - опционально

### 2. Файлы проекта
- ✅ `/opt/voicehub` - основная директория
- ✅ `/root/voicehub` - альтернативная директория
- ✅ `/home/*/voicehub` - пользовательские директории

### 3. База данных
- ✅ База данных `voicehub`
- ✅ Пользователь `voicehub`
- ✅ PostgreSQL (опционально)

### 4. Программное обеспечение
- ✅ Go - опционально
- ✅ Node.js и npm - опционально
- ✅ coturn (TURN сервер) - опционально

### 5. Firewall
- ✅ Правила для порта 8080 (HTTP)
- ✅ Правила для порта 3478 (TURN TCP/UDP)
- ⚠️ Правило для порта 22 (SSH) **НЕ удаляется** для безопасности

### 6. Логи и кэш
- ✅ Логи VoiceHub
- ✅ Кэш пакетов apt

## Примеры использования

### Пример 1: Полное удаление

```bash
sudo ./uninstall.sh --all
```

Удалит всё без подтверждений.

### Пример 2: Удаление с сохранением БД

```bash
sudo ./uninstall.sh --keep-db
```

Удалит всё, кроме базы данных. Полезно если вы планируете переустановку.

### Пример 3: Удаление только VoiceHub

```bash
sudo ./uninstall.sh --keep-db --keep-go --keep-node --keep-turn
```

Удалит только файлы VoiceHub и сервис, оставив всё остальное.

### Пример 4: Интерактивное удаление

```bash
sudo ./uninstall.sh
```

Скрипт будет спрашивать подтверждение для каждого действия.

## Что делать после удаления

### 1. Перезагрузка сервера

```bash
sudo reboot
```

Рекомендуется перезагрузить сервер для очистки всех ресурсов.

### 2. Проверка удаления

```bash
# Проверка сервиса
systemctl status voicehub

# Проверка директории
ls -la /opt/voicehub

# Проверка БД
sudo -u postgres psql -l | grep voicehub

# Проверка Go
go version

# Проверка Node.js
node --version

# Проверка TURN
turnserver -v
```

### 3. Ручное удаление (если осталось)

Если что-то осталось, удалите вручную:

```bash
# Удалить сервис
sudo rm -f /etc/systemd/system/voicehub.service
sudo systemctl daemon-reload

# Удалить директорию
sudo rm -rf /opt/voicehub

# Удалить БД
sudo -u postgres psql -c "DROP DATABASE IF EXISTS voicehub;"
sudo -u postgres psql -c "DROP USER IF EXISTS voicehub;"

# Удалить Go
sudo rm -rf /usr/local/go
sudo sed -i '/\/usr\/local\/go\/bin/d' ~/.bashrc

# Удалить Node.js
sudo apt-get remove nodejs npm
sudo apt-get autoremove

# Удалить TURN
sudo apt-get remove coturn
sudo rm -f /etc/turnserver.conf

# Удалить правила firewall
sudo ufw delete allow 8080/tcp
sudo ufw delete allow 3478/tcp
sudo ufw delete allow 3478/udp
```

## Резервное копирование перед удалением

### Создать резервную копию БД

```bash
# Экспорт базы данных
sudo -u postgres pg_dump voicehub > voicehub_backup.sql

# Экспорт всех данных
sudo -u postgres pg_dumpall > postgres_full_backup.sql
```

### Создать резервную копию файлов

```bash
# Архивировать проект
sudo tar -czf voicehub_backup.tar.gz /opt/voicehub

# Архивировать конфигурации
sudo tar -czf voicehub_config_backup.tar.gz \
    /etc/systemd/system/voicehub.service \
    /etc/turnserver.conf \
    /opt/voicehub/server/.env
```

### Восстановление из резервной копии

```bash
# Восстановить файлы
sudo tar -xzf voicehub_backup.tar.gz -C /

# Восстановить БД
sudo -u postgres psql voicehub < voicehub_backup.sql

# Восстановить сервис
sudo systemctl daemon-reload
sudo systemctl enable voicehub
sudo systemctl start voicehub
```

## Устранение проблем

### Проблема: Скрипт не запускается

**Решение:**
```bash
# Сделать скрипт исполняемым
chmod +x uninstall.sh

# Запустить с правами root
sudo ./uninstall.sh
```

### Проблема: Ошибка "Permission denied"

**Решение:**
```bash
# Запустить с sudo
sudo ./uninstall.sh
```

### Проблема: Сервис не останавливается

**Решение:**
```bash
# Принудительная остановка
sudo systemctl stop voicehub
sudo systemctl kill voicehub

# Удалить сервис вручную
sudo rm -f /etc/systemd/system/voicehub.service
sudo systemctl daemon-reload
```

### Проблема: База данных не удаляется

**Решение:**
```bash
# Остановить PostgreSQL
sudo systemctl stop postgresql

# Удалить БД вручную
sudo -u postgres psql -c "DROP DATABASE IF EXISTS voicehub;"
sudo -u postgres psql -c "DROP USER IF EXISTS voicehub;"

# Удалить файлы БД
sudo rm -rf /var/lib/postgresql

# Запустить PostgreSQL
sudo systemctl start postgresql
```

### Проблема: Файлы не удаляются

**Решение:**
```bash
# Принудительное удаление
sudo rm -rf /opt/voicehub

# Проверка прав
sudo ls -la /opt/voicehub

# Изменение владельца
sudo chown -R root:root /opt/voicehub
sudo rm -rf /opt/voicehub
```

## Безопасность

### Что скрипт НЕ удаляет

- ✅ SSH доступ (порт 22)
- ✅ Системные файлы
- ✅ Другие приложения
- ✅ Пользовательские данные (кроме voicehub)

### Что скрипт удаляет

- ❌ Все файлы VoiceHub
- ❌ Базу данных voicehub
- ❌ Сервис voicehub
- ❌ Правила firewall для VoiceHub
- ❌ Логи VoiceHub

## Рекомендации

### Перед удалением

1. ✅ Создайте резервную копию БД
2. ✅ Создайте резервную копию файлов
3. ✅ Убедитесь что другие пользователи не используют сервер
4. ✅ Предупредите пользователей о отключении сервиса

### После удаления

1. ✅ Перезагрузите сервер
2. ✅ Проверьте что всё удалено
3. ✅ Очистите историю команд: `history -c`
4. ✅ Проверьте firewall: `sudo ufw status`
5. ✅ Проверьте открытые порты: `sudo netstat -tulpn`

## Альтернативные сценарии

### Сценарий 1: Переустановка

```bash
# Удаление с сохранением БД
sudo ./uninstall.sh --keep-db --keep-go --keep-node

# Переустановка
./deploy.sh YOUR_SERVER_IP
```

### Сценарий 2: Миграция на другой сервер

```bash
# На старом сервере: создание резервной копии
sudo -u postgres pg_dump voicehub > voicehub_backup.sql
sudo tar -czf voicehub_files.tar.gz /opt/voicehub

# Копирование на новый сервер
scp voicehub_backup.sql voicehub_files.tar.gz user@newserver:/tmp/

# На новом сервере: восстановление
sudo ./uninstall.sh --all
scp user@oldserver:/tmp/voicehub_* .
# ... восстановление из бэкапа
```

### Сценарий 3: Временное отключение

```bash
# Остановка сервиса (без удаления)
sudo systemctl stop voicehub
sudo systemctl disable voicehub

# Для повторного включения
sudo systemctl enable voicehub
sudo systemctl start voicehub
```

## Поддержка

Если возникли проблемы:

1. Проверьте логи: `sudo journalctl -u voicehub -n 50`
2. Проверьте статус: `sudo systemctl status voicehub`
3. Проверьте файлы: `sudo ls -la /opt/voicehub`
4. Создайте issue на GitHub

## См. также

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Инструкция по развертыванию
- [QUICK_START.md](./QUICK_START.md) - Быстрый старт
- [README.md](./README.md) - Основная документация

---

**Будьте осторожны при удалении! Это действие необратимо!**
