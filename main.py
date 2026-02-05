"""
Main script to extract lyrics from Shironet URLs and create PowerPoint slides
Uses browser navigation to extract lyrics directly from pages
"""
import re
from bs4 import BeautifulSoup
from slide_generator import create_presentation
from image_fetcher import get_placeholder_image_path


def parse_markdown_file(file_path: str) -> list:
    """Parse the markdown file to extract song titles, artists, and URLs."""
    songs = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match: number. **Title - Artist** followed by URL
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
    """
    Extract lyrics, title, and artist from Shironet HTML content.
    
    Returns:
        tuple of (lyrics_text, title, artist)
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    lyrics_text = None
    title = None
    artist = None
    
    # Method 1: Look for span with class "artist_lyrics_text" (Shironet format)
    lyrics_span = soup.find('span', {'class': 'artist_lyrics_text'})
    if lyrics_span:
        # Get raw HTML to handle <BR> tags properly
        raw_html = str(lyrics_span)
        # Replace <BR> and <br> with newlines
        lyrics_text = re.sub(r'<BR>|<br>|<br/>|<br\s*/>', '\n', raw_html, flags=re.IGNORECASE)
        # Remove remaining HTML tags
        lyrics_text = re.sub(r'<[^>]+>', '', lyrics_text)
        # Clean up whitespace
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
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    lines = [line.strip() for line in text.split('\n')]
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return '\n'.join(lines)


def main():
    """
    Main function to process all songs and create presentation.
    
    NOTE: This script expects HTML content to be fetched using browser tools.
    For each URL, you need to:
    1. Navigate to the URL using browser_navigate
    2. Fetch the HTML using mcp_fetch_fetch
    3. Save the HTML content to process
    
    Alternatively, if you have HTML files in downloaded_pages/, this script
    can process those files directly.
    """
    print("=" * 60)
    print("Shironet Lyrics to PowerPoint")
    print("=" * 60)
    
    # Parse markdown file
    songs = parse_markdown_file("shironet_urls.md")
    songs_with_urls = [s for s in songs if s.get('url')]
    
    print(f"\nFound {len(songs_with_urls)} songs with URLs")
    print("\nNOTE: This script requires HTML content to be fetched first.")
    print("Please use browser tools to navigate and fetch HTML from each URL,")
    print("or place HTML files in downloaded_pages/ directory.")
    print("=" * 60)
    
    # For now, create slides with placeholder lyrics that include the URLs
    # so users can manually add lyrics later
    songs_data = []
    
    for song in songs_with_urls:
        songs_data.append({
            'title': song['title'],
            'artist': song.get('artist', 'Unknown'),
            'lyrics': f"URL: {song['url']}\n\n[Lyrics need to be extracted from the URL above]",
            'image_path': get_placeholder_image_path()
        })
    
    # Create presentation
    if songs_data:
        output_path = create_presentation(songs_data, "output/tu_bshevat_sing_along.pptx")
        print(f"\n✅ Presentation created: {output_path}")
        print(f"Total slides: {len(songs_data)}")
        print("\nNOTE: Slides currently contain URLs. To add lyrics:")
        print("1. Use browser tools to fetch HTML from each URL")
        print("2. Extract lyrics from HTML")
        print("3. Update the presentation with actual lyrics")
    else:
        print("\nNo songs data to create presentation with.")


if __name__ == "__main__":
    main()
