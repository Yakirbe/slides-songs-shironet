# Lyrics Slide Generator

A 100% client-side tool to create beautiful PowerPoint slides from song lyrics. No server needed!

**Live Demo**: [https://YOUR_USERNAME.github.io/slides_songs_shironet](https://YOUR_USERNAME.github.io/slides_songs_shironet)

## Features

- Paste lyrics → Generate PPTX instantly
- Multi-column layout for long lyrics
- RTL support for Hebrew
- Colored sections (verse/chorus)
- Background images
- Dark theme design
- **100% client-side** - no data sent to servers

## Deploy to GitHub Pages

1. Fork/push to GitHub
2. Go to repo **Settings → Pages → Source: GitHub Actions**
3. Done! Auto-deploys on every push

## Local Development

```bash
cd webapp/frontend
npm install
npm run dev
```

Open `http://localhost:5173`

## How to Use

1. Enter song title
2. Paste lyrics (separate verses with empty lines)
3. Click "Generate PPTX"
4. Download starts automatically

## Tech Stack

- **Framework**: React + Vite
- **PPTX**: PptxGenJS (client-side)
- **Styling**: Custom CSS with RTL support
- **Hosting**: GitHub Pages (static)
