'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Type, PenTool, Crop, Music, Filter, Save, Undo, Redo, Trash2, Sparkles, Palette, Move } from 'lucide-react'
import Cropper, { Area } from 'react-easy-crop'

interface StoryEditorProps {
  file: File
  preview: string
  onSave: (editedFile: File, caption: string, metadata?: any) => void
  onCancel: () => void
}

type Tool = 'none' | 'text' | 'draw' | 'crop' | 'filter' | 'music'

interface TextElement {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  fontFamily: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  italic: boolean
}

const FONTS = [
  { name: 'Classic', value: 'Arial' },
  { name: 'Modern', value: 'Helvetica' },
  { name: 'Elegant', value: 'Georgia' },
  { name: 'Bold', value: 'Impact' },
  { name: 'Playful', value: 'Comic Sans MS' },
  { name: 'Monospace', value: 'Courier New' }
]

const COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
  { name: 'Neon Green', value: '#00FF88' },
  { name: 'Hot Pink', value: '#FF00FF' },
  { name: 'Electric Blue', value: '#00BFFF' },
  { name: 'Sunset', value: '#FF6B35' },
  { name: 'Purple', value: '#9D4EDD' },
  { name: 'Gold', value: '#FFD700' },
  { name: 'Cyan', value: '#00FFFF' },
  { name: 'Red', value: '#FF0000' },
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Orange', value: '#FFA500' }
]

const FILTERS = [
  { name: 'Original', value: 'none', preview: 'brightness(1) contrast(1) saturate(1)' },
  { name: 'Vintage', value: 'vintage', preview: 'sepia(1) contrast(1.2) brightness(0.9)' },
  { name: 'B&W', value: 'bw', preview: 'grayscale(1)' },
  { name: 'Sepia', value: 'sepia', preview: 'sepia(1)' },
  { name: 'Bright', value: 'bright', preview: 'brightness(1.3) contrast(1.1)' },
  { name: 'Cool', value: 'cool', preview: 'brightness(0.95) saturate(0.8) hue-rotate(10deg)' },
  { name: 'Warm', value: 'warm', preview: 'brightness(1.1) saturate(1.2) hue-rotate(-10deg)' },
  { name: 'Dramatic', value: 'dramatic', preview: 'contrast(1.5) brightness(0.8) saturate(1.3)' }
]

