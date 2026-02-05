import { useState } from 'react'

const API_BASE = 'http://localhost:8000'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(null)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setResults([])

    try {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      })
      
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      setResults(data.results || [])
      
      if (data.results?.length === 0) {
        setError('No results found')
      }
    } catch (err) {
      setError('Failed to search. Make sure the backend is running.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (result) => {
    setGenerating(result.url)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: `${result.title} - ${result.artist}`,
          url: result.url 
        })
      })
      
      if (!response.ok) throw new Error('Generation failed')
      
      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${result.title.replace(/\s+/g, '_')}.pptx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      setError('Failed to generate slide. Check if the backend is running.')
      console.error(err)
    } finally {
      setGenerating(null)
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
          <p className="subtitle">Search for a song and generate beautiful presentation slides</p>
        </header>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-box">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter song name..."
              className="search-input"
              dir="auto"
            />
            <button type="submit" className="search-button" disabled={loading}>
              {loading ? (
                <span className="spinner"></span>
              ) : (
                <span>Search</span>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="results">
            <h2 className="results-title">Results</h2>
            <div className="results-list">
              {results.map((result, index) => (
                <div key={index} className="result-card">
                  <div className="result-info">
                    <h3 className="result-title">{result.title}</h3>
                    <p className="result-artist">{result.artist}</p>
                  </div>
                  <button
                    onClick={() => handleGenerate(result)}
                    className="generate-button"
                    disabled={generating === result.url}
                  >
                    {generating === result.url ? (
                      <>
                        <span className="spinner small"></span>
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
              ))}
            </div>
          </div>
        )}

        <footer className="footer">
          <p>Searches Shironet for lyrics and generates PowerPoint slides</p>
        </footer>
      </div>
    </div>
  )
}

export default App
