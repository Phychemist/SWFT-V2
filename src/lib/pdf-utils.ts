import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface AssignmentPDFData {
    ticketUid: string;
    patientName: string;
    hospitalName: string;
    assignedToName: string;
    transitionDate: string;
    testType: string;
    collectionDate: string;
    collectionTime: string;
}

export const generateAssignmentPDF = async (data: AssignmentPDFData) => {
    try {
        // 1. Create a new PDF document
        const pdfDoc = await PDFDocument.create()

        // 2. Embed fonts and logo
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

        // Load the logo with robust format handling
        let logoImage;
        try {
            const logoBytes = await fetch('/seragen_logo.png').then(res => {
                if (!res.ok) throw new Error('Failed to fetch logo')
                return res.arrayBuffer()
            })

            // Try PNG first
            try {
                logoImage = await pdfDoc.embedPng(logoBytes)
            } catch (pngError) {
                // If PNG fails, try JPEG
                try {
                    logoImage = await pdfDoc.embedJpg(logoBytes)
                } catch (jpgError) {
                    console.warn('Logo is not valid PNG or JPEG:', jpgError)
                    logoImage = null
                }
            }
        } catch (error) {
            console.warn('Could not load logo:', error)
            logoImage = null
        }

        // 3. Add Cover Page
        const page = pdfDoc.addPage()
        const { width, height } = page.getSize()

        let logoHeight = 0

        // Draw Logo if loaded successfully
        if (logoImage) {
            const logoWidth = 200
            logoHeight = (logoImage.height / logoImage.width) * logoWidth

            page.drawImage(logoImage, {
                x: width / 2 - logoWidth / 2,
                y: height - 100 - logoHeight, // Top margin
                width: logoWidth,
                height: logoHeight,
            })
        }

        // Draw Header Title
        const title = "Test Requisition Form"
        const titleSize = 24
        const titleWidth = boldFont.widthOfTextAtSize(title, titleSize)

        page.drawText(title, {
            x: width / 2 - titleWidth / 2,
            y: height - 150 - logoHeight,
            size: titleSize,
            font: boldFont,
            color: rgb(0, 0, 0), // Teal #000000ff
        })

        // Draw Ticket Information Table
        let y = height - 250 - logoHeight
        const startX = 50
        const labelX = 50
        const valueX = 250
        const lineHeight = 30

        const drawField = (label: string, value: string) => {
            const cleanValue = value || "N/A"
            const maxWidth = width - valueX - 50 // Available width for value
            const fontSize = 14

            // Simple word wrapping
            const words = cleanValue.split(' ')
            let lines: string[] = []
            let currentLine = words[0]

            for (let i = 1; i < words.length; i++) {
                const word = words[i]
                const testLine = currentLine + " " + word
                const width = font.widthOfTextAtSize(testLine, fontSize)

                if (width < maxWidth) {
                    currentLine = testLine
                } else {
                    lines.push(currentLine)
                    currentLine = word
                }
            }
            lines.push(currentLine)

            // Draw Label
            page.drawText(`${label}:`, {
                x: labelX,
                y,
                size: fontSize,
                font: boldFont,
                color: rgb(0.2, 0.2, 0.2),
            })

            // Draw Value Lines
            lines.forEach((line, i) => {
                page.drawText(line, {
                    x: valueX,
                    y: y - (i * 18), // 18 spacing for wrapped lines
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                })
            })

            // Calculate height used by this field
            // 1 line = 0 extra height. 2 lines = 18 extra height.
            const fieldHeight = Math.max(lineHeight, (lines.length * 18) + 12)

            // Add a light underline below the text
            const lineY = y - ((lines.length - 1) * 18) - 8

            page.drawLine({
                start: { x: labelX, y: lineY },
                end: { x: width - 50, y: lineY },
                thickness: 0.5,
                color: rgb(0.8, 0.8, 0.8),
            })

            y -= fieldHeight
        }

        drawField("Ticket ID", data.ticketUid)
        drawField("Patient Name", data.patientName)
        drawField("Hospital Name", data.hospitalName)
        drawField("Type of Test", data.testType)
        drawField("Sample Collection Date", data.collectionDate)
        drawField("Sample Collection Time", data.collectionTime)
        drawField("Assigned Field Executive", data.assignedToName)

        // Add footer note
        page.drawText("Generated by Seragen System", {
            x: width / 2 - 80,
            y: 30,
            size: 10,
            font: font,
            color: rgb(0.6, 0.6, 0.6),
        })

        // 4. Merge with Template
        try {
            const templateBytes = await fetch('/templates/test_requisition_form.pdf').then(res => res.arrayBuffer())
            const templatePdf = await PDFDocument.load(templateBytes)
            const templatePages = await pdfDoc.copyPages(templatePdf, templatePdf.getPageIndices())

            for (const tempPage of templatePages) {
                pdfDoc.addPage(tempPage)
            }
        } catch (error) {
            console.error("Failed to load or merge template PDF:", error)
            // Continue even if template fails, delivering at least the cover page
        }

        // 5. Add Ticket ID Header to ALL pages (Cover + Template pages)
        const pages = pdfDoc.getPages()
        for (const p of pages) {
            const { height } = p.getSize()
            p.drawText(`Ticket ID: ${data.ticketUid}`, {
                x: 20,
                y: height - 20,
                size: 10,
                font: font,
                color: rgb(0.5, 0.5, 0.5), // Gray color
            })
        }

        // 6. Save and Trigger Download
        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `Requisition_Report_${data.ticketUid}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

    } catch (err) {
        console.error("Error generating PDF:", err)
        throw new Error("Failed to generate PDF document")
    }
};
