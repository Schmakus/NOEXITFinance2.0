import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PdfExportEntry {
  date: string
  description: string
  amount: number
  eventName?: string
  eventLocation?: string
}

interface PdfExportOptions {
  logoDataUrl?: string // base64 PNG/JPG
  musicianName: string
  fromDate: string
  toDate: string
  entries: PdfExportEntry[]
}

export async function exportStatementPdf({
  logoDataUrl,
  musicianName,
  fromDate,
  toDate,
  entries,
}: PdfExportOptions) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let y = 40

  // Logo proportional einfügen (nur Breite festlegen)
  if (logoDataUrl) {
    let imgType: 'PNG' | 'JPEG' = 'PNG'
    if (logoDataUrl.startsWith('data:image/jpeg') || logoDataUrl.startsWith('data:image/jpg')) {
      imgType = 'JPEG'
    } else if (logoDataUrl.startsWith('data:image/png')) {
      imgType = 'PNG'
    } else {
      console.warn('Unbekannter Bildtyp für Logo, versuche PNG:', logoDataUrl.slice(0, 30))
    }
    try {
      // Bild laden, um Dimensionen zu bekommen
      const img = new window.Image()
      img.src = logoDataUrl
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      const maxWidth = 80 // gewünschte Breite in pt
      const aspect = img.width / img.height
      const width = maxWidth
      const height = Math.round(maxWidth / aspect)
      doc.addImage(logoDataUrl, imgType, 40, y, width, height)
      y += height + 20 // Fester Abstand nach Logo
    } catch (e) {
      console.warn('Logo konnte nicht ins PDF eingefügt werden:', e)
    }
  }

  // Titel & Header
  doc.setFontSize(18).text('Kontoauszug', 40, y)
  y += 25
  doc.setFontSize(11).setFont('helvetica', 'normal')
  doc.text(`Name: ${musicianName}`, 40, y)

  doc.text(`Zeitraum: ${fromDate} – ${toDate}`, 40, y + 15)

  // Summen berechnen
  const totalIncome = entries.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0)
  const totalExpense = entries.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0)
  // Auszahlungen: alle mit "Auszahlung" oder "payout" im description
  const totalPayout = entries.filter(e => (e.description || '').toLowerCase().includes('auszahlung') || (e.description || '').toLowerCase().includes('payout')).reduce((sum, e) => sum + e.amount, 0)

  y += 40
  
  // Summenreihe
  doc.setFontSize(11).setFont('helvetica', 'bold')
  const colWidth = 140
  const startX = 40
  doc.text('Gesamteinnahmen', startX, y)
  doc.text('Gesamtausgaben', startX + colWidth, y)
  doc.text('Auszahlungen', startX + 2 * colWidth, y)
  doc.setFont('helvetica', 'normal')
  y += 18
  doc.text(`${totalIncome.toFixed(2)} €`, startX, y)
  doc.text(`${Math.abs(totalExpense).toFixed(2)} €`, startX + colWidth, y)
  doc.text(`${Math.abs(totalPayout).toFixed(2)} €`, startX + 2 * colWidth, y)

  y += 22

  // Tabelle
  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    head: [['Datum', 'Bezeichnung', 'Betrag']],
    body: entries.map(entry => [
      entry.date,
      entry.eventLocation ? `${entry.description}, ${entry.eventLocation}` : entry.description,
      `${entry.amount.toFixed(2)} €`
    ]),
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 8 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 80 },          // Datum fix
      1: { cellWidth: 'auto' },      // Bezeichnung nimmt den Rest
      2: { cellWidth: 80, halign: 'right' } // Betrag fix & rechtsbündig
    },
    didDrawPage: () => {
      // Seitenzahlen unten mittig
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(10);
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(`Seite ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
    }
  })

  doc.save(`Kontoauszug-${musicianName}_${fromDate}-${toDate}.pdf`)
}
