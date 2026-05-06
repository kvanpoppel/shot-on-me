// Lightweight toast — replaces browser alert() across the app.
let toastTimeout: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3500) {
  const existing = document.getElementById('som-toast')
  if (existing) existing.remove()
  if (toastTimeout) clearTimeout(toastTimeout)

  const toast = document.createElement('div')
  toast.id = 'som-toast'
  toast.textContent = message
  const bg = type === 'error' ? 'rgba(255,70,60,0.95)' : type === 'success' ? 'rgba(40,180,80,0.95)' : 'rgba(50,50,70,0.95)'
  toast.style.cssText = `position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:99999;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;color:white;background:${bg};backdrop-filter:blur(12px);box-shadow:0 4px 20px rgba(0,0,0,0.3);max-width:90vw;text-align:center;animation:toast-in 0.25s ease-out;pointer-events:auto;`

  if (!document.getElementById('som-toast-style')) {
    const style = document.createElement('style')
    style.id = 'som-toast-style'
    style.textContent = '@keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}'
    document.head.appendChild(style)
  }

  document.body.appendChild(toast)

  toastTimeout = setTimeout(() => {
    toast.style.transition = 'opacity 0.3s'
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, duration)

  toast.addEventListener('click', () => {
    if (toastTimeout) clearTimeout(toastTimeout)
    toast.remove()
  })
}
