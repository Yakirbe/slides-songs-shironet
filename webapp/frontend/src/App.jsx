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
  
  const layout = getOptimalLayout(cleanedLines.length)
  const { columns, fontSize } = layout
  
  const slide = pptx.addSlide()
  
  // Background image
  const seed = Math.abs(title.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000
  slide.addImage({
    path: `https://picsum.photos/seed/${seed}/1920/1080`,
    x: 0, y: 0, w: '100%', h: '100%'
  })
  
  // Title with dark background box
  slide.addShape('rect', {
    x: 0, y: 0.1, w: '100%', h: 0.6,
    fill: { color: '000000', transparency: 50 }
  })
  
  slide.addText(title, {
    x: 0.2, y: 0.15, w: '96%', h: 0.5,
    fontSize: 28, bold: true,
    color: 'FFFFFF',
    align: 'center'
  })
  
  // Split into columns
  const linesPerCol = Math.ceil(cleanedLines.length / columns)
  const cols = []
  for (let i = 0; i < columns; i++) {
    cols.push(cleanedLines.slice(i * linesPerCol, (i + 1) * linesPerCol))
  }
  
  const margin = 0.3
  const colGap = 0.2
  const contentTop = 0.8
  const contentHeight = 6.4
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
    
    // Dark semi-transparent background for text
    slide.addShape('roundRect', {
      x: left - 0.1, y: contentTop - 0.05,
      w: colWidth + 0.2, h: contentHeight + 0.1,
      fill: { color: '000000', transparency: 40 },
      line: { color: '000000', transparency: 100 }
    })
    
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
