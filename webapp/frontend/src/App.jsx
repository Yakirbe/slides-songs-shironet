import { useState } from 'react'
import pptxgen from 'pptxgenjs'

// Fetch via allorigins API (JSON response with contents)
async function fetchWithProxy(url) {
  // Use allorigins.win get endpoint (returns JSON with contents field)
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  
  const response = await fetch(proxyUrl)
  if (!response.ok) {
    throw new Error(`Proxy error: ${response.status}`)
  }
  
  const data = await response.json()
  if (!data.contents) {
    throw new Error('No content returned')
  }
  
  return data.contents
}

// Section colors (cycling through for verses/choruses)
const SECTION_COLORS = [
  'E8EAFF', // White-blue
  'FFE4C4', // Peach
  'C8FFD4', // Mint
  'FFD0E0', // Pink
  'D0E8FF', // Light blue
  'FFFFC0', // Yellow
]

function isHebrew(text) {
  for (const char of text) {
    if (char >= '\u0590' && char <= '\u05FF') return true
  }
  return false
}

function cleanPunctuation(text) {
  return text.replace(/[,.]/g, '')
}

function splitIntoSections(lines) {
  const sections = []
  let current = []
  
  for (const line of lines) {
    if (!line.trim()) {
      if (current.length) {
        sections.push(current)
        current = []
      }
    } else {
      current.push(cleanPunctuation(line))
    }
  }
  if (current.length) sections.push(current)
  return sections
}

function getOptimalLayout(lineCount) {
  if (lineCount <= 15) return { columns: 1, fontSize: 18 }
  if (lineCount <= 28) return { columns: 2, fontSize: 16 }
  if (lineCount <= 42) return { columns: 3, fontSize: 14 }
  if (lineCount <= 56) return { columns: 4, fontSize: 12 }
  return { columns: 5, fontSize: 10 }
}

// Search Shironet for songs
async function searchShironet(query) {
  const searchUrl = `https://shironet.mako.co.il/searchSongs?q=${encodeURIComponent(query)}&type=works`
  
  const html = await fetchWithProxy(searchUrl)
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  const results = []
  
  // Look for search result rows in tables
  const rows = doc.querySelectorAll('tr')
  
  rows.forEach(row => {
    // Find the song link (has type=lyrics and wrkid)
    const songLink = row.querySelector('a[href*="type=lyrics"][href*="wrkid"]')
    if (!songLink) return
    
    const href = songLink.getAttribute('href')
    const title = songLink.textContent.trim()
    if (!title) return
    
    // Find artist - look for link with prfid but without wrkid (artist page, not song page)
    let artist = ''
    const allLinks = row.querySelectorAll('a[href*="prfid"]')
    for (const link of allLinks) {
      const linkHref = link.getAttribute('href') || ''
      // Artist links don't have wrkid
      if (!linkHref.includes('wrkid') && link.textContent.trim()) {
        artist = link.textContent.trim()
        break
      }
    }
    
    const fullUrl = href.startsWith('/') 
      ? `https://shironet.mako.co.il${href}` 
      : href
    
    // Avoid duplicates
    if (!results.find(r => r.url === fullUrl)) {
      results.push({ title, artist, url: fullUrl })
    }
  })
  
  return results.slice(0, 15)
}

// Extract lyrics from Shironet page
async function extractLyrics(url) {
  const html = await fetchWithProxy(url)
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // Get title - try multiple selectors
  let title = ''
  const titleSelectors = ['.artist_song_name_txt', 'h1.artist_song_name', 'h1', '.work_title']
  for (const sel of titleSelectors) {
    const elem = doc.querySelector(sel)
    if (elem?.textContent?.trim()) {
      title = elem.textContent.trim()
      break
    }
  }
  
  // Get artist name for title
  let artist = ''
  const artistElem = doc.querySelector('.artist_singer_title a, .artist_name a')
  if (artistElem?.textContent?.trim()) {
    artist = artistElem.textContent.trim()
  }
  
  if (title && artist && !title.includes(artist)) {
    title = `${title} - ${artist}`
  }
  
  // Get lyrics - the main lyrics are in span.artist_lyrics_text
  // The HTML structure uses <br> tags for line breaks
  let lyrics = ''
  const lyricsElem = doc.querySelector('span.artist_lyrics_text')
  
  if (lyricsElem) {
    // Get innerHTML and convert <br> to newlines
    let lyricsHtml = lyricsElem.innerHTML
    // Replace various <br> formats with newlines
    lyricsHtml = lyricsHtml.replace(/<br\s*\/?>/gi, '\n')
    // Remove any other HTML tags
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = lyricsHtml
    lyrics = tempDiv.textContent.trim()
  }
  
  // Fallback selectors
  if (!lyrics) {
    const fallbackSelectors = ['.artist_lyrics_text', '.lyrics_text', 'pre']
    for (const sel of fallbackSelectors) {
      const elem = doc.querySelector(sel)
      if (elem?.textContent?.trim()) {
        lyrics = elem.textContent.trim()
        break
      }
    }
  }
  
  if (!lyrics) {
    throw new Error('Could not find lyrics on page')
  }
  
  return { title, lyrics }
}

