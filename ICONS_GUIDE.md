# 🎨 Генерация иконок для VoiceHub

## Проблема

Tauri требует иконки для сборки приложения. Ошибка:
```
`icons/icon.ico` not found; required for generating a Windows Resource file
```

## Решение

### Шаг 1: Скачайте исходную иконку

Скачайте иконку из этого URL и сохраните как `public/icon-1024.png`:

https://image.qwenlm.ai/generated-images/2105c757-0b34-401c-ab28-89df2f3a57fa/_result.png

Или создайте свою иконку 1024x1024 пикселей.

### Шаг 2: Установите зависимости

```bash
npm install --save-dev sharp
```

### Шаг 3: Запустите скрипт генерации

```bash
node scripts/generate-icons.js
```

Скрипт автоматически создаст все необходимые иконки:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png` (256x256)
- `icon.png` (512x512)
- `tray.png` (64x64)
- `icon.ico` (Windows)

### Альтернатива: Ручное создание

Если скрипт не работает, создайте иконки вручную:

1. **Скачайте исходную иконку** (512x512 или больше)
2. **Создайте директорию** `src-tauri/icons/`
3. **Создайте иконки** с помощью любого графического редактора:
   - `32x32.png`
   - `128x128.png`
   - `128x128@2x.png` (256x256)
   - `icon.png` (512x512)
   - `tray.png` (64x64)
4. **Создайте icon.ico** с помощью онлайн-конвертера:
   - https://convertico.com/
   - https://icoconvert.com/

### Альтернатива 2: Упростить конфигурацию

Если не хотите создавать иконки, измените `src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "bundle": {
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png"
      ]
    },
    "systemTray": {
      "iconPath": "icons/tray.png"
    }
  }
}
```

И создайте только эти файлы (можно использовать одну иконку для всех).

## Быстрое решение для тестирования

Создайте простые заглушки:

```bash
# Создайте директорию
mkdir -p src-tauri/icons

# Создайте простые PNG файлы (можно использовать любой PNG)
# Скачайте любую иконку и скопируйте её с разными именами:
cp your-icon.png src-tauri/icons/32x32.png
cp your-icon.png src-tauri/icons/128x128.png
cp your-icon.png src-tauri/icons/128x128@2x.png
cp your-icon.png src-tauri/icons/icon.png
cp your-icon.png src-tauri/icons/tray.png

# Для icon.ico используйте онлайн-конвертер
# https://convertico.com/
```

## Проверка

После создания иконок проверьте:

```bash
ls -la src-tauri/icons/
```

Должны быть файлы:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.png
- tray.png
- icon.ico

## Пересборка

После создания иконок пересоберите приложение:

```bash
npm run tauri build
```

Или через GitHub Actions (автоматически).

## Примечание

Иконки должны быть в формате PNG с прозрачностью (для tray) или без (для остальных).

Рекомендуемый размер исходной иконки: 1024x1024 пикселей.
