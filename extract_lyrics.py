#!/usr/bin/env python3
"""
Lyrics Extractor Script
-----------------------
Extracts lyrics from Shironet URLs listed in shironet_urls.md
and saves them as text files in the lyrics/ folder.

Usage: python extract_lyrics.py

Note: This script is for personal use only. 
Respect copyright and Shironet's terms of service.
"""

import re
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright


def sanitize_filename(name: str) -> str:
    """Convert song name to valid filename."""
    # Remove invalid filename characters
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    # Replace spaces with underscores
    name = name.replace(' ', '_')
    # Limit length
    return name[:100]


def parse_markdown_table(md_path: str) -> list[dict]:
    """Parse the markdown file and extract song info with URLs."""
    songs = []
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for line in lines:
        # Skip header rows and empty lines
        if not line.startswith('|') or '---' in line or 'Song Name' in line:
            continue
        
        parts = [p.strip() for p in line.split('|')]
        if len(parts) >= 4:
            index = parts[1]
            name = parts[2]
            url = parts[3]
            
            # Skip entries without valid URLs
            if url and url.startswith('http'):
                songs.append({
                    'index': index,
                    'name': name,
                    'url': url
                })
    
    return songs


def extract_lyrics(page, url: str) -> str:
    """Navigate to URL and extract lyrics text."""
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(2000)  # Wait for JS to render
    
    # Find the lyrics element
    lyrics_elem = page.query_selector('span.artist_lyrics_text')
    if lyrics_elem:
        return lyrics_elem.inner_text()
    
    return ""


def main():
    # Setup paths
    base_dir = Path(__file__).parent
    md_path = base_dir / 'shironet_urls.md'
    lyrics_dir = base_dir / 'lyrics'
    lyrics_dir.mkdir(exist_ok=True)
    
    # Parse songs from markdown
    songs = parse_markdown_table(str(md_path))
    print(f"Found {len(songs)} songs with URLs")
    
    # Launch browser
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # headless=False to avoid bot detection
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        for song in songs:
            filename = sanitize_filename(song['name']) + '.txt'
            filepath = lyrics_dir / filename
            
            # Skip if already exists
            if filepath.exists():
                print(f"Skipping {song['name']} - already exists")
                continue
            
            print(f"Extracting: {song['name']}")
            try:
                lyrics = extract_lyrics(page, song['url'])
                if lyrics:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(f"# {song['name']}\n\n")
                        f.write(lyrics)
                    print(f"  ✓ Saved to {filename}")
                else:
                    print(f"  ✗ No lyrics found")
            except Exception as e:
                print(f"  ✗ Error: {e}")
            
            # Be nice to the server
            time.sleep(2)
        
        browser.close()
    
    print("\nDone!")


if __name__ == '__main__':
    main()
