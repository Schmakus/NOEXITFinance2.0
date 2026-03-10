import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { invertImageDataUrl } from './invert-image'

interface GuestListPdfEntry {
  guest_name: string
  guest_count: number
}

interface ExportGuestListPdfOptions {
  logoUrl?: string | null
  logoWidthPt?: number
  location: string
  date: string
  entries: GuestListPdfEntry[]
}

async function svgUrlToPngDataUrlPreserveAspect(svgUrl: string): Promise<string | null> {
  try {
    const res = await fetch(svgUrl)
    if (!res.ok) return null
    const svgText = await res.text()
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
    const svgObjectUrl = URL.createObjectURL(svgBlob)

    const img = new window.Image()
    img.src = svgObjectUrl
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    const width = Math.max(1, img.naturalWidth || img.width)
    const height = Math.max(1, img.naturalHeight || img.height)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(svgObjectUrl)
      return null
    }

    ctx.drawImage(img, 0, 0, width, height)
    URL.revokeObjectURL(svgObjectUrl)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

async function imageUrlToDataUrl(imageUrl: string): Promise<string | null> {
  try {
    if (imageUrl.startsWith('data:image/')) return imageUrl

    if (imageUrl.toLowerCase().endsWith('.svg') || imageUrl.includes('image/svg+xml')) {
      return await svgUrlToPngDataUrlPreserveAspect(imageUrl)
    }

    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const blob = await res.blob()

    // Convert blob to data URL so jsPDF can embed it reliably.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('FileReader failed'))
      reader.readAsDataURL(blob)
    })

    return dataUrl || null
  } catch {
    return null
  }
}

function normalizeFileNamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
}

export async function exportGuestListPdf({ logoUrl, logoWidthPt, location, date, entries }: ExportGuestListPdfOptions) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const marginLeft = 42
  const marginRight = 42
  const usableWidth = pageWidth - marginLeft - marginRight
  let y = 36

  const logoDataUrl = logoUrl ? await imageUrlToDataUrl(logoUrl) : null
  if (logoDataUrl) {
    try {
      const invertedLogoDataUrl = await invertImageDataUrl(logoDataUrl)
      const img = new window.Image()
      img.src = invertedLogoDataUrl
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      const maxLogoWidth = logoWidthPt ?? 365
      const maxLogoHeight = 92
      const ratio = img.width / img.height
      let drawW = maxLogoWidth
      let drawH = drawW / ratio
      if (drawH > maxLogoHeight) {
        drawH = maxLogoHeight
        drawW = drawH * ratio
      }

      const x = (pageWidth - drawW) / 2
      const type = invertedLogoDataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG'
      doc.addImage(invertedLogoDataUrl, type, x, y, drawW, drawH)
      y += drawH + 36
    } catch {
      y += 10
    }
  }

  // Pure black/white typography and lines.
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
  doc.setFillColor(255, 255, 255)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('G Ä S T E L I S T E', pageWidth / 2, y, { align: 'center' })
  y += 42

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text(`${location}, ${date}`, pageWidth / 2, y, { align: 'center' })
  y += 34

  const tableRows = entries.map((entry) => [entry.guest_name, String(entry.guest_count)])

  // Ensure it stays on one A4 page by limiting body rows.
  const headerHeight = 28
  const rowHeight = 24
  const safeBottom = pageHeight - 42
  const available = safeBottom - y - headerHeight
  const maxRows = Math.max(0, Math.floor(available / rowHeight))
  const bodyRows = tableRows.slice(0, maxRows)

  autoTable(doc, {
    startY: y,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: 'grid',
    head: [['NAME', 'ANZAHL PERSONEN']],
    body: bodyRows,
    styles: {
      font: 'helvetica',
      fontStyle: 'normal',
      fontSize: 14,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 1,
      fillColor: [255, 255, 255],
      halign: 'left',
      valign: 'middle',
      cellPadding: { top: 5, right: 8, bottom: 5, left: 8 },
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 16,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 1,
      fillColor: [255, 255, 255],
    },
    bodyStyles: {
      minCellHeight: rowHeight,
    },
    columnStyles: {
      0: { cellWidth: usableWidth * 0.52 },
      1: { cellWidth: usableWidth * 0.48, halign: 'left' },
    },
    didDrawPage: () => {
      // Keep the PDF strictly single-page for this layout.
    },
  })

  const fileLocation = normalizeFileNamePart(location)
  const fileDate = normalizeFileNamePart(date)
  doc.save(`Gästeliste_${fileLocation}_${fileDate}.pdf`)
}
