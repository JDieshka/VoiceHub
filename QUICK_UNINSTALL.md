# 🗑️ Быстрое удаление VoiceHub

## Использование

### 1. Сделать скрипт исполняемым
```bash
chmod +x uninstall.sh
```

### 2. Запустить удаление

**Интерактивный режим (рекомендуется):**
```bash
sudo ./uninstall.sh
```

**Автоматическое удаление всего:**
```bash
sudo ./uninstall.sh --all
```

**Удаление с сохранением компонентов:**
```bash
# Оставить базу данных
sudo ./uninstall.sh --keep-db

# Оставить Go и Node.js
sudo ./uninstall.sh --keep-go --keep-node

# Оставить TURN сервер
sudo ./uninstall.sh --keep-turn
```

## Флаги

| Флаг | Описание |
|------|----------|
| `--all` | Удалить всё без подтверждений |
| `--keep-db` | Оставить базу данных PostgreSQL |
| `--keep-go` | Оставить Go установленным |
| `--keep-node` | Оставить Node.js установленным |
| `--keep-turn` | Оставить TURN сервер |
| `--force` | Принудительное удаление |
| `-h, --help` | Показать справку |

## Что удаляется

✅ VoiceHub systemd service  
✅ Файлы проекта (`/opt/voicehub`)  
✅ База данных PostgreSQL (опционально)  
✅ Go (опционально)  
✅ Node.js (опционально)  
✅ TURN сервер (опционально)  
✅ Правила firewall для VoiceHub  
✅ Логи и кэш  

⚠️ **НЕ удаляется:** SSH доступ (порт 22) для безопасности

## Примеры

### Полное удаление
```bash
sudo ./uninstall.sh --all
```

### Удаление с сохранением БД (для переустановки)
```bash
sudo ./uninstall.sh --keep-db --keep-go --keep-node
```

### Интерактивное удаление
```bash
sudo ./uninstall.sh
```

## После удаления

```bash
# Перезагрузить сервер (рекомендуется)
sudo reboot

# Проверить удаление
systemctl status voicehub
ls -la /opt/voicehub
sudo -u postgres psql -l | grep voicehub
```

## Резервное копирование перед удалением

```bash
# Создать резервную копию БД
sudo -u postgres pg_dump voicehub > voicehub_backup.sql

# Создать резервную копию файлов
sudo tar -czf voicehub_backup.tar.gz /opt/voicehub
```

## Подробная документация

См. [UNINSTALL_GUIDE.md](./UNINSTALL_GUIDE.md) для полной документации.

---

**⚠️ ВНИМАНИЕ: Удаление необратимо! Создайте резервную копию перед удалением!**
