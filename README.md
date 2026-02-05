# Lyrics Slide Generator

A tool to create beautiful PowerPoint slides from song lyrics. Search for songs on Shironet and generate presentation slides automatically.

## Features

- Search for songs on Shironet
- Extract lyrics automatically
- Generate PPTX slides with:
  - Multi-column layout for long lyrics
  - RTL support for Hebrew
  - Colored sections (verse/chorus)
  - Background images
  - Dark theme design

## Project Structure

```
slides_songs_shironet/
├── webapp/
│   ├── frontend/     # React app (Vite)
│   └── backend/      # FastAPI server
├── lyrics/           # Downloaded lyrics (gitignored)
├── output/           # Generated PPTX files (gitignored)
└── scripts/          # Standalone Python scripts
```

## Quick Start

### 1. Backend Setup

```bash
cd webapp/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

# Run the server
python main.py
```

The backend runs on `http://localhost:8000`

### 2. Frontend Setup

```bash
cd webapp/frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`

### 3. Use the App

1. Open `http://localhost:5173` in your browser
2. Enter a song name to search
3. Click "Generate PPTX" on any result
4. The slide will download automatically

## Standalone Scripts

If you prefer command-line tools:

```bash
# Extract lyrics from a list of URLs
python extract_lyrics.py

# Generate PPTX from lyrics files
python create_lyrics_pptx.py
```

## Notes

- The app uses Playwright with a visible browser to avoid bot detection
- Shironet may occasionally show CAPTCHAs - solve them manually if needed
- Lyrics are copyrighted - use for personal purposes only

## Deployment

### GitHub Pages (Frontend Only)

1. Push to GitHub
2. Go to repo Settings → Pages → Source: GitHub Actions
3. Set `BACKEND_URL` variable in repo settings (Settings → Secrets → Variables)
4. The workflow auto-deploys on push to master/main

### Backend Deployment (Render - Free Tier)

1. Create account at [render.com](https://render.com)
2. New → Web Service → Connect your repo
3. Settings:
   - Root Directory: `webapp/backend`
   - Build Command: `pip install -r requirements.txt && playwright install chromium --with-deps`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Copy the URL and set as `BACKEND_URL` in GitHub repo variables

## Tech Stack

- **Frontend**: React, Vite
- **Backend**: FastAPI, Playwright, python-pptx
- **Styling**: Custom CSS with RTL support
