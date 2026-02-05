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

## Tech Stack

- **Frontend**: React, Vite
- **Backend**: FastAPI, Playwright, python-pptx
- **Styling**: Custom CSS with RTL support
