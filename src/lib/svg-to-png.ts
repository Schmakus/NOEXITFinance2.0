// Utility to convert SVG to PNG DataURL for jsPDF logo embedding
export async function svgUrlToPngDataUrl(svgUrl: string, width = 80, height = 40): Promise<string> {
  const res = await fetch(svgUrl)
  const svgText = await res.text()
  const svg = new Blob([svgText], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svg)
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject('Canvas context error')
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = url
  })
}
