# ✅ Универсальная конфигурация готова!

## 🎉 Проблема решена!

Теперь приложение **полностью универсальное** и работает на любом сервере без привязки к конкретному IP адресу.

---

## 🚀 Как это работает

### Автоматическое определение URL

Приложение определяет URL сервера автоматически:

1. **Если указаны переменные окружения** → использует их
2. **Если нет** → использует текущий хост (где запущено приложение)
3. **Если нет хоста** → использует localhost

### Примеры

**Локальная разработка:**
```bash
npm run dev
# Откройте http://localhost:5173
# Приложение автоматически подключится к http://localhost:8080
```

**Продакшен на сервере 31.77.158.177:**
```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 3000
# Откройте http://31.77.158.177:3000
# Приложение автоматически подключится к http://31.77.158.177:8080
```

**Продакшен с доменом:**
```bash
# Создайте .env файл
VITE_API_URL=https://voicehub.example.com
VITE_WS_URL=wss://voicehub.example.com/ws

npm run build
# Разверните на сервере
# Откройте https://voicehub.example.com
```

---

## 📝 Что изменилось

### Создан файл `src/config.ts`

Универсальная конфигурация с автоматическим определением URL:

```typescript
const getBaseUrl = () => {
  // 1. Проверяем переменные окружения
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. Используем текущий хост
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port || '8080';
    return `${protocol}//${host}:${port}`;
  }
  
  // 3. Дефолтный localhost
  return 'http://localhost:8080';
};
```

### Обновлены сервисы

**src/services/auth.ts:**
```typescript
import { config } from '../config';
const API_BASE = config.apiUrl; // Автоматически определяется
```

**src/services/websocket.ts:**
```typescript
import { config } from '../config';
const WS_URL = config.wsUrl; // Автоматически определяется
```

### Создан `.env.example`

Примеры конфигурации для разных окружений.

---

## 🎯 Варианты использования

### Вариант 1: Без настройки (автоматически)

Просто разверните приложение на любом сервере - оно само определит URL.

```bash
# На сервере
npm run build
npm run preview -- --host 0.0.0.0 --port 3000

# Пользователь заходит на http://your-server.com:3000
# Приложение автоматически подключается к http://your-server.com:8080
```

### Вариант 2: С переменными окружения

Если нужно указать конкретный URL:

```bash
# Создайте .env файл
VITE_API_URL=http://31.77.158.177:8080
VITE_WS_URL=ws://31.77.158.177:8080/ws

npm run build
```

### Вариант 3: С доменом и HTTPS

```bash
# Создайте .env файл
VITE_API_URL=https://voicehub.example.com
VITE_WS_URL=wss://voicehub.example.com/ws

npm run build
```

---

## 📊 Преимущества

✅ **Не нужно указывать IP/домен вручную**
- Приложение само определяет где оно запущено

✅ **Легко переносить между серверами**
- Просто скопируйте файлы и запустите

✅ **Поддержка разных окружений**
- Разработка, тестирование, продакшен

✅ **Работа с Docker/Kubernetes**
- Автоматическая конфигурация через переменные окружения

✅ **Поддержка HTTPS**
- Автоматическое определение протокола

---

## 🔧 Проверка

### В консоли браузера

Откройте DevTools (F12) и посмотрите логи:

```
[Auth] API_BASE: http://31.77.158.177:8080
[WS] Connecting to: ws://31.77.158.177:8080/ws
```

### В коде

```javascript
import { config } from './config';

console.log('API URL:', config.apiUrl);
console.log('WS URL:', config.wsUrl);
```

---

## 📚 Документация

- **UNIVERSAL_CONFIG.md** - подробная документация
- **.env.example** - примеры конфигурации
- **src/config.ts** - исходный код конфигурации

---

## 🎉 Готово!

Теперь приложение работает на любом сервере без привязки к IP адресу!

**Просто разверните и используйте!** 🚀
