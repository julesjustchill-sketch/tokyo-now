# Tokyo Now

A local-first Tokyo activity recommendation app.

## Run locally

Double-click `open_japan_now.command`, or run:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8080/japan_now.html
```

## Files

- `japan_now.html` - app UI and logic
- `spots.js` - schema, filters, labels, helper data
- `spots.json` - replaceable spot database
- `japan_now_claude.html` - single-file bundled version for Claude artifacts
