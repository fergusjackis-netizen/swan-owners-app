import { useState } from 'react'
import './PhotoGallery.css'

export default function PhotoGallery({ photos = [], onCaptionChange = null, onRemove = null }) {
  const [lightbox, setLightbox] = useState(null)

  if (!photos.length) return null

  return (
    <>
      <div className="photo-gallery">
        {photos.map((photo, idx) => (
          <div key={idx} className="gallery-item">
            <div className="gallery-thumb-wrap" onClick={() => setLightbox(idx)}>
              <img src={photo.url} alt={'Photo ' + (idx + 1)} className="gallery-thumb" />
              <div className="gallery-thumb-overlay">
                <span>View</span>
              </div>
            </div>
            {onCaptionChange ? (
              <input
                className="caption-input"
                value={photo.caption || ''}
                onChange={e => onCaptionChange(idx, e.target.value)}
                placeholder="Add a caption or note..."
              />
            ) : photo.caption ? (
              <p className="caption-text">{photo.caption}</p>
            ) : null}
            {onRemove && (
              <button className="remove-photo" onClick={() => onRemove(idx)}>Remove</button>
            )}
          </div>
        ))}
      </div>

      {lightbox !== null && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>x</button>
            <button
              className="lightbox-prev"
              onClick={() => setLightbox(l => l > 0 ? l - 1 : photos.length - 1)}
              disabled={photos.length <= 1}
            >
              &lt;
            </button>
            <div className="lightbox-content">
              <img src={photos[lightbox].url} alt={'Photo ' + (lightbox + 1)} className="lightbox-img" />
              {photos[lightbox].caption && (
                <p className="lightbox-caption">{photos[lightbox].caption}</p>
              )}
              <p className="lightbox-counter">{lightbox + 1} / {photos.length}</p>
            </div>
            <button
              className="lightbox-next"
              onClick={() => setLightbox(l => l < photos.length - 1 ? l + 1 : 0)}
              disabled={photos.length <= 1}
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </>
  )
}
