import { useState, useRef } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import './PhotoUpload.css'

export default function PhotoUpload({ storagePath, onUploaded, maxPhotos = 5, existingPhotos = [] }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const totalPhotos = existingPhotos.length

  async function handleFiles(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const remaining = maxPhotos - totalPhotos
    if (remaining <= 0) return setError('Maximum ' + maxPhotos + ' photos allowed.')

    const toUpload = files.slice(0, remaining)
    setUploading(true)
    setError('')

    const urls = []
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]
      if (file.size > 10 * 1024 * 1024) {
        setError('Each photo must be under 10MB.')
        continue
      }
      const fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const storageRef = ref(storage, storagePath + '/' + fileName)
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file)
        task.on('state_changed',
          snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref)
            urls.push({ url, caption: '' })
            resolve()
          }
        )
      })
    }

    setUploading(false)
    setProgress(0)
    if (urls.length) onUploaded(urls)
    fileInputRef.current.value = ''
  }

  return (
    <div className="photo-upload">
      {totalPhotos < maxPhotos && (
        <label className={"upload-btn" + (uploading ? " uploading" : "")}>
          {uploading ? (
            <span>Uploading {progress}%</span>
          ) : (
            <span>+ Add Photo{maxPhotos > 1 ? 's' : ''} ({totalPhotos}/{maxPhotos})</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={maxPhotos > 1}
            onChange={handleFiles}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      )}
      {error && <p className="upload-error">{error}</p>}
    </div>
  )
}
