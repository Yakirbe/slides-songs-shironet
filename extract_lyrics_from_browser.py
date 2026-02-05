"""
Extract lyrics from Shironet URLs using browser tools and create slides
This script processes HTML content fetched via browser tools
"""
import re
import sys
from bs4 import BeautifulSoup
from slide_generator import create_presentation
from image_fetcher import get_placeholder_image_path


def parse_markdown_file(file_path: str) -> list:
    """Parse the markdown file to extract song titles, artists, and URLs."""
    songs = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = r'(\d+)\.\s+\*\*(.+?)\*\*(?:\s+-\s+(.+?))?\s*\n\s*(https://[^\s\n]+)'
    matches = re.finditer(pattern, content, re.MULTILINE)
    
    for match in matches:
        number = int(match.group(1))
        title = match.group(2).strip()
        artist = match.group(3).strip() if match.group(3) else None
        url = match.group(4).strip()
        songs.append({'number': number, 'title': title, 'artist': artist, 'url': url})
    
    songs.sort(key=lambda x: x['number'])
    return songs


def extract_lyrics_from_html(html_content: str) -> tuple:
    """Extract lyrics, title, and artist from Shironet HTML content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    lyrics_text = None
    title = None
    artist = None
    
    # Method 1: Look for span with class "artist_lyrics_text" (Shironet format)
    lyrics_span = soup.find('span', {'class': 'artist_lyrics_text'})
    if lyrics_span:
        raw_html = str(lyrics_span)
        lyrics_text = re.sub(r'<BR>|<br>|<br/>|<br\s*/>', '\n', raw_html, flags=re.IGNORECASE)
        lyrics_text = re.sub(r'<[^>]+>', '', lyrics_text)
        lyrics_text = re.sub(r'\n{3,}', '\n\n', lyrics_text)
        lyrics_text = lyrics_text.strip()
    
    # Method 2: Look for itemprop="Lyrics"
    if not lyrics_text or len(lyrics_text) < 50:
        lyrics_elem = soup.find(attrs={'itemprop': 'Lyrics'})
        if lyrics_elem:
            raw_html = str(lyrics_elem)
            lyrics_text = re.sub(r'<BR>|<br>|<br/>|<br\s*/>', '\n', raw_html, flags=re.IGNORECASE)
            lyrics_text = re.sub(r'<[^>]+>', '', lyrics_text)
            lyrics_text = re.sub(r'\n{3,}', '\n\n', lyrics_text)
            lyrics_text = lyrics_text.strip()
    
    # Extract title
    title_h1 = soup.find('h1', {'class': 'artist_song_name_txt'})
    if title_h1:
        title = title_h1.get_text(strip=True)
    
    # Extract artist
    artist_link = soup.find('a', {'class': 'artist_singer_title'})
    if artist_link:
        artist = artist_link.get_text(strip=True)
    
    # Fallback to title tag
    if not title:
        title_tag = soup.find('title')
        if title_tag:
            title_text = title_tag.get_text(strip=True)
            if 'מילים לשיר' in title_text:
                title_text = title_text.replace('מילים לשיר', '').strip()
            if ' - ' in title_text:
                parts = title_text.split(' - ', 1)
                title = parts[0].strip()
                if not artist:
                    artist = parts[1].replace('שירונט', '').strip()
            else:
                title = title_text
    
    return lyrics_text, title, artist


def clean_lyrics(text: str) -> str:
    """Clean and format lyrics text."""
    if not text:
        return ""
    text = re.sub(r'\n{3,}', '\n\n', text)
    lines = [line.strip() for line in text.split('\n')]
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return '\n'.join(lines)


def process_html_file(html_content: str, song_info: dict) -> dict:
    """Process HTML content and return song data."""
    lyrics_text, title, artist = extract_lyrics_from_html(html_content)
    
    if lyrics_text and len(lyrics_text) > 50:
        return {
            'title': title or song_info['title'],
            'artist': artist or song_info.get('artist', 'Unknown'),
            'lyrics': clean_lyrics(lyrics_text),
            'image_path': get_placeholder_image_path()
        }
    else:
        return {
            'title': song_info['title'],
            'artist': song_info.get('artist', 'Unknown'),
            'lyrics': f"[Could not extract lyrics]\n\nURL: {song_info['url']}",
            'image_path': get_placeholder_image_path()
        }


if __name__ == "__main__":
    print("This script processes HTML content fetched via browser tools.")
    print("Use it with HTML content passed as input.")
