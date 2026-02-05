import { useState } from 'react'
import pptxgen from 'pptxgenjs'

// Fetch via allorigins API with retry
async function fetchWithProxy(url, retries = 2) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(proxyUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      if (!data.contents) {
        throw new Error('Empty response')
      }
      
      return data.contents
    } catch (e) {
      if (attempt === retries) {
        throw new Error(`Fetch failed after ${retries + 1} attempts: ${e.message}`)
      }
      // Wait before retry
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
  }
}

// Single clean color for all lyrics text
const LYRICS_COLOR = 'FFFFFF' // White

function isHebrew(text) {
  for (const char of text) {
    if (char >= '\u0590' && char <= '\u05FF') return true
  }
  return false
}

function cleanPunctuation(text) {
  return text.replace(/[,.]/g, '')
}

// Normalize lyrics: smart separator handling
function normalizeLyrics(text) {
  // Split into lines and trim
  let lines = text.split('\n').map(l => l.trim())
  
  // Count empty line patterns
  let singleEmptyCount = 0  // Single empty line between text
  let doubleEmptyCount = 0  // Two or more consecutive empty lines
  
  let consecutiveEmpty = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '') {
      consecutiveEmpty++
    } else {
      if (consecutiveEmpty === 1) singleEmptyCount++
      if (consecutiveEmpty >= 2) doubleEmptyCount++
      consecutiveEmpty = 0
    }
  }
  
  // If there are both single and double separators, remove singles (keep only doubles as breaks)
  // If only singles exist, keep them
  const hasDoubles = doubleEmptyCount > 0
  const hasSingles = singleEmptyCount > 0
  
  const normalized = []
  consecutiveEmpty = 0
  
  for (const line of lines) {
    if (line === '') {
      consecutiveEmpty++
    } else {
      // Decide whether to add separator
      if (consecutiveEmpty > 0) {
        if (hasDoubles && hasSingles) {
          // Only add separator for double+ empty lines
          if (consecutiveEmpty >= 2) {
            normalized.push('') // Single blank line as separator
          }
        } else {
          // Keep single separators as they are
          normalized.push('')
        }
      }
      normalized.push(line)
      consecutiveEmpty = 0
    }
  }
  
  // Remove leading empty lines
  while (normalized.length && normalized[0] === '') normalized.shift()
  // Remove trailing empty lines  
  while (normalized.length && normalized[normalized.length - 1] === '') normalized.pop()
  
  return normalized.join('\n')
}

// Clean and prepare lyrics lines
function prepareLines(lines) {
  return lines
    .map(line => cleanPunctuation(line.trim()))
    .filter(line => line.length > 0)
}

