# 🚀 Быстрый старт: Автоматические релизы

## Как создать релиз за 3 шага

### 1. Измените версию в package.json

```json
{
  "name": "voicehub",
  "version": "2.1.0",  // ← Измените версию
  ...
}
```

### 2. Закоммитьте и запушите

```bash
git add package.json
git commit -m "chore: bump version to 2.1.0"
git push origin main
```

### 3. Дождитесь автоматической сборки (10-15 минут)

GitHub Actions автоматически:
- ✅ Создаст тег `v2.1.0`
- ✅ Соберет frontend и Windows приложение
- ✅ Создаст GitHub Release
- ✅ Загрузит все файлы

**Готово!** Релиз создан! 🎉

---

## Проверка статуса

1. Перейдите в **Actions** на GitHub
2. Найдите workflow **Auto Tag & Release**
3. Дождитесь завершения всех job

## Проверка релиза

1. Перейдите в **Releases** на GitHub
2. Найдите релиз `v2.1.0`
3. Скачайте нужные файлы:
   - Windows MSI установщик
   - Windows EXE установщик
   - Web версия

---

## Версионирование

### Patch (2.0.0 → 2.0.1)
Исправления ошибок

### Minor (2.0.0 → 2.1.0)
Новая функциональность

### Major (2.0.0 → 3.0.0)
Breaking changes

---

## Подробнее

- [AUTO_RELEASE.md](./AUTO_RELEASE.md) - полная документация
- [AUTO_RELEASE_IMPLEMENTATION.md](./AUTO_RELEASE_IMPLEMENTATION.md) - как это работает