// Generate PPTX
async function generatePptx(title, lyricsText) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  
  const lines = lyricsText.split('\n')
  const isRtl = isHebrew(title) || isHebrew(lyricsText)
  
  const sections = splitIntoSections(lines)
  const coloredLines = []
  
  for (let i = 0; i < sections.length; i++) {
    const color = SECTION_COLORS[i % SECTION_COLORS.length]
    for (const line of sections[i]) {
      coloredLines.push({ text: line, color })
    }
    if (i < sections.length - 1) {
      coloredLines.push({ text: '', color: SECTION_COLORS[0] })
    }
  }
  
  const layout = getOptimalLayout(coloredLines.length)
  const { columns, fontSize } = layout
  
  const slide = pptx.addSlide()
  
  // Background image
  const seed = Math.abs(title.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000
  slide.addImage({
    path: `https://picsum.photos/seed/${seed}/1920/1080`,
    x: 0, y: 0, w: '100%', h: '100%'
  })
  
  // Title
  slide.addText(title, {
    x: 0.2, y: 0.15, w: '96%', h: 0.5,
    fontSize: 28, bold: true,
    color: '1E1E32',
    align: 'center'
  })
  
  // Split into columns
  const linesPerCol = Math.ceil(coloredLines.length / columns)
  const cols = []
  for (let i = 0; i < columns; i++) {
    cols.push(coloredLines.slice(i * linesPerCol, (i + 1) * linesPerCol))
  }
  
  const margin = 0.3
  const colGap = 0.2
  const contentTop = 0.75
  const contentHeight = 6.5
  const availableWidth = 13.33 - (2 * margin)
  const colWidth = (availableWidth - (colGap * (columns - 1))) / columns
  
  for (let i = 0; i < cols.length; i++) {
    const colLines = cols[i]
    
    let left
    if (isRtl) {
      left = 13.33 - margin - colWidth - (i * (colWidth + colGap))
    } else {
      left = margin + (i * (colWidth + colGap))
    }
    
    slide.addShape('roundRect', {
      x: left - 0.1, y: contentTop - 0.05,
      w: colWidth + 0.2, h: contentHeight + 0.1,
      fill: { color: '1E1E32', transparency: 20 },
      line: { color: '1E1E32', transparency: 100 }
    })
    
    const textObjects = colLines.map(item => ({
      text: item.text + '\n',
      options: { color: item.color, fontSize, breakLine: true }
    }))
    
    slide.addText(textObjects, {
      x: left, y: contentTop,
      w: colWidth, h: contentHeight,
      valign: 'top',
      align: isRtl ? 'right' : 'left',
      rtlMode: isRtl
    })
  }
  
  await pptx.writeFile({ fileName: `${title.replace(/\s+/g, '_')}.pptx` })
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [lyrics, setLyrics] = useState('')
  const [title, setTitle] = useState('')
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    
    setSearching(true)
    setError('')
    setResults([])
    setSelectedSong(null)
    setLyrics('')
    
    try {
      const searchResults = await searchShironet(query.trim())
      setResults(searchResults)
      if (searchResults.length === 0) {
        setError('No results found')
      }
    } catch (err) {
      setError('Search failed: ' + err.message)
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const handleSelectSong = async (song) => {
    setLoading(song.url)
    setError('')
    
    try {
      const { title: extractedTitle, lyrics: extractedLyrics } = await extractLyrics(song.url)
      setSelectedSong(song)
      setTitle(extractedTitle || `${song.title} - ${song.artist}`)
      setLyrics(extractedLyrics)
    } catch (err) {
      setError('Failed to load lyrics: ' + err.message)
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  const handleGenerate = async () => {
    if (!title.trim() || !lyrics.trim()) {
      setError('No lyrics loaded')
      return
    }
    
    setGenerating(true)
    setError('')
    
    try {
      await generatePptx(title.trim(), lyrics.trim())
    } catch (err) {
      setError('Failed to generate: ' + err.message)
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo">
            <span className="logo-icon">🎵</span>
            <h1>Lyrics Slide Generator</h1>
          </div>
          <p className="subtitle">Search Shironet and generate presentation slides</p>
        </header>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-box">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search song on Shironet..."
              className="search-input"
              dir="auto"
            />
            <button type="submit" className="search-button" disabled={searching}>
              {searching ? <span className="spinner"></span> : 'Search'}
            </button>
          </div>
        </form>

        {error && <div className="error-message">{error}</div>}

        {results.length > 0 && !selectedSong && (
          <div className="results">
            <h2 className="results-title">Search Results</h2>
            <div className="results-list">
              {results.map((song, i) => (
                <div 
                  key={i} 
                  className="result-card"
                  onClick={() => handleSelectSong(song)}
                >
                  <div className="result-info">
                    <h3 className="result-title">{song.title}</h3>
                    <p className="result-artist">{song.artist}</p>
                  </div>
                  {loading === song.url ? (
                    <span className="spinner small"></span>
                  ) : (
                    <span className="arrow">←</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSong && lyrics && (
          <div className="editor">
            <div className="editor-header">
              <h2>{title}</h2>
              <button 
                className="back-button"
                onClick={() => { setSelectedSong(null); setLyrics(''); }}
              >
                ← Back to results
              </button>
            </div>
            
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="lyrics-input"
              dir="auto"
              rows={15}
            />
            
            <button 
              onClick={handleGenerate} 
              className="generate-button"
              disabled={generating}
            >
              {generating ? (
                <>
                  <span className="spinner"></span>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span className="download-icon">📥</span>
                  <span>Generate PPTX</span>
                </>
              )}
            </button>
          </div>
        )}

        <footer className="footer">
          <p>Searches Shironet • 100% client-side</p>
        </footer>
      </div>
    </div>
  )
}

export default App
