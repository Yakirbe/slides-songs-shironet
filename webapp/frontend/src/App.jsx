import { useState } from 'react'
import pptxgen from 'pptxgenjs'

// Status logger
let statusLog = []
function log(msg) {
  console.log(msg)
  statusLog.push(`${new Date().toLocaleTimeString()}: ${msg}`)
  if (statusLog.length > 20) statusLog.shift()
}

// Fetch via allorigins API with retry
async function fetchWithProxy(url, retries = 3) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      log(`Fetching (attempt ${attempt + 1})...`)
      const response = await fetch(proxyUrl, { 
        signal: AbortSignal.timeout(15000) // 15s timeout
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      if (!data.contents) {
        throw new Error('Empty response')
      }
      
      log(`Fetch successful`)
      return data.contents
    } catch (e) {
      log(`Attempt ${attempt + 1} failed: ${e.message}`)
      if (attempt === retries) {
        throw new Error(`Failed after ${retries + 1} attempts: ${e.message}`)
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
}

// Colors for bright theme
const TEXT_COLOR = '1a1a2e' // Dark blue-black
const TITLE_COLOR = '16213e' // Dark navy

function isHebrew(text) {
  for (const char of text) {
    if (char >= '\u0590' && char <= '\u05FF') return true
  }
  return false
}

function cleanPunctuation(text) {
  return text.replace(/[,.]/g, '')
}

// Normalize lyrics
function normalizeLyrics(text) {
  let lines = text.split('\n').map(l => l.trim())
  
  let singleEmptyCount = 0
  let doubleEmptyCount = 0
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
  
  const hasDoubles = doubleEmptyCount > 0
  const hasSingles = singleEmptyCount > 0
  
  const normalized = []
  consecutiveEmpty = 0
  
  for (const line of lines) {
    if (line === '') {
      consecutiveEmpty++
    } else {
      if (consecutiveEmpty > 0) {
        if (hasDoubles && hasSingles) {
          if (consecutiveEmpty >= 2) normalized.push('')
        } else {
          normalized.push('')
        }
      }
      normalized.push(line)
      consecutiveEmpty = 0
    }
  }
  
  while (normalized.length && normalized[0] === '') normalized.shift()
  while (normalized.length && normalized[normalized.length - 1] === '') normalized.pop()
  
  return normalized.join('\n')
}

function prepareLines(lines) {
  return lines
    .map(line => cleanPunctuation(line.trim()))
    .filter(line => line.length > 0)
}

// Calculate optimal layout
function getOptimalLayout(lines) {
  const slideWidth = 13.33
  const slideHeight = 7.5
  const titleHeight = 0.7
  const contentHeight = slideHeight - titleHeight - 0.2
  const contentWidth = slideWidth - 0.3
  
  const charWidthPerPt = 0.012
  const lineHeightPerPt = 0.018
  
  const lineCount = lines.length
  const maxLineLength = Math.max(...lines.map(l => l.length), 1)
  
  let bestConfig = { columns: 1, fontSize: 10 }
  let bestScore = 0
  
  for (let cols = 1; cols <= 5; cols++) {
    const linesPerCol = Math.ceil(lineCount / cols)
    const colWidth = (contentWidth - (cols - 1) * 0.1) / cols
    
    const maxFontForWidth = colWidth / (maxLineLength * charWidthPerPt)
    const maxFontForHeight = contentHeight / (linesPerCol * lineHeightPerPt)
    
    let fontSize = Math.min(maxFontForWidth, maxFontForHeight)
    fontSize = Math.max(8, Math.min(28, Math.floor(fontSize)))
    
    const score = fontSize * (1 + 0.1 * (5 - cols))
    
    if (score > bestScore) {
      bestScore = score
      bestConfig = { columns: cols, fontSize }
    }
  }
  
  return bestConfig
}

// Search Shironet
async function searchShironet(query) {
  log(`Searching for: ${query}`)
  const searchUrl = `https://shironet.mako.co.il/searchSongs?q=${encodeURIComponent(query)}&type=works`
  
  const html = await fetchWithProxy(searchUrl)
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  const results = []
  const rows = doc.querySelectorAll('tr')
  
  rows.forEach(row => {
    const songLink = row.querySelector('a[href*="type=lyrics"][href*="wrkid"]')
    if (!songLink) return
    
    const href = songLink.getAttribute('href')
    const title = songLink.textContent.trim()
    if (!title) return
    
    let artist = ''
    const allLinks = row.querySelectorAll('a[href*="prfid"]')
    for (const link of allLinks) {
      const linkHref = link.getAttribute('href') || ''
      if (!linkHref.includes('wrkid') && link.textContent.trim()) {
        artist = link.textContent.trim()
        break
      }
    }
    
    const fullUrl = href.startsWith('/') 
      ? `https://shironet.mako.co.il${href}` 
      : href
    
    if (!results.find(r => r.url === fullUrl)) {
      results.push({ title, artist, url: fullUrl })
    }
  })
  
  log(`Found ${results.length} results`)
  return results.slice(0, 15)
}

function isValidLyrics(text) {
  if (!text || text.length < 20) return false
  if (text.includes('{ititle}') || text.includes('{content}') || text.includes('{visible_url}')) {
    return false
  }
  return /[\u0590-\u05FFa-zA-Z]{3,}/.test(text)
}

// Extract lyrics
async function extractLyrics(url) {
  log(`Extracting lyrics from: ${url}`)
  const html = await fetchWithProxy(url)
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  let title = ''
  const titleElem = doc.querySelector('.artist_song_name_txt')
  if (titleElem?.textContent?.trim()) {
    title = titleElem.textContent.trim()
  }
  
  let artist = ''
  const artistLinks = doc.querySelectorAll('a[href*="prfid"]')
  for (const link of artistLinks) {
    const href = link.getAttribute('href') || ''
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
  
  let lyrics = ''
  const lyricsElements = doc.querySelectorAll('span.artist_lyrics_text')
  
  for (const elem of lyricsElements) {
    let lyricsHtml = elem.innerHTML
    lyricsHtml = lyricsHtml.replace(/<br\s*\/?>/gi, '\n')
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = lyricsHtml
    const text = tempDiv.textContent.trim()
    
    if (isValidLyrics(text)) {
      lyrics = text
      break
    }
  }
  
  if (!lyrics) {
    const allSpans = doc.querySelectorAll('span, div, p')
    for (const elem of allSpans) {
      const text = elem.textContent.trim()
      if (text.length > 100 && text.includes('\n') && isValidLyrics(text)) {
        if (!text.includes('ראשי') || text.length > 500) {
          lyrics = text
          break
        }
      }
    }
  }
  
  if (!lyrics) {
    throw new Error('Could not find lyrics')
  }
  
  lyrics = normalizeLyrics(lyrics)
  log(`Extracted lyrics: ${lyrics.length} chars`)
  
  return { title: title || 'Unknown Song', lyrics }
}

// Add a slide to presentation
function addSongSlide(pptx, title, lyricsText) {
  const normalizedLyrics = normalizeLyrics(lyricsText)
  const lines = normalizedLyrics.split('\n')
  const isRtl = isHebrew(title) || isHebrew(lyricsText)
  const cleanedLines = prepareLines(lines)
  const { columns, fontSize } = getOptimalLayout(cleanedLines)
  
  const slide = pptx.addSlide()
  
  // White/light background
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: 'F5F5F5' }
  })
  
  // Title bar - light gray
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.65,
    fill: { color: 'E8E8E8' }
  })
  
  // Dark title text
  slide.addText(title, {
    x: 0.1, y: 0.1, w: '98%', h: 0.5,
    fontSize: 32, bold: true,
    color: TITLE_COLOR,
    align: 'center'
  })
  
  // Split into columns
  const linesPerCol = Math.ceil(cleanedLines.length / columns)
  const cols = []
  for (let i = 0; i < columns; i++) {
    cols.push(cleanedLines.slice(i * linesPerCol, (i + 1) * linesPerCol))
  }
  
  const margin = 0.15
  const colGap = 0.1
  const contentTop = 0.75
  const contentHeight = 6.7
  const slideWidth = 13.33
  const availableWidth = slideWidth - (2 * margin)
  const colWidth = (availableWidth - (colGap * (columns - 1))) / columns
  
  for (let i = 0; i < cols.length; i++) {
    const colLines = cols[i]
    
    let left
    if (isRtl) {
      left = slideWidth - margin - colWidth - (i * (colWidth + colGap))
    } else {
      left = margin + (i * (colWidth + colGap))
    }
    
    const textContent = colLines.join('\n')
    
    slide.addText(textContent, {
      x: left, y: contentTop,
      w: colWidth, h: contentHeight,
      fontSize,
      color: TEXT_COLOR,
      valign: 'top',
      align: isRtl ? 'right' : 'left',
      rtlMode: isRtl
    })
  }
}

