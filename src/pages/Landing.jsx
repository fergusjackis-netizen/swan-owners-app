import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getFleet } from '../services/firestore'
import './Landing.css'

export default function Landing() {
  const [heroPhotos, setHeroPhotos] = useState([])
  const [heroIndex, setHeroIndex] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    getFleet().then(yachts => {
      const photos = yachts
        .filter(y => y.photos && y.photos.length > 0)
        .flatMap(y => y.photos.slice(0, 2).map(p => ({ url: p.url, name: y.name, model: y.model })))
      setHeroPhotos(photos)
    })
  }, [])

  useEffect(() => {
    if (heroPhotos.length < 2) return
    const timer = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setHeroIndex(i => (i + 1) % heroPhotos.length)
        setFade(true)
      }, 600)
    }, 6000)
    return () => clearInterval(timer)
  }, [heroPhotos])

  const currentPhoto = heroPhotos[heroIndex]

  return (
    <div className="landing-page">
      <section className="hero-section">
        {currentPhoto && (
          <div className={"hero-bg" + (fade ? " visible" : "")}
            style={{ backgroundImage: 'url(' + currentPhoto.url + ')' }} />
        )}
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">The independent community for</p>
          <h1 className="hero-title">Nautor's Swan<br />Owners Worldwide</h1>
          <p className="hero-subtitle">
            A private community for owners, skippers and gardienners of
            German Frers-designed Swan yachts. Share knowledge, find fellow
            owners, and keep your Swan sailing.
          </p>
          {currentPhoto && (
            <p className="hero-photo-credit">{currentPhoto.name} - {currentPhoto.model}</p>
          )}
          <div className="hero-actions">
            <Link to="/register" className="btn-hero-primary">Join the Community</Link>
            <Link to="/fleet" className="btn-hero-secondary">Browse the Fleet</Link>
          </div>
        </div>
        {heroPhotos.length > 1 && (
          <div className="hero-dots">
            {heroPhotos.map((_, i) => (
              <button key={i}
                className={"hero-dot" + (i === heroIndex ? " active" : "")}
                onClick={() => { setFade(false); setTimeout(() => { setHeroIndex(i); setFade(true) }, 300) }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="stats-bar">
        <div className="stat">
          <span className="stat-value">German Frers</span>
          <span className="stat-label">Designer</span>
        </div>
        <div className="stat">
          <span className="stat-value">1980s-Present</span>
          <span className="stat-label">Production</span>
        </div>
        <div className="stat">
          <span className="stat-value">25+</span>
          <span className="stat-label">Models</span>
        </div>
        <div className="stat">
          <span className="stat-value">Worldwide</span>
          <span className="stat-label">Community</span>
        </div>
      </section>

      <section className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <h3>The Fleet</h3>
            <p>Browse registered Swan yachts worldwide. Find boats by model, flag and location.</p>
            <Link to="/fleet" className="feature-link">Browse Fleet</Link>
          </div>
          <div className="feature-card">
            <h3>Issues and Fixes</h3>
            <p>Share technical knowledge. Post problems, solutions and maintenance tips with the community.</p>
            <Link to="/issues" className="feature-link">View Issues</Link>
          </div>
          <div className="feature-card">
            <h3>Live Map</h3>
            <p>See where fellow Swan owners are sailing. Share your position and connect in port.</p>
            <Link to="/map" className="feature-link">Open Map</Link>
          </div>
          <div className="feature-card">
            <h3>Professionals</h3>
            <p>Find experienced Swan skippers and gardiennes. Connect with the people who know these boats.</p>
            <Link to="/contacts" className="feature-link">Find Professionals</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
