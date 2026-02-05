"""
Tool to search for and download images related to songs (singer images or song-related)
"""
import requests
from PIL import Image
import io
import os


def search_image_url(song_title: str, artist_name: str = None, query_type: str = "singer") -> str:
    """
    Search for an image URL using a simple approach.
    For now, returns None - images will need to be manually added or fetched from another source.
    
    Args:
        song_title: Title of the song
        artist_name: Name of the artist
        query_type: "singer" or "song" to determine search focus
    
    Returns:
        URL to an image, or None
    """
    # Note: Without browser automation and without an image API key,
    # we'll need to use a different approach. For now, return None
    # and images can be manually added or we can use a placeholder approach
    
    # Option: Use Unsplash API (requires API key) or similar
    # Option: Use Google Custom Search API (requires API key)
    # Option: Use placeholder images or local image database
    
    return None


def download_image(url: str, save_path: str) -> bool:
    """
    Download an image from a URL and save it.
    
    Args:
        url: URL of the image
        save_path: Path to save the image
    
    Returns:
        True if successful, False otherwise
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Verify it's an image
        img = Image.open(io.BytesIO(response.content))
        img.save(save_path)
        return True
    except Exception as e:
        print(f"Error downloading image from {url}: {e}")
        return False


def get_placeholder_image_path() -> str:
    """
    Returns path to a placeholder image, or creates one if needed.
    
    Returns:
        Path to placeholder image
    """
    placeholder_path = "images/placeholder.png"
    os.makedirs("images", exist_ok=True)
    
    if not os.path.exists(placeholder_path):
        # Create a simple placeholder image
        img = Image.new('RGB', (1920, 1080), color=(100, 100, 150))
        img.save(placeholder_path)
    
    return placeholder_path
