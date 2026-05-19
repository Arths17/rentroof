'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface Room {
  id: string
  name: string
  status: string
}

export default function MoveInWalkthroughPage() {
  const [walkthrough, setWalkthrough] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [uploading, setUploading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const router = useRouter()

  // Mock tenant data - in real app would come from auth context
  const tenantId = 'tenant123'

  useEffect(() => {
    const fetchWalkthrough = async () => {
      try {
        const data = await api.tenant.getMoveInWalkthrough()
        setWalkthrough(data)
        if (data.rooms && data.rooms.length > 0) {
          setCurrentRoom(data.rooms[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load walkthrough')
        console.error('Error loading walkthrough:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWalkthrough()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files || !currentRoom) return

    try {
      setUploading(true)

      // Convert files to base64 for submission (in real app, would upload to cloud storage)
      const photoPromises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
      })

      const photos = await Promise.all(photoPromises)

      const result = await api.tenant.submitMoveInWalkthrough(
        tenantId,
        walkthrough.unitId,
        currentRoom.id,
        photos
      )

      if (result.success) {
        // Mark room as completed
        const updatedWalkthrough = {
          ...walkthrough,
          rooms: walkthrough.rooms.map((r: Room) =>
            r.id === currentRoom.id ? { ...r, status: 'completed' } : r
          ),
        }
        setWalkthrough(updatedWalkthrough)

        // Move to next room
        const nextRoom = updatedWalkthrough.rooms.find((r: Room) => r.status === 'pending')
        if (nextRoom) {
          setCurrentRoom(nextRoom)
        } else {
          setCompleted(true)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos')
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="loading">Loading move-in walkthrough...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (!walkthrough) return <div className="error">No walkthrough data available</div>

  if (completed) {
    return (
      <div className="walkthrough-completed">
        <div className="completion-content">
          <h1>✓ Move-in Walkthrough Complete!</h1>
          <p>Thank you for completing the move-in walkthrough. Your photos have been securely recorded and locked.</p>
          <p>You can now access your tenant portal.</p>
          <button 
            onClick={() => router.push('/tenant/portal')}
            className="btn-primary"
          >
            Return to Tenant Portal
          </button>
        </div>
      </div>
    )
  }

  const completedRooms = walkthrough.rooms.filter((r: Room) => r.status === 'completed').length
  const totalRooms = walkthrough.rooms.length
  const progress = Math.round((completedRooms / totalRooms) * 100)

  return (
    <div className="move-in-walkthrough-page">
      <div className="dash-nav-buttons">
        <button 
          className="nav-btn"
          onClick={() => router.push('/tenant/portal')}
        >
          👥 Back to Portal
        </button>
        <button 
          className="nav-btn"
          onClick={() => router.push('/tenant/maintenance')}
        >
          🔧 Maintenance
        </button>
        <button 
          className="nav-btn"
          onClick={() => router.push('/tenant/pay-rent')}
        >
          💳 Pay Rent
        </button>
      </div>

      <div className="page-header">
        <h1>Move-in Photo Walkthrough</h1>
        <p className="instructions">{walkthrough.instructions}</p>
      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="progress-text">{completedRooms} of {totalRooms} rooms completed</p>
      </div>

      {currentRoom && (
        <div className="walkthrough-form">
          <h2>Room: {currentRoom.name}</h2>
          
          {error && <div className="error-message">{error}</div>}

          <div className="upload-area">
            <div className="upload-box">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                id="photo-input"
              />
              <label htmlFor="photo-input" className="upload-label">
                <span className="upload-icon">📷</span>
                <span className="upload-text">
                  {uploading ? 'Uploading...' : 'Click to upload photos or drag and drop'}
                </span>
                <span className="upload-hint">PNG, JPG or GIF (max. 10MB each)</span>
              </label>
            </div>

            <div className="upload-tips">
              <h3>Photography Tips</h3>
              <ul>
                <li>Take clear, well-lit photos</li>
                <li>Capture multiple angles of each room</li>
                <li>Include any existing damage or wear</li>
                <li>Make sure photos are in focus</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="room-status">
        <h3>Room Progress</h3>
        <div className="room-list">
          {walkthrough.rooms.map((room: Room) => (
            <div 
              key={room.id} 
              className={`room-item ${room.status}`}
              onClick={() => room.status === 'pending' && setCurrentRoom(room)}
            >
              <span className="room-status-icon">
                {room.status === 'completed' ? '✓' : room.id === currentRoom?.id ? '→' : '○'}
              </span>
              <span className="room-name">{room.name}</span>
              <span className={`status-badge ${room.status}`}>
                {room.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="security-notice">
        <h3>🔒 Your Photos Are Secure</h3>
        <p>All photos are timestamped, locked, and cannot be modified or deleted. This creates an immutable record of your move-in condition.</p>
      </div>
    </div>
  )
}
