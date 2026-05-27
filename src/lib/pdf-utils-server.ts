import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export interface InvoicePDFData {
  invoiceUid: string
  dateStr: string
  hospitalName: string
  hospitalAddress: string
  hospitalCity: string
  serviceCategory: string
  ticketUid: string
  baseAmount: number
  gstAmount: number
  tdsAmount: number
  totalAmount: number
  accountantName: string
}

export async function generateInvoicePDFBuffer(data: InvoicePDFData): Promise<Buffer> {
  // 1. Create new PDF document
  const pdfDoc = await PDFDocument.create()

  // 2. Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // 3. Load Seragen Logo from public folder
  let logoImage = null
  try {
    const logoPath = path.join(process.cwd(), 'public', 'seragen_logo.png')
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath)
      try {
        logoImage = await pdfDoc.embedPng(logoBytes)
      } catch {
        logoImage = await pdfDoc.embedJpg(logoBytes)
      }
    }
  } catch (error) {
    console.warn('[Server PDF] Could not load logo file from public folder:', error)
  }

  // 4. Add Page
  const page = pdfDoc.addPage()
  const { width, height } = page.getSize()

  let y = height - 50 // starting y coordinate

  // Draw Logo (if available) or Seragen Text header
  if (logoImage) {
    const logoWidth = 140
    const logoHeight = (logoImage.height / logoImage.width) * logoWidth
    page.drawImage(logoImage, {
      x: 50,
      y: y - logoHeight,
      width: logoWidth,
      height: logoHeight,
    })
    y -= (logoHeight + 20)
  } else {
    page.drawText('SERAGEN', {
      x: 50,
      y: y - 30,
      size: 24,
      font: boldFont,
      color: rgb(0.85, 0.15, 0.35), // Rose color
    })
    y -= 50
  }

  // Draw Company Address Block (Right Aligned)
  const companyLines = [
    'Seragen Biotherapeutics Pvt Ltd',
    '3rd Floor, Golden Heights,',
    'Rajajinagar, Bangalore - 560010',
    'GSTIN: 29AAFCS8712C1Z4',
    'finance@seragen.com'
  ]
  let companyY = height - 50
  companyLines.forEach((line) => {
    const lineWidth = font.widthOfTextAtSize(line, 8)
    page.drawText(line, {
      x: width - 50 - lineWidth,
      y: companyY,
      size: 8,
      font: font,
      color: rgb(0.4, 0.4, 0.4)
    })
    companyY -= 12
  })

  y = Math.min(y, companyY - 20)

  // Title: INVOICE
  page.drawText('INVOICE', {
    x: 50,
    y: y,
    size: 20,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  })

  // Horizontal line
  page.drawLine({
    start: { x: 50, y: y - 10 },
    end: { x: width - 50, y: y - 10 },
    thickness: 1,
    color: rgb(0.85, 0.15, 0.35), // Accent pink-rose
  })
  y -= 35

  // Metadata block (Invoice #, Date, Ticket ID, Category)
  const metaStartX = 50
  const metaColWidth = 130
  
  const drawMetaField = (label: string, val: string, colIdx: number) => {
    const x = metaStartX + (colIdx * metaColWidth)
    page.drawText(label.toUpperCase(), {
      x,
      y,
      size: 7,
      font: boldFont,
      color: rgb(0.5, 0.5, 0.5)
    })
    page.drawText(val || 'N/A', {
      x,
      y: y - 14,
      size: 10,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1)
    })
  }

  drawMetaField('Invoice Number', data.invoiceUid, 0)
  drawMetaField('Invoice Date', data.dateStr, 1)
  drawMetaField('Associated Ticket', data.ticketUid, 2)
  drawMetaField('Category', data.serviceCategory, 3)

  y -= 35

  // BILL TO Block & Dynamic Hospital Details
  page.drawText('BILL TO (HOSPITAL):', {
    x: 50,
    y: y,
    size: 8,
    font: boldFont,
    color: rgb(0.5, 0.5, 0.5)
  })

  const billToY = y - 14
  page.drawText(data.hospitalName || 'N/A', {
    x: 50,
    y: billToY,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1)
  })
  
  const addrText = `${data.hospitalAddress || ''}, ${data.hospitalCity || ''}`.trim()
  page.drawText(addrText || 'Address not specified', {
    x: 50,
    y: billToY - 14,
    size: 9,
    font: font,
    color: rgb(0.3, 0.3, 0.3)
  })

  y = billToY - 35

  // Invoice Table Headers
  const tableY = y
  page.drawRectangle({
    x: 50,
    y: tableY - 5,
    width: width - 100,
    height: 20,
    color: rgb(0.96, 0.96, 0.96)
  })

  page.drawText('Description', { x: 60, y: tableY, size: 8, font: boldFont, color: rgb(0.3, 0.3, 0.3) })
  page.drawText('Quantity', { x: 300, y: tableY, size: 8, font: boldFont, color: rgb(0.3, 0.3, 0.3) })
  page.drawText('Rate (₹)', { x: 380, y: tableY, size: 8, font: boldFont, color: rgb(0.3, 0.3, 0.3) })
  const amtHeadWidth = boldFont.widthOfTextAtSize('Amount (₹)', 8)
  page.drawText('Amount (₹)', { x: width - 60 - amtHeadWidth, y: tableY, size: 8, font: boldFont, color: rgb(0.3, 0.3, 0.3) })

  // Invoice Table Row
  const rowY = tableY - 25
  const desc = `Clinical workflow charge for ticket ${data.ticketUid}`
  page.drawText(desc, { x: 60, y: rowY, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) })
  page.drawText('1', { x: 310, y: rowY, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(Number(data.baseAmount).toFixed(2), { x: 380, y: rowY, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) })
  const baseAmtVal = Number(data.baseAmount).toFixed(2)
  const baseAmtWidth = font.widthOfTextAtSize(baseAmtVal, 9)
  page.drawText(baseAmtVal, { x: width - 60 - baseAmtWidth, y: rowY, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) })

  // Summary box
  y = rowY - 40
  const boxHeight = 100
  const boxWidth = 220
  const boxX = width - 50 - boxWidth

  page.drawRectangle({
    x: boxX,
    y: y - boxHeight + 20,
    width: boxWidth,
    height: boxHeight,
    color: rgb(0.98, 0.98, 0.98)
  })

  const drawSummaryLine = (label: string, amount: number, isTotal = false) => {
    const fontToUse = isTotal ? boldFont : font
    const colorToUse = isTotal ? rgb(0.85, 0.15, 0.35) : rgb(0.2, 0.2, 0.2)
    const valText = Number(amount).toFixed(2)
    const valWidth = fontToUse.widthOfTextAtSize(valText, 9)
    
    page.drawText(label, { x: boxX + 15, y, size: 9, font: fontToUse, color: colorToUse })
    page.drawText(valText, { x: boxX + boxWidth - 15 - valWidth, y, size: 9, font: fontToUse, color: colorToUse })
    
    y -= 20
  }

  drawSummaryLine('Subtotal', data.baseAmount)
  drawSummaryLine('GST (18%)', data.gstAmount)
  drawSummaryLine('TDS (10%)', -data.tdsAmount)
  
  // Divider before total
  page.drawLine({
    start: { x: boxX + 10, y: y + 8 },
    end: { x: boxX + boxWidth - 10, y: y + 8 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8)
  })
  
  drawSummaryLine('Total Amount', data.totalAmount, true)

  // Accountant sign-off details
  page.drawText('GENERATED BY AUTHORITY:', {
    x: 50,
    y: y - 10,
    size: 7,
    font: boldFont,
    color: rgb(0.5, 0.5, 0.5)
  })

  page.drawText(data.accountantName || 'System Accountant', {
    x: 50,
    y: y - 24,
    size: 10,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1)
  })

  page.drawText('Corporate Finance Division', {
    x: 50,
    y: y - 36,
    size: 8,
    font: font,
    color: rgb(0.4, 0.4, 0.4)
  })

  // Footer terms
  page.drawText('This is a computer-generated document and does not require a physical signature.', {
    x: 50,
    y: 35,
    size: 7,
    font: font,
    color: rgb(0.5, 0.5, 0.5)
  })

  // 5. Save and Return Buffer
  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
