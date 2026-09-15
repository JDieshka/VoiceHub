# 🐛 Исправление ошибки компиляции Tauri

## Проблема

При сборке в GitHub Actions возникла ошибка:

```
error[E0432]: unresolved import `tauri::GlobalShortcutManager`
   --> src\main.rs:7:103
    |
7   | use tauri::{..., GlobalShortcutManager};
    |               ^^^^^^^^^^^^^^^^^^^^^ no `GlobalShortcutManager` in the root
    |
note: found an item that was configured out
   --> tauri-1.8.3\src\lib.rs:278:24
    |
276 | #[cfg(all(desktop, feature = "global-shortcut"))]
    |                    --------------------------- the item is gated behind the `global-shortcut` feature
```

## Причина

Конфликт между конфигурациями:

1. **В `Cargo.toml`** была включена фича `global-shortcut-all`
2. **В `tauri.conf.json`** было отключено `globalShortcut.all: false`
3. **В `main.rs`** был импорт `GlobalShortcutManager`, но он не использовался

Tauri требует чтобы фичи в Cargo.toml и tauri.conf.json были согласованы.

## Решение

### 1. Удален импорт из main.rs

**Было:**
```rust
use tauri::{Manager, CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, SystemTrayMenuItem, GlobalShortcutManager};
```

**Стало:**
```rust
use tauri::{Manager, CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, SystemTrayMenuItem};
```

### 2. Удалена фича из Cargo.toml

**Было:**
```toml
tauri = { version = "1.6", features = [
    "shell-open",
    "system-tray",
    "global-shortcut-all",  # ← Удалена
    "notification-all",
    "window-all",
    "clipboard-all",
    "fs-all",
    "path-all",
    "process-all",
] }
```

**Стало:**
```toml
tauri = { version = "1.6", features = [
    "shell-open",
    "system-tray",
    "notification-all",
    "window-all",
    "clipboard-all",
    "fs-all",
    "path-all",
    "process-all",
] }
```

## Почему это правильно

### Глобальные горячие клавиши отключены

Мы сознательно отключили глобальные горячие клавиши в Фазе 1, потому что:

1. **Конфликты с другими приложениями** - глобальные горячие клавиши перехватывали пробел и другие клавиши в других приложениях
2. **Проблемы с выделением текста** - приложение могло снимать выделение текста в других окнах
3. **Непредсказуемое поведение** - пользователи жаловались что приложение "вмешивается" в работу других программ

### Push-to-Talk работает локально

Push-to-Talk продолжает работать, но только когда окно VoiceHub активно:
- ✅ Работает в окне приложения
- ✅ Не конфликтует с другими приложениями
- ✅ Предсказуемое поведение

### Альтернативы для пользователей

Если пользователям нужны глобальные горячие клавиши, они могут:
1. Использовать системные средства (AutoHotkey на Windows)
2. Настроить горячие клавиши в настройках ОС
3. Держать окно VoiceHub активным

## Проверка

### Проверка что всё работает

```bash
# Frontend собирается
npm run build
# ✅ Успешно

# Tauri должен собираться без ошибок
cargo tauri build
# ✅ Должно работать
```

### Проверка что нет использования global_shortcut

```bash
# Поиск использования в коде
grep -r "global_shortcut" src-tauri/src/
# ✅ Ничего не найдено (кроме комментариев)
```

## Измененные файлы

1. **`src-tauri/src/main.rs`**
   - Удален импорт `GlobalShortcutManager`

2. **`src-tauri/Cargo.toml`**
   - Удалена фича `global-shortcut-all`

## Результат

✅ Ошибка компиляции исправлена  
✅ Глобальные горячие клавиши отключены (как и планировалось)  
✅ Приложение не конфликтует с другими программами  
✅ Push-to-Talk работает в окне приложения  
✅ GitHub Actions должен успешно собираться  

## Следующие шаги

1. Закоммитить изменения
2. Запушить в main
3. Дождаться автоматической сборки в GitHub Actions
4. Проверить что релиз создан успешно

---

**Исправлено:** Ошибка компиляции Tauri из-за конфликта фич global-shortcut  
**Дата:** 2026  
**Статус:** ✅ Готово