export default function StoryEditor({ file, preview, onSave, onCancel }: StoryEditorProps) {
  const [activeTool, setActiveTool] = useState<Tool>('none')
  const [caption, setCaption] = useState('')
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('none')
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null)
  
  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  
  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawColor, setDrawColor] = useState('#FFFFFF')
  const [brushSize, setBrushSize] = useState(5)
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Text editing state
  const [textInput, setTextInput] = useState('')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [textFont, setTextFont] = useState('Arial')
  const [textSize, setTextSize] = useState(36)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center')
  const [textBold, setTextBold] = useState(false)
  const [textItalic, setTextItalic] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null)

  // Initialize canvas for drawing
  useEffect(() => {
    if (activeTool === 'draw' && canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx && imageRef.current.complete) {
        canvas.width = imageRef.current.offsetWidth
        canvas.height = imageRef.current.offsetHeight
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setDrawingHistory([])
        setHistoryIndex(-1)
      }
    }
  }, [activeTool])

  // Handle image load for canvas sizing
  useEffect(() => {
    if (imageRef.current && canvasRef.current) {
      const img = imageRef.current
      const canvas = canvasRef.current
      const updateCanvasSize = () => {
        if (img.complete) {
          canvas.width = img.offsetWidth
          canvas.height = img.offsetHeight
        }
      }
      img.addEventListener('load', updateCanvasSize)
      updateCanvasSize()
      return () => img.removeEventListener('load', updateCanvasSize)
    }
  }, [preview])

  const handleCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleDrawStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'draw') return
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = drawColor
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const handleDrawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const handleDrawEnd = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Save to history for undo
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const newHistory = drawingHistory.slice(0, historyIndex + 1)
    newHistory.push(imageData)
    setDrawingHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndex <= 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const newIndex = historyIndex - 1
    ctx.putImageData(drawingHistory[newIndex], 0, 0)
    setHistoryIndex(newIndex)
  }

  const handleRedo = () => {
    if (historyIndex >= drawingHistory.length - 1) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const newIndex = historyIndex + 1
    ctx.putImageData(drawingHistory[newIndex], 0, 0)
    setHistoryIndex(newIndex)
  }

  const handleClearDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setDrawingHistory([])
    setHistoryIndex(-1)
  }

  // Tap-to-place text positioning
  const handleImageTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (activeTool !== 'text' || !showTextInput) return
    
    const container = containerRef.current
    if (!container) return
    
    const rect = container.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    // Check for double tap to place
    const now = Date.now()
    const lastTap = lastTapRef.current
    
    if (lastTap && now - lastTap.time < 300 && 
        Math.abs(x - lastTap.x) < 10 && Math.abs(y - lastTap.y) < 10) {
      // Double tap - place text here
      if (textInput.trim()) {
        const newText: TextElement = {
          id: Date.now().toString(),
          text: textInput,
          x: x,
          y: y,
          fontSize: textSize,
          color: textColor,
          fontFamily: textFont,
          align: textAlign,
          bold: textBold,
          italic: textItalic
        }
        setTextElements([...textElements, newText])
        setTextInput('')
        setSelectedTextId(newText.id)
        setShowTextInput(false)
      }
      lastTapRef.current = null
    } else {
      lastTapRef.current = { x, y, time: now }
    }
  }

  const addTextElement = () => {
    if (!textInput.trim()) return
    // Place in center by default
    const container = containerRef.current
    if (!container) return
    
    const newText: TextElement = {
      id: Date.now().toString(),
      text: textInput,
      x: container.offsetWidth / 2,
      y: container.offsetHeight / 2,
      fontSize: textSize,
      color: textColor,
      fontFamily: textFont,
      align: textAlign,
      bold: textBold,
      italic: textItalic
    }
    setTextElements([...textElements, newText])
    setTextInput('')
    setSelectedTextId(newText.id)
    setShowTextInput(false)
  }

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(textElements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  const deleteTextElement = (id: string) => {
    setTextElements(textElements.filter(el => el.id !== id))
    setSelectedTextId(null)
  }

  // Tap text to select and move
  const handleTextTap = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTextId(id)
    
    // Allow moving by dragging
    const startX = e.clientX
    const startY = e.clientY
    const textEl = textElements.find(el => el.id === id)
    if (!textEl) return
    
    const startTextX = textEl.x
    const startTextY = textEl.y
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      updateTextElement(id, {
        x: Math.max(0, Math.min(container.offsetWidth, startTextX + deltaX)),
        y: Math.max(0, Math.min(container.offsetHeight, startTextY + deltaY))
      })
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const applyFilter = (image: HTMLImageElement, filter: string): string => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return preview
    
    canvas.width = image.width
    canvas.height = image.height
    ctx.drawImage(image, 0, 0)
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    switch (filter) {
      case 'bw':
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }
        break
      case 'sepia':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189))
          data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168))
          data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131))
        }
        break
      case 'bright':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 1.2)
          data[i + 1] = Math.min(255, data[i + 1] * 1.2)
          data[i + 2] = Math.min(255, data[i + 2] * 1.2)
        }
        break
      case 'cool':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, data[i] * 0.9)
          data[i + 1] = data[i + 1]
          data[i + 2] = Math.min(255, data[i + 2] * 1.1)
        }
        break
      case 'warm':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 1.1)
          data[i + 1] = Math.min(255, data[i + 1] * 1.05)
          data[i + 2] = Math.max(0, data[i + 2] * 0.95)
        }
        break
    }
    
    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL()
  }

  const handleSave = async () => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = preview
      
      await new Promise((resolve) => {
        img.onload = resolve
        if (img.complete) resolve(null)
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas size
      if (croppedAreaPixels && activeTool === 'crop') {
        canvas.width = croppedAreaPixels.width
        canvas.height = croppedAreaPixels.height
        ctx.drawImage(
          img,
          croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height,
          0, 0, croppedAreaPixels.width, croppedAreaPixels.height
        )
      } else {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
      }

      // Apply filter
      if (currentFilter !== 'none') {
        const filteredData = applyFilter(img, currentFilter)
        const filteredImg = new Image()
        filteredImg.src = filteredData
        await new Promise((resolve) => {
          filteredImg.onload = resolve
        })
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(filteredImg, 0, 0, canvas.width, canvas.height)
      }

      // Draw drawing canvas on top
      if (canvasRef.current && activeTool === 'draw') {
        const drawCanvas = canvasRef.current
        ctx.drawImage(drawCanvas, 0, 0, canvas.width, canvas.height)
      }

      // Draw text elements
      textElements.forEach(el => {
        ctx.save()
        ctx.font = `${el.bold ? 'bold ' : ''}${el.italic ? 'italic ' : ''}${el.fontSize}px ${el.fontFamily}`
        ctx.fillStyle = el.color
        ctx.textAlign = el.align
        ctx.textBaseline = 'top'
        const x = el.align === 'center' ? canvas.width / 2 : el.align === 'right' ? canvas.width - el.x : el.x
        ctx.fillText(el.text, x, el.y)
        ctx.restore()
      })

      // Convert to blob and create file
      canvas.toBlob((blob) => {
        if (!blob) return
        const editedFile = new File([blob], file.name, { type: file.type })
        onSave(editedFile, caption, {
          filter: currentFilter,
          music: selectedMusic,
          textElements,
          hasDrawing: activeTool === 'draw'
        })
      }, file.type, 0.95)
    } catch (error) {
      console.error('Error saving story:', error)
      alert('Failed to process story. Please try again.')
    }
  }

  const isVideo = file.type.startsWith('video/')
  const selectedFilter = FILTERS.find(f => f.value === currentFilter)

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-primary-500/20 bg-black/95 backdrop-blur-md">
        <button
          onClick={onCancel}
          className="text-primary-500 hover:text-primary-400 transition-colors p-2 rounded-lg hover:bg-primary-500/10"
        >
          <X size={24} />
        </button>
        <h2 className="text-primary-500 font-semibold text-lg">Edit Story</h2>
        <button
          onClick={handleSave}
          className="text-primary-500 font-semibold hover:text-primary-400 transition-colors px-4 py-2 rounded-lg hover:bg-primary-500/10 flex items-center gap-2"
        >
          <Save size={20} />
          <span>Share</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative flex items-center justify-center bg-black overflow-hidden"
          onClick={activeTool === 'text' && showTextInput ? handleImageTap : undefined}
          onTouchEnd={activeTool === 'text' && showTextInput ? handleImageTap : undefined}
        >
          {isVideo ? (
            <video 
              src={preview} 
              className="max-w-full max-h-full object-contain"
              controls={activeTool === 'none'}
              autoPlay
              loop
              muted
            />
          ) : (
            <>
              <img
                ref={imageRef}
                src={preview}
                alt="Story preview"
                className="max-w-full max-h-full object-contain"
                style={{
                  filter: selectedFilter?.preview || 'none'
                }}
              />
              {activeTool === 'crop' && (
                <div className="absolute inset-0">
                  <Cropper
                    image={preview}
                    crop={crop}
                    zoom={zoom}
                    aspect={9 / 16}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={handleCropComplete}
                    style={{
                      containerStyle: { width: '100%', height: '100%' }
                    }}
                  />
                </div>
              )}
              {activeTool === 'draw' && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 cursor-crosshair touch-none"
                  onMouseDown={handleDrawStart}
                  onMouseMove={handleDrawMove}
                  onMouseUp={handleDrawEnd}
                  onMouseLeave={handleDrawEnd}
                  onTouchStart={handleDrawStart}
                  onTouchMove={handleDrawMove}
                  onTouchEnd={handleDrawEnd}
                />
              )}
              {textElements.map(el => (
                <div
                  key={el.id}
                  onClick={(e) => {
                    if (activeTool === 'text') {
                      handleTextTap(el.id, e)
                    }
                  }}
                  className={`absolute cursor-move transition-all ${
                    selectedTextId === el.id 
                      ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-black' 
                      : 'hover:ring-2 hover:ring-primary-500/50'
                  }`}
                  style={{
                    left: el.x,
                    top: el.y,
                    fontSize: el.fontSize,
                    color: el.color,
                    fontFamily: el.fontFamily,
                    fontWeight: el.bold ? 'bold' : 'normal',
                    fontStyle: el.italic ? 'italic' : 'normal',
                    textAlign: el.align,
                    transform: 'translate(-50%, -50%)',
                    maxWidth: '80%',
                    wordWrap: 'break-word',
                    textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5)'
                  }}
                >
                  {el.text}
                  {selectedTextId === el.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTextElement(el.id)
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  )}
                </div>
              ))}
              {activeTool === 'text' && showTextInput && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="bg-primary-500/20 backdrop-blur-sm border-2 border-dashed border-primary-500/50 rounded-lg px-4 py-2">
                    <p className="text-primary-500 text-sm font-medium">Tap to place text</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Toolbar */}
        <div className="bg-black/95 backdrop-blur-md border-t border-primary-500/20 p-4 space-y-4">
          {/* Main Tools */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setActiveTool(activeTool === 'text' ? 'none' : 'text')
                if (activeTool !== 'text') {
                  setShowTextInput(true)
                } else {
                  setShowTextInput(false)
                }
              }}
              className={`relative p-3.5 rounded-xl transition-all ${
                activeTool === 'text' 
                  ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/50' 
                  : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'
              }`}
            >
              <Type size={22} />
              {activeTool === 'text' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-black" />
              )}
            </button>
            <button
              onClick={() => setActiveTool(activeTool === 'draw' ? 'none' : 'draw')}
              className={`relative p-3.5 rounded-xl transition-all ${
                activeTool === 'draw' 
                  ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/50' 
                  : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'
              }`}
            >
              <PenTool size={22} />
              {activeTool === 'draw' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-black" />
              )}
            </button>
            {!isVideo && (
              <>
                <button
                  onClick={() => setActiveTool(activeTool === 'crop' ? 'none' : 'crop')}
                  className={`relative p-3.5 rounded-xl transition-all ${
                    activeTool === 'crop' 
                      ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/50' 
                      : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'
                  }`}
                >
                  <Crop size={22} />
                  {activeTool === 'crop' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-black" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTool(activeTool === 'filter' ? 'none' : 'filter')}
                  className={`relative p-3.5 rounded-xl transition-all ${
                    activeTool === 'filter' 
                      ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/50' 
                      : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'
                  }`}
                >
                  <Filter size={22} />
                  {activeTool === 'filter' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-black" />
                  )}
                </button>
              </>
            )}
            <button
              onClick={() => setShowMusicPicker(!showMusicPicker)}
              className={`relative p-3.5 rounded-xl transition-all ${
                showMusicPicker 
                  ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/50' 
                  : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'
              }`}
            >
              <Music size={22} />
              {showMusicPicker && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-black" />
              )}
            </button>
          </div>

          {/* Tool-specific controls */}
          {activeTool === 'text' && (
            <div className="space-y-3 border-t border-primary-500/20 pt-4 animate-in slide-in-from-bottom-2">
              {showTextInput && (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your text..."
                    className="flex-1 px-4 py-3 bg-black/60 border border-primary-500/30 rounded-xl text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addTextElement()
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={addTextElement}
                    className="px-5 py-3 bg-primary-500 text-black rounded-xl font-semibold hover:bg-primary-600 transition-all shadow-lg"
                  >
                    Add
                  </button>
                </div>
              )}
              {selectedTextId && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-primary-400 text-sm font-medium w-16">Size</span>
                    <input
                      type="range"
                      min="20"
                      max="80"
                      value={textSize}
                      onChange={(e) => {
                        const size = parseInt(e.target.value)
                        setTextSize(size)
                        if (selectedTextId) {
                          updateTextElement(selectedTextId, { fontSize: size })
                        }
                      }}
                      className="flex-1 accent-primary-500"
                    />
                    <span className="text-primary-500 text-sm font-semibold w-10">{textSize}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary-400 text-sm font-medium w-16">Font</span>
                    <select
                      value={textFont}
                      onChange={(e) => {
                        setTextFont(e.target.value)
                        if (selectedTextId) {
                          updateTextElement(selectedTextId, { fontFamily: e.target.value })
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-black/60 border border-primary-500/30 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500"
                    >
                      {FONTS.map(font => (
                        <option key={font.value} value={font.value}>{font.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary-400 text-sm font-medium w-16">Color</span>
                    <div className="flex gap-2 flex-wrap flex-1">
                      {COLORS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => {
                            setTextColor(color.value)
                            if (selectedTextId) {
                              updateTextElement(selectedTextId, { color: color.value })
                            }
                          }}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            textColor === color.value 
                              ? 'border-primary-500 ring-2 ring-primary-500/50 scale-110' 
                              : 'border-primary-500/30 hover:border-primary-500/60'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTextBold(!textBold)
                        if (selectedTextId) {
                          updateTextElement(selectedTextId, { bold: !textBold })
                        }
                      }}
                      className={`px-4 py-2 rounded-lg font-bold transition-all ${
                        textBold 
                          ? 'bg-primary-500 text-black' 
                          : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'
                      }`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => {
                        setTextItalic(!textItalic)
                        if (selectedTextId) {
                          updateTextElement(selectedTextId, { italic: !textItalic })
                        }
                      }}
                      className={`px-4 py-2 rounded-lg italic transition-all ${
                        textItalic 
                          ? 'bg-primary-500 text-black' 
                          : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'
                      }`}
                    >
                      I
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTool === 'draw' && (
            <div className="space-y-3 border-t border-primary-500/20 pt-4 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-primary-400 text-sm font-medium">Brush</span>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="flex-1 accent-primary-500"
                  />
                  <div className="w-12 h-12 rounded-full border-2 border-primary-500/30 flex items-center justify-center bg-black/40">
                    <div 
                      className="rounded-full bg-primary-500"
                      style={{ width: brushSize, height: brushSize }}
                    />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {COLORS.slice(0, 8).map(color => (
                    <button
                      key={color.value}
                      onClick={() => setDrawColor(color.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        drawColor === color.value 
                          ? 'border-primary-500 ring-2 ring-primary-500/50 scale-110' 
                          : 'border-primary-500/30 hover:border-primary-500/60'
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-2 bg-primary-500/10 text-primary-500 rounded-lg disabled:opacity-30 hover:bg-primary-500/20 transition-all"
                  >
                    <Undo size={18} />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= drawingHistory.length - 1}
                    className="p-2 bg-primary-500/10 text-primary-500 rounded-lg disabled:opacity-30 hover:bg-primary-500/20 transition-all"
                  >
                    <Redo size={18} />
                  </button>
                  <button
                    onClick={handleClearDrawing}
                    className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTool === 'crop' && (
            <div className="space-y-3 border-t border-primary-500/20 pt-4 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-4">
                <span className="text-primary-400 text-sm font-medium">Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-primary-500"
                />
                <span className="text-primary-500 text-sm font-semibold w-12">{zoom.toFixed(1)}x</span>
              </div>
            </div>
          )}

          {activeTool === 'filter' && (
            <div className="border-t border-primary-500/20 pt-4 animate-in slide-in-from-bottom-2">
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {FILTERS.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setCurrentFilter(filter.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all flex-shrink-0 ${
                      currentFilter === filter.value
                        ? 'bg-primary-500 text-black'
                        : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'
                    }`}
                  >
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-primary-500/30 overflow-hidden"
                      style={{ filter: filter.preview }}
                    >
                      <img 
                        src={preview} 
                        alt={filter.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs font-medium">{filter.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showMusicPicker && (
            <div className="border-t border-primary-500/20 pt-4 animate-in slide-in-from-bottom-2">
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Music className="w-5 h-5 text-primary-500" />
                  <span className="text-primary-500 font-semibold">Music</span>
                </div>
                <p className="text-primary-400/70 text-sm">
                  Music overlay feature coming soon! Add your favorite tracks to stories.
                </p>
              </div>
            </div>
          )}

          {/* Caption */}
          <div className="border-t border-primary-500/20 pt-4">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full px-4 py-3 bg-black/60 border border-primary-500/30 rounded-xl text-primary-500 placeholder-primary-600 resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
