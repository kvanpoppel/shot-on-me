/**
 * Client-side image processing: downscale + HEIC→JPEG conversion.
 * Keeps uploads fast and compatible across all browsers/devices.
 */

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.85

/** Convert HEIC/HEIF to JPEG using heic2any (lazy-loaded). */
async function heicToBlob(file: File): Promise<Blob> {
  const heic2any = (await import('heic2any')).default
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: JPEG_QUALITY })
  return Array.isArray(result) ? result[0] : result
}

/** Downscale an image blob to MAX_DIMENSION, return as JPEG File. */
function downscale(blob: Blob, fileName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img

      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && blob.type === 'image/jpeg') {
        // Already small enough and JPEG — skip canvas
        resolve(new File([blob], fileName, { type: 'image/jpeg' }))
        return
      }

      // Scale down preserving aspect ratio
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (result) => {
          if (!result) { reject(new Error('Canvas conversion failed')); return }
          resolve(new File([result], fileName, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Prepare an image file for upload:
 * 1. Convert HEIC/HEIF → JPEG if needed
 * 2. Downscale to 1600px max dimension
 * 3. Return a JPEG File ready for FormData
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
    || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)

  const blob = isHeic ? await heicToBlob(file) : file
  const name = file.name.replace(/\.(heic|heif)$/i, '.jpg')

  return downscale(blob, name)
}
