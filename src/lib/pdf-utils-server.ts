import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export interface InvoicePDFData {
  invoiceUid: string
  dateStr: string
  datePeriodStr: string
  hospitalName: string
  hospitalAddress: string
  hospitalCity: string
  ticketCount: number
  baseAmount: number
  gstAmount: number
  tdsAmount: number
  totalAmount: number
  accountantName: string
}

export interface AnnexureTicketRow {
  ticketUid: string
  patientName: string
  serviceName: string
  completedAt: string
  baseAmount: number
  gstAmount: number
  tdsAmount: number
  totalAmount: number
}

export interface AnnexurePDFData {
  invoiceUid: string
  dateStr: string
  datePeriodStr: string
  hospitalName: string
  tickets: AnnexureTicketRow[]
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

  // Metadata block (Invoice #, Date, Billing Period, Billed Count)
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
  drawMetaField('Billing Period', data.datePeriodStr, 2)
  drawMetaField('Billed Tickets', `${data.ticketCount} Case(s)`, 3)

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
  page.drawText('Cases', { x: 300, y: tableY, size: 8, font: boldFont, color: rgb(0.3, 0.3, 0.3) })
  page.drawText('Rate (₹)', { x: 380, y: tableY, size: 8, font: boldFont, color: rgb(0.3, 0.3, 0.3) })
  const amtHeadWidth = boldFont.widthOfTextAtSize('Amount (₹)', 8)
  page.drawText('Amount (₹)', { x: width - 60 - amtHeadWidth, y: tableY, size: 8, font: boldFont, color: rgb(0.3, 0.3, 0.3) })

  // Invoice Table Row
  const rowY = tableY - 25
  const desc = `Bulk clinical workflow charge for ${data.ticketCount} completed cases`
  page.drawText(desc, { x: 60, y: rowY, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(String(data.ticketCount), { x: 310, y: rowY, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) })
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

export async function generateAnnexurePDFBuffer(data: AnnexurePDFData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Document setup
  let page = pdfDoc.addPage()
  let { width, height } = page.getSize()
  let pageNumber = 1

  const drawHeader = (currentPage: any) => {
    currentPage.drawText('ANNEXURE - PATIENT DETAIL BREAKDOWN', {
      x: 50,
      y: height - 40,
      size: 14,
      font: boldFont,
      color: rgb(0.85, 0.15, 0.35)
    })

    currentPage.drawText(`Invoice Ref: ${data.invoiceUid} | Period: ${data.datePeriodStr}`, {
      x: 50,
      y: height - 55,
      size: 9,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3)
    })

    currentPage.drawText(`Hospital: ${data.hospitalName}`, {
      x: 50,
      y: height - 70,
      size: 9,
      font: font,
      color: rgb(0.4, 0.4, 0.4)
    })

    // Draw table headers
    const headerY = height - 100
    currentPage.drawRectangle({
      x: 50,
      y: headerY - 4,
      width: width - 100,
      height: 16,
      color: rgb(0.96, 0.96, 0.96)
    })

    const drawHeaderCol = (txt: string, xPos: number, isRight = false) => {
      if (isRight) {
        const w = boldFont.widthOfTextAtSize(txt, 7)
        currentPage.drawText(txt, { x: xPos - w, y: headerY, size: 7, font: boldFont, color: rgb(0.3, 0.3, 0.3) })
      } else {
        currentPage.drawText(txt, { x: xPos, y: headerY, size: 7, font: boldFont, color: rgb(0.3, 0.3, 0.3) })
      }
    }

    drawHeaderCol('S.No', 55)
    drawHeaderCol('Ticket UID', 85)
    drawHeaderCol('Patient Name', 145)
    drawHeaderCol('Service Name', 255)
    drawHeaderCol('Date', 360)
    drawHeaderCol('Rate (₹)', 440, true)
    drawHeaderCol('GST (₹)', 490, true)
    drawHeaderCol('TDS (₹)', 540, true)
    drawHeaderCol('Total (₹)', width - 55, true)

    currentPage.drawLine({
      start: { x: 50, y: headerY - 6 },
      end: { x: width - 50, y: headerY - 6 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    })
  }

  const drawFooter = (currentPage: any, pNum: number) => {
    currentPage.drawText(`Page ${pNum}`, {
      x: width / 2 - 15,
      y: 25,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    })
  }

  // Draw first page header
  drawHeader(page)
  let y = height - 120

  // Draw rows
  data.tickets.forEach((t, idx) => {
    // Pagination check
    if (y < 60) {
      drawFooter(page, pageNumber)
      page = pdfDoc.addPage()
      pageNumber++
      drawHeader(page)
      y = height - 120
    }

    const drawCellCol = (txt: string, xPos: number, isRight = false, isBold = false) => {
      const activeFont = isBold ? boldFont : font
      const cleanText = txt || ''
      if (isRight) {
        const w = activeFont.widthOfTextAtSize(cleanText, 7)
        page.drawText(cleanText, { x: xPos - w, y, size: 7, font: activeFont, color: rgb(0.2, 0.2, 0.2) })
      } else {
        page.drawText(cleanText, { x: xPos, y, size: 7, font: activeFont, color: rgb(0.2, 0.2, 0.2) })
      }
    }

    drawCellCol(String(idx + 1), 55)
    drawCellCol(t.ticketUid, 85, false, true)
    drawCellCol(t.patientName, 145)
    drawCellCol(t.serviceName, 255)
    drawCellCol(new Date(t.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), 360)
    drawCellCol(Number(t.baseAmount).toFixed(2), 440, true)
    drawCellCol(Number(t.gstAmount).toFixed(2), 490, true)
    drawCellCol(Number(t.tdsAmount).toFixed(2), 540, true)
    drawCellCol(Number(t.totalAmount).toFixed(2), width - 55, true, true)

    page.drawLine({
      start: { x: 50, y: y - 4 },
      end: { x: width - 50, y: y - 4 },
      thickness: 0.2,
      color: rgb(0.9, 0.9, 0.9)
    })

    y -= 14
  })

  // Final summary numbers
  const totalBase = data.tickets.reduce((acc, t) => acc + t.baseAmount, 0)
  const totalGst = data.tickets.reduce((acc, t) => acc + t.gstAmount, 0)
  const totalTds = data.tickets.reduce((acc, t) => acc + t.tdsAmount, 0)
  const totalTotal = data.tickets.reduce((acc, t) => acc + t.totalAmount, 0)

  if (y < 80) {
    drawFooter(page, pageNumber)
    page = pdfDoc.addPage()
    pageNumber++
    drawHeader(page)
    y = height - 120
  }

  y -= 10
  page.drawRectangle({
    x: 50,
    y: y - 4,
    width: width - 100,
    height: 18,
    color: rgb(0.98, 0.98, 0.98)
  })

  page.drawText('GRAND TOTALS', { x: 55, y: y, size: 7, font: boldFont, color: rgb(0.85, 0.15, 0.35) })
  
  const drawSummaryCell = (val: number, xPos: number) => {
    const valText = Number(val).toFixed(2)
    const w = boldFont.widthOfTextAtSize(valText, 7)
    page.drawText(valText, { x: xPos - w, y, size: 7, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  }

  drawSummaryCell(totalBase, 440)
  drawSummaryCell(totalGst, 490)
  drawSummaryCell(totalTds, 540)
  drawSummaryCell(totalTotal, width - 55)

  drawFooter(page, pageNumber)

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
