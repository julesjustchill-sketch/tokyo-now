#!/bin/zsh
cd "$(dirname "$0")"

PORT=8080
URL="http://127.0.0.1:${PORT}/japan_now.html"

if ! curl -fsI "$URL" >/dev/null 2>&1; then
  OLD_PID=$(lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null)
  if [ -n "$OLD_PID" ]; then
    kill $OLD_PID 2>/dev/null
    sleep 0.5
  fi
  python3 -m http.server ${PORT} --bind 127.0.0.1 >/tmp/japan_now_server.log 2>&1 &
  sleep 1
fi

open "$URL"
