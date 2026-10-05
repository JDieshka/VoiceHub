#!/bin/bash

echo "🚀 VoiceHub - Запуск..."
echo ""

# Запуск Go сервера в фоне
echo "📡 Запуск Go-сервера на порту 8080..."
cd server
go run main.go &
SERVER_PID=$!
cd ..

# Ждём запуска сервера
sleep 2

# Запуск фронтенда
echo "🎨 Запуск фронтенда на порту 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ VoiceHub запущен!"
echo "   Фронтенд: http://localhost:5173"
echo "   Сервер:   ws://localhost:8080/ws"
echo ""
echo "Нажмите Ctrl+C для остановки"

# Обработка Ctrl+C
trap "kill $SERVER_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
