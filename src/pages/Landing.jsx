import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Landing.css'

const STATS = [
  { value: 'German Frers', label: 'Designer' },
  { value: '1980s-Present', label: 'Era' },
  { value: '25+', label: 'Models' },
  { value: 'Worldwide', label: 'Community' },
]

const FEATURES = [
  { title: 'Fleet Registry', description: 'Register your Swan and browse the global fleet. Find boats by model, flag, or home marina. Connect with owners of the same model anywhere in the world.', icon: 'anchor', link: '/fleet', linkLabel: 'Browse the fleet' },
  { title: 'Issues & Fixes', description: 'A searchable knowledge base of real maintenance problems and solutions, contributed by owners. Filter by Swan model and system.', icon: 'wrench', link: '/issues', linkLabel: 'Browse issues' },
  { title: 'Live Map', description: 'See where fellow Swan owners are cruising right now. Share your position when you want to be found, and message other owners to arrange a meeting.', icon: 'map', link: '/map', linkLabel: 'Members only' },
  { title: 'Trusted Contacts', description: 'Owner-recommended riggers, engineers, sailmakers, surveyors and yards  -  rated by the people who have actually used them.', icon: 'contacts', link: '/contacts', linkLabel: 'Members only' },
]

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <p className="hero-eyebrow">The Independent Community for</p>
          <h1 className="hero-title">
            Nautor's Swan<br />
            <span className="hero-title-accent">Owners Worldwide</span>
          </h1>
          <p className="hero-subtitle">
            A private community for owners, skippers and gardienners of
            German Frers-designed Swan yachts. Share knowledge, find
            fellow owners, and keep your Swan sailing.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/fleet" className="btn-hero-primary">Go to Fleet</Link>
            ) : (
              <>
                <Link to="/register" className="btn-hero-primary">Join the Community</Link>
                <Link to="/fleet" className="btn-hero-ghost">Browse the Fleet</Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-divider" />
      </section>

      <section className="stats-bar">
        {STATS.map(s => (
          <div key={s.label} className="stat">
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      <section className="intro">
        <div className="intro-inner">
          <h2 className="section-title">Built by owners, for owners</h2>
          <p className="intro-text">
            There is no official owners association for German Frers-era Swan yachts.
            This platform exists to fill that gap  -  a place where the people who
            live aboard, race, and maintain these exceptional boats can share what
            they know, find each other at sea, and keep an irreplaceable body of
            knowledge alive.
          </p>
          <p className="intro-text">
            Membership is free. Registration requires approval to keep the
            community genuine  -  owners, skippers and gardienners only.
          </p>
        </div>
      </section>

      <section className="features">
        <h2 className="section-title">What's inside</h2>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-title">{f.title}</div>
              <p className="feature-desc">{f.description}</p>
              <Link to={f.link} className="feature-link">{f.linkLabel}  - </Link>
            </div>
          ))}
        </div>
      </section>

      {!user && (
        <section className="cta">
          <div className="cta-inner">
            <h2 className="cta-title">Ready to join?</h2>
            <p className="cta-subtitle">
              Registration takes two minutes. Once approved, you will have full
              access to the fleet registry, live map, issues database, forum
              and direct messaging.
            </p>
            <Link to="/register" className="btn-hero-primary">Apply for membership</Link>
          </div>
        </section>
      )}
    </div>
  )
}