// Calculate optimal layout to fill the slide
function getOptimalLayout(lines) {
  // Slide dimensions (16:9 widescreen in inches)
  const slideWidth = 13.33
  const slideHeight = 7.5
  const titleHeight = 0.7
  const contentHeight = slideHeight - titleHeight - 0.2 // Available height for lyrics
  const contentWidth = slideWidth - 0.3 // Small margin
  
  // Approximate character width and line height ratios (per point of font size)
  const charWidthPerPt = 0.012 // inches per character per font point (approximate)
  const lineHeightPerPt = 0.018 // inches per line per font point
  
  // Find the longest line and count total lines
  const lineCount = lines.length
  const maxLineLength = Math.max(...lines.map(l => l.length), 1)
  const avgLineLength = lines.reduce((sum, l) => sum + l.length, 0) / lineCount
  
  // Try different column configurations and find the best fit
  let bestConfig = { columns: 1, fontSize: 10 }
  let bestScore = 0
  
  for (let cols = 1; cols <= 5; cols++) {
    const linesPerCol = Math.ceil(lineCount / cols)
    const colWidth = (contentWidth - (cols - 1) * 0.1) / cols
    
    // Calculate max font size that fits width (based on longest line in any column)
    const maxFontForWidth = colWidth / (maxLineLength * charWidthPerPt)
    
    // Calculate max font size that fits height
    const maxFontForHeight = contentHeight / (linesPerCol * lineHeightPerPt)
    
    // Use the smaller of the two constraints
    let fontSize = Math.min(maxFontForWidth, maxFontForHeight)
    
    // Clamp font size to reasonable range
    fontSize = Math.max(8, Math.min(28, Math.floor(fontSize)))
    
    // Score: prefer larger fonts and fewer columns
    const score = fontSize * (1 + 0.1 * (5 - cols))
    
    if (score > bestScore) {
      bestScore = score
      bestConfig = { columns: cols, fontSize }
    }
  }
  
  return bestConfig
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

// Check if text looks like actual lyrics (not template placeholders)
function isValidLyrics(text) {
  if (!text || text.length < 20) return false
  // Filter out template placeholders like {title}, {content}, etc.
  if (text.includes('{ititle}') || text.includes('{content}') || text.includes('{visible_url}')) {
    return false
  }
  // Check if it has some Hebrew or English words (not just symbols)
  const hasWords = /[\u0590-\u05FFa-zA-Z]{3,}/.test(text)
  return hasWords
}

// Extract lyrics from Shironet page
async function extractLyrics(url) {
  const html = await fetchWithProxy(url)
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // Get title from the song name element
  let title = ''
  const titleElem = doc.querySelector('.artist_song_name_txt')
  if (titleElem?.textContent?.trim()) {
    title = titleElem.textContent.trim()
  }
  
  // Get artist name
  let artist = ''
  // Look for artist link in the artist info section
  const artistLinks = doc.querySelectorAll('a[href*="prfid"]')
  for (const link of artistLinks) {
    const href = link.getAttribute('href') || ''
    // Artist page links don't have wrkid
    if (!href.includes('wrkid') && !href.includes('type=lyrics')) {
      const text = link.textContent.trim()
      if (text && text.length > 1 && !text.includes('{')) {
        artist = text
        break
      }
    }
  }
  
  if (title && artist && !title.includes(artist)) {
    title = `${title} - ${artist}`
  }
  
  // Get lyrics - specifically from span.artist_lyrics_text
  let lyrics = ''
  
  // Find all potential lyrics elements
  const lyricsElements = doc.querySelectorAll('span.artist_lyrics_text')
  
  for (const elem of lyricsElements) {
    // Get innerHTML and convert <br> to newlines
    let lyricsHtml = elem.innerHTML
    // Replace <br> tags with newlines
    lyricsHtml = lyricsHtml.replace(/<br\s*\/?>/gi, '\n')
    // Remove other HTML tags
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = lyricsHtml
    const text = tempDiv.textContent.trim()
    
    // Check if this is valid lyrics
    if (isValidLyrics(text)) {
      lyrics = text
      break
    }
  }
  
  // If still no lyrics, try finding by content pattern
  if (!lyrics) {
    // Look for any element that contains Hebrew text with line breaks
    const allSpans = doc.querySelectorAll('span, div, p')
    for (const elem of allSpans) {
      const text = elem.textContent.trim()
      // Check if it looks like lyrics (multiple lines, Hebrew characters, reasonable length)
      if (text.length > 100 && text.includes('\n') && isValidLyrics(text)) {
        // Make sure it's not navigation or menu text
        if (!text.includes('ראשי') || text.length > 500) {
          lyrics = text
          break
        }
      }
    }
  }
  
  if (!lyrics) {
    throw new Error('Could not find lyrics on page. The page may have loaded incorrectly.')
  }
  
  // Normalize lyrics
  lyrics = normalizeLyrics(lyrics)
  
  return { title: title || 'Unknown Song', lyrics }
}

// Generate PPTX
async function generatePptx(title, lyricsText) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  
  // Normalize the lyrics first
  const normalizedLyrics = normalizeLyrics(lyricsText)
  const lines = normalizedLyrics.split('\n')
  const isRtl = isHebrew(title) || isHebrew(lyricsText)
  
  // Clean lines - remove punctuation, filter empty
  const cleanedLines = prepareLines(lines)
  
  // Calculate optimal layout based on content
  const { columns, fontSize } = getOptimalLayout(cleanedLines)
  
  const slide = pptx.addSlide()
  
  // Background image
  const seed = Math.abs(title.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000
  slide.addImage({
    path: `https://picsum.photos/seed/${seed}/1920/1080`,
    x: 0, y: 0, w: '100%', h: '100%'
  })
  
  // Compact title bar at top
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.65,
    fill: { color: '000000', transparency: 45 }
  })
  
  slide.addText(title, {
    x: 0.1, y: 0.1, w: '98%', h: 0.5,
    fontSize: 32, bold: true,
    color: 'FFFFFF',
    align: 'center'
  })
  
  // Split into columns
  const linesPerCol = Math.ceil(cleanedLines.length / columns)
  const cols = []
  for (let i = 0; i < columns; i++) {
    cols.push(cleanedLines.slice(i * linesPerCol, (i + 1) * linesPerCol))
  }
  
  // Full-width layout with minimal margins
  const margin = 0.15
  const colGap = 0.1
  const contentTop = 0.75
  const contentHeight = 6.7
  const slideWidth = 13.33
  const availableWidth = slideWidth - (2 * margin)
  const colWidth = (availableWidth - (colGap * (columns - 1))) / columns
  
  // Single dark overlay for entire content area
  slide.addShape('rect', {
    x: 0, y: contentTop - 0.1,
    w: slideWidth, h: contentHeight + 0.2,
    fill: { color: '000000', transparency: 35 }
  })
  
  for (let i = 0; i < cols.length; i++) {
    const colLines = cols[i]
    
    let left
    if (isRtl) {
      left = slideWidth - margin - colWidth - (i * (colWidth + colGap))
    } else {
      left = margin + (i * (colWidth + colGap))
    }
    
    // All text in white
    const textContent = colLines.join('\n')
    
    slide.addText(textContent, {
      x: left, y: contentTop,
      w: colWidth, h: contentHeight,
      fontSize,
      color: LYRICS_COLOR,
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
