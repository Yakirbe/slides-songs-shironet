import { useState } from 'react'
import pptxgen from 'pptxgenjs'

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

async function generatePptx(title, lyricsText) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE' // 13.33" x 7.5"
  
  const lines = lyricsText.split('\n')
  const isRtl = isHebrew(title) || isHebrew(lyricsText)
  
  // Split into sections and assign colors
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
  
  // Create slide
  const slide = pptx.addSlide()
  
  // Background image from Lorem Picsum
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
  
  // Column dimensions
  const margin = 0.3
  const colGap = 0.2
  const contentTop = 0.75
  const contentHeight = 6.5
  const availableWidth = 13.33 - (2 * margin)
  const colWidth = (availableWidth - (colGap * (columns - 1))) / columns
  
  // Render columns
  for (let i = 0; i < cols.length; i++) {
    const colLines = cols[i]
    
    // Calculate position (RTL: start from right)
    let left
    if (isRtl) {
      left = 13.33 - margin - colWidth - (i * (colWidth + colGap))
    } else {
      left = margin + (i * (colWidth + colGap))
    }
    
    // Background box
    slide.addShape('roundRect', {
      x: left - 0.1, y: contentTop - 0.05,
      w: colWidth + 0.2, h: contentHeight + 0.1,
      fill: { color: '1E1E32', transparency: 20 },
      line: { color: '1E1E32', transparency: 100 }
    })
    
    // Text content
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
  
  // Download
  await pptx.writeFile({ fileName: `${title.replace(/\s+/g, '_')}.pptx` })
}

function App() {
  const [title, setTitle] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!title.trim() || !lyrics.trim()) {
      setError('Please enter both title and lyrics')
      return
    }
    
    setGenerating(true)
    setError('')
    
    try {
      await generatePptx(title.trim(), lyrics.trim())
    } catch (err) {
      setError('Failed to generate PPTX: ' + err.message)
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
          <p className="subtitle">Paste lyrics and generate beautiful presentation slides</p>
        </header>

        <div className="form">
          <div className="input-group">
            <label>Song Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter song title..."
              className="text-input"
              dir="auto"
            />
          </div>
          
          <div className="input-group">
            <label>Lyrics</label>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste lyrics here... (separate verses with empty lines)"
              className="lyrics-input"
              dir="auto"
              rows={12}
            />
          </div>
          
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

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="tips">
          <h3>Tips</h3>
          <ul>
            <li>Separate verses/choruses with empty lines for color coding</li>
            <li>Hebrew text auto-detects RTL</li>
            <li>Long lyrics auto-split into columns</li>
          </ul>
        </div>

        <footer className="footer">
          <p>100% client-side • No data sent to servers</p>
        </footer>
      </div>
    </div>
  )
}

export default App