// Generate single song PPTX
async function generatePptx(title, lyricsText) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  addSongSlide(pptx, title, lyricsText)
  await pptx.writeFile({ fileName: `${title.replace(/[^\w\u0590-\u05FF]/g, '_')}.pptx` })
}

// Generate batch PPTX with multiple songs
async function generateBatchPptx(songs, onProgress) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  
  const failed = []
  
  for (let i = 0; i < songs.length; i++) {
    const query = songs[i].trim()
    if (!query) continue
    
    onProgress(`Processing ${i + 1}/${songs.length}: ${query}`)
    
    try {
      // Search and get first result
      const results = await searchShironet(query)
      if (results.length === 0) {
        failed.push(`${query}: No results`)
        continue
      }
      
      const firstResult = results[0]
      const { title, lyrics } = await extractLyrics(firstResult.url)
      
      addSongSlide(pptx, title, lyrics)
      log(`Added slide for: ${title}`)
    } catch (e) {
      failed.push(`${query}: ${e.message}`)
      log(`Failed: ${query} - ${e.message}`)
    }
    
    // Small delay between songs
    if (i < songs.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }
  
  if (pptx.slides.length === 0) {
    throw new Error('No songs were processed successfully')
  }
  
  await pptx.writeFile({ fileName: `songs_presentation.pptx` })
  
  return { total: songs.length, success: pptx.slides.length, failed }
}

