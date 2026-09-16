# 🔧 Быстрое исправление ошибки с зависимостями Go

## Проблема

При выполнении `./install.sh` появляется ошибка:
```
missing go.sum entry for module providing package...
```

## Решение

### Шаг 1: Запустите скрипт исправления зависимостей

```bash
cd /home/VoiceHub
chmod +x fix-dependencies.sh
sudo ./fix-dependencies.sh
```

Этот скрипт:
- ✅ Определит версию Go
- ✅ Обновит `go.mod` для правильной версии
- ✅ Удалит старый `go.sum`
- ✅ Загрузит все зависимости
- ✅ Скомпилирует бинарник

### Шаг 2: Запустите установку

```bash
sudo ./install.sh
```

---

## Альтернативное решение (вручную)

Если скрипт не работает, выполните вручную:

```bash
cd /home/VoiceHub/server

# Определите версию Go
go version

# Если Go < 1.24, используйте упрощенную версию
if go version | grep -q "go1.2[0-3]"; then
    echo "Используется упрощенная версия (без SFU)"
    cp main-simple.go main.go
    
    # Обновите go.mod без pion/webrtc
    cat > go.mod << 'EOF'
module voicehub-server

go 1.21

require (
	github.com/golang-jwt/jwt/v5 v5.2.0
	github.com/google/uuid v1.6.0
	github.com/gorilla/websocket v1.5.1
	github.com/lib/pq v1.10.9
	golang.org/x/crypto v0.17.0
)
EOF
else
    echo "Используется полная версия (с SFU)"
fi

# Удалите старый go.sum
rm -f go.sum

# Загрузите зависимости
go mod download

# Обновите go.sum
go mod tidy

# Скомпилируйте
go build -o voicehub-server main.go

# Сделайте исполняемым
chmod +x voicehub-server

# Вернитесь в корень проекта
cd ..
```

Затем запустите установку:
```bash
sudo ./install.sh
```

---

## Проверка

После исправления проверьте:

```bash
cd /home/VoiceHub/server

# Бинарник должен существовать
ls -lh voicehub-server

# Должен быть исполняемым
file voicehub-server

# Проверьте версию
./voicehub-server --help 2>&1 | head -n 1 || echo "Бинарник работает"
```

---

## Если проблема не решена

### Ошибка: "module declares its path as..."

```bash
cd /home/VoiceHub/server
go clean -modcache
rm -f go.sum
go mod download
go mod tidy
```

### Ошибка: "cannot find package"

```bash
cd /home/VoiceHub/server
go get -v ./...
go mod tidy
```

### Ошибка компиляции с pion/webrtc

Если у вас Go < 1.24, используйте упрощенную версию:

```bash
cd /home/VoiceHub/server
cp main-simple.go main.go
# Обновите go.mod как показано выше
go mod tidy
go build -o voicehub-server main.go
```

---

## Полная переустановка

Если ничего не помогает:

```bash
# Удалите старую установку
cd /home
sudo rm -rf VoiceHub

# Клонируйте заново
git clone -b go-desktop-voice-app-5e8f3 --single-branch https://github.com/JDieshka/VoiceHub.git
cd VoiceHub

# Исправьте зависимости
chmod +x fix-dependencies.sh
sudo ./fix-dependencies.sh

# Установите
sudo ./install.sh
```

---

## Полезные команды

```bash
# Проверить версию Go
go version

# Очистить кэш модулей
go clean -modcache

# Проверить зависимости
go mod verify

# Показать дерево зависимостей
go mod graph

# Проверить что все зависимости загружены
go list -m all
```

---

## Итог

После выполнения `fix-dependencies.sh` и `install.sh`:

✅ Зависимости загружены  
✅ Бинарник скомпилирован  
✅ Сервис настроен  
✅ Сервер запущен  

**Сервер доступен по адресу:** `http://YOUR_SERVER_IP:8080`
