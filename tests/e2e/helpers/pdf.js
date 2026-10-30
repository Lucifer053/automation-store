const { stripWs } = require('./format')

let pdfjsPromise
const pdfjs = () => (pdfjsPromise ||= import('pdfjs-dist/legacy/build/pdf.mjs'))

// Parse a PDF buffer -> { text, norm, lines, pages:[{text,width,height,items}], numpages }
async function readPdf(buffer) {
  const lib = await pdfjs()
  const doc = await lib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false, verbosity: 0 }).promise
  const pages = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const [x0, y0, x1, y1] = page.view
    const tc = await page.getTextContent()
    const strs = tc.items.filter((it) => typeof it.str === 'string')
    let text = ''
    let lastY
    for (const it of strs) {
      const y = it.transform[5]
      text += lastY === undefined || Math.abs(lastY - y) < 1 ? it.str : '\n' + it.str
      lastY = y
    }
    pages.push({
      text, width: x1 - x0, height: y1 - y0,
      items: strs.map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })),
    })
  }
  const text = pages.map((p) => p.text).join('\n')
  return { text, norm: stripWs(text), lines: text.split('\n'), pages, numpages: doc.numPages }
}

// spec §4.3: A4 portrait, nothing outside the page
function overflowProblems(pdf, margin = 10) {
  const bad = []
  pdf.pages.forEach((p, i) => {
    if (Math.abs(p.width - 595.28) > 1.5 || Math.abs(p.height - 841.89) > 1.5) {
      bad.push(`page ${i + 1} is ${p.width.toFixed(1)}x${p.height.toFixed(1)}, expected A4 portrait 595x842`)
    }
    for (const it of p.items) {
      if (!it.str.trim()) continue
      if (it.x < 0 || it.x + it.w > p.width - margin + 0.5) bad.push(`page ${i + 1}: "${it.str.slice(0, 30)}" x=${it.x.toFixed(1)} w=${it.w.toFixed(1)}`)
    }
  })
  return bad
}

// a text line containing `needle` (whitespace-insensitive) plus the following line
function lineWith(pdf, needle) {
  const n = stripWs(needle)
  const i = pdf.lines.findIndex((l) => stripWs(l).includes(n))
  if (i < 0) return null
  return pdf.lines[i] + ' ' + (pdf.lines[i + 1] || '')
}

module.exports = { readPdf, overflowProblems, lineWith }