function App() {
  const [mode, setMode] = useState('single') // 'single' or 'batch'
  const [query, setQuery] = useState('')
  const [batchQueries, setBatchQueries] = useState('')
  const [results, setResults] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [lyrics, setLyrics] = useState('')
  const [title, setTitle] = useState('')
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    
    setSearching(true)
    setError('')
    setStatus('Searching...')
    setResults([])
    setSelectedSong(null)
    setLyrics('')
    
    try {
      const searchResults = await searchShironet(query.trim())
      setResults(searchResults)
      setStatus(searchResults.length ? `Found ${searchResults.length} results` : '')
      if (searchResults.length === 0) {
        setError('No results found')
      }
    } catch (err) {
      setError('Search failed: ' + err.message)
      setStatus(`Error: ${err.message}`)
    } finally {
      setSearching(false)
    }
  }

  const handleSelectSong = async (song) => {
    setLoading(song.url)
    setError('')
    setStatus('Loading lyrics...')
    
    try {
      const { title: extractedTitle, lyrics: extractedLyrics } = await extractLyrics(song.url)
      setSelectedSong(song)
      setTitle(extractedTitle || `${song.title} - ${song.artist}`)
      setLyrics(extractedLyrics)
      setStatus('Lyrics loaded')
    } catch (err) {
      setError('Failed to load lyrics: ' + err.message)
      setStatus(`Error: ${err.message}`)
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
    setStatus('Generating PPTX...')
    
    try {
      await generatePptx(title.trim(), lyrics.trim())
      setStatus('PPTX downloaded!')
    } catch (err) {
      setError('Failed to generate: ' + err.message)
      setStatus(`Error: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleBatchGenerate = async () => {
    const songs = batchQueries.split('\n').filter(s => s.trim())
    if (songs.length === 0) {
      setError('Enter at least one song name')
      return
    }
    
    setGenerating(true)
    setError('')
    
    try {
      const result = await generateBatchPptx(songs, setStatus)
      setStatus(`Done! ${result.success}/${result.total} songs processed`)
      if (result.failed.length > 0) {
        setError(`Failed: ${result.failed.join('; ')}`)
      }
    } catch (err) {
      setError('Batch generation failed: ' + err.message)
      setStatus(`Error: ${err.message}`)
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

        <div className="mode-toggle">
          <button 
            className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
            onClick={() => setMode('single')}
          >
            Single Song
          </button>
          <button 
            className={`mode-btn ${mode === 'batch' ? 'active' : ''}`}
            onClick={() => setMode('batch')}
          >
            Batch Mode
          </button>
        </div>

        {mode === 'single' ? (
          <>
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
                    onClick={() => { setSelectedSong(null); setLyrics(''); setStatus(''); }}
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
          </>
        ) : (
          <div className="batch-mode">
            <p className="batch-instructions">Enter one song name per line. First search result will be used.</p>
            <textarea
              value={batchQueries}
              onChange={(e) => setBatchQueries(e.target.value)}
              className="batch-input"
              placeholder="מה עשית בחיים&#10;אחלה בחלה&#10;מה יהיה מחר"
              dir="auto"
              rows={10}
            />
            <button 
              onClick={handleBatchGenerate} 
              className="generate-button"
              disabled={generating}
            >
              {generating ? (
                <>
                  <span className="spinner"></span>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span className="download-icon">📥</span>
                  <span>Generate All Slides</span>
                </>
              )}
            </button>
          </div>
        )}

        {status && <div className="status-message">{status}</div>}
        {error && <div className="error-message">{error}</div>}

        <footer className="footer">
          <p>Searches Shironet • 100% client-side</p>
        </footer>
      </div>
    </div>
  )
}

export default App
