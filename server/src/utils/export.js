const PDFDocument = require('pdfkit');
const stream = require('stream');

function rowsToCsv(rows, columns, options = {}) {
  // Rename user_name column to 'Done By' in header
  const header = columns.map(c => {
    if (c === 'user_name') return 'Done By';
    if (c === 'receipt_url') return 'Attachment';
    return c;
  }).join(',') + '\n';
  const lines = rows.map(r => columns.map(c => {
    let v = r[c];
    if (v === null || v === undefined) return '';
    // Format dates to YYYY-MM-DD HH:MM format
    if (c === 'date' && v) {
      const d = new Date(v);
      v = d.toISOString().slice(0, 16).replace('T', ' ');
    }
    // For CSV exports, make the receipt_url a HYPERLINK formula so Excel shows a clickable 'Link'
    if (c === 'receipt_url' && v) {
      const href = String(v).replace(/"/g, '""');
      // Excel formula: =HYPERLINK("url","Link")
      v = `=HYPERLINK("${href}","Link")`;
    }
    if (typeof v === 'object') v = JSON.stringify(v);
    // Escape quotes and commas
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  }).join(',')).join('\n');
  // If a title was provided, include it as the first CSV line
  const titleLine = options.title ? `${String(options.title)}\n` : '';
  return titleLine + header + lines;
}

function csvBuffer(rows, columns) {
  // For backwards compatibility, allow passing an options object as third arg
  let opts = {};
  if (arguments.length >= 3 && typeof arguments[2] === 'object') opts = arguments[2] || {};
  const csv = rowsToCsv(rows, columns, opts);
  return Buffer.from(csv, 'utf8');
}

function excelBuffer(rows, columns, summary, options = {}) {
  // Build a simple HTML table that Excel will open. Center-align all columns and
  // include a footer summary block so values like Cash In/Out/Balance are visible.
  const headerMap = {
    id: 'ID',
    date_display: 'Date',
    amount: 'Amount',
    description: 'Description',
    category: 'Category',
    type: 'Type',
    user_name: 'Done By',
    receipt_url: 'Attachment',
    running_balance: 'Balance'
  };

  const headCells = columns.map(c => `<th style="text-align:center;padding:6px;border:1px solid #ddd;background:#f5f7fb">${headerMap[c]||c}</th>`).join('');

  const bodyRows = rows.map(r => {
      const cells = columns.map(c => {
      let v = r[c];
      if (v === null || v === undefined) v = '';
      // Format numbers like Indian style for amount/balance
      if ((c === 'amount' || c === 'running_balance') && v !== '') {
        const n = Number(v);
        if (Number.isFinite(n)) v = n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      // For receipt_url show a clickable link in the HTML/Excel output
      if (c === 'receipt_url' && v) {
        const href = String(v).replace(/"/g, '%22');
        v = `<a href="${href}">Link</a>`;
      }
      // date_display already provided
      // For the 'description' column reduce font-size and allow wrapping so more words fit on export
      if (c === 'description') {
        // smaller font, left-align and allow wrapping; escape HTML
        const safe = String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return `<td style="text-align:left;padding:6px;border:1px solid #ddd;font-size:11px;white-space:normal;word-break:break-word;vertical-align:top;">${safe}</td>`;
      }
      // allow other cells to wrap and grow in height; align top so row height expands to fit description
      return `<td style="text-align:center;padding:6px;border:1px solid #ddd;vertical-align:top;white-space:normal;word-break:break-word">${String(v)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('\n');

  // Footer: include summary values if provided
  let footerHtml = '';
  if (summary && (summary.totalIn !== undefined || summary.totalOut !== undefined)) {
    const totIn = summary.totalIn || 0;
    const totOut = summary.totalOut || 0;
    const bal = (totIn - totOut) || 0;
    footerHtml = `
      <tr><td colspan="${columns.length}" style="height:10px;border:none"></td></tr>
      <tr>
        <td colspan="${columns.length}" style="border:1px solid #ddd;padding:6px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="text-align:center;padding:6px;border:1px solid #ddd;background:#eef2ff;">Cash In<br/><strong>${Number(totIn).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
              <td style="text-align:center;padding:6px;border:1px solid #ddd;background:#fee2e2;">Cash Out<br/><strong>${Number(totOut).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
              <td style="text-align:center;padding:6px;border:1px solid #ddd;background:#f0fdf4;">Balance<br/><strong>${Number(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  const titleHtml = options.title ? `<h2 style="text-align:center;font-family:Arial,Helvetica,sans-serif;margin-bottom:10px">${String(options.title)}</h2>` : '';

  // Build head cells again but allow description column to have increased width
  const headCellsWithWidth = columns.map(c => {
    if (c === 'description') {
      return `<th style="text-align:left;padding:6px;border:1px solid #ddd;background:#f5f7fb;width:620px">${headerMap[c]||c}</th>`;
    }
    return `<th style="text-align:center;padding:6px;border:1px solid #ddd;background:#f5f7fb">${headerMap[c]||c}</th>`;
  }).join('');

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${options.title ? String(options.title) : 'Report'}</title>
  </head>
  <body>
    ${titleHtml}
    <table style="border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif;table-layout:fixed;"> 
      <thead>
        <tr>${headCellsWithWidth}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
      <tfoot>
        ${footerHtml}
      </tfoot>
    </table>
  </body>
  </html>`;

  return Buffer.from(html, 'utf8');
}

function pdfBuffer(title, rows, columns) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    const passthrough = new stream.PassThrough();
    const chunks = [];
    passthrough.on('data', (chunk) => chunks.push(chunk));
    passthrough.on('end', () => resolve(Buffer.concat(chunks)));
    passthrough.on('error', reject);

    doc.pipe(passthrough);

    // Page & layout constants
    const marginLeft = 40;
    const marginRight = 40;
    const usableWidth = doc.page.width - marginLeft - marginRight;
    const bottomLimit = doc.page.height - 60; // leave space for footer/summary

    // Title (kept simple)
    doc.fontSize(16).text(title || 'Report', { align: 'center' });
    doc.moveDown(0.8);

    const pdfColumns = columns;
    const headerMap = {
      id: 'ID',
      date_display: 'Date',
      amount: 'Amount',
      description: 'Description',
      category: 'Category',
      type: 'Type',
      user_name: 'Done By',
      running_balance: 'Balance',
      receipt_url: 'Attachment'
    };
    const displayColumns = pdfColumns.map(c => headerMap[c] || String(c));

    // Default target widths (px) - same as original defaults
    const defaultWidths = {
      id: 40,
      date_display: 70,
      amount: 80,
      description: 200,
      type: 70,
      user_name: 100,
      running_balance: 70,
      'Done By': 100,
      receipt_url: 60
    };

    // Build initial widths array
    let colWidths = pdfColumns.map(c => defaultWidths[c] || 80);
    let totalWidth = colWidths.reduce((s, v) => s + v, 0);

    // If total > usableWidth, scale down proportionally but don't go below minWidth
    const minWidth = 40;
    if (totalWidth > usableWidth) {
      // proportional scaling
      const scale = usableWidth / totalWidth;
      colWidths = colWidths.map(w => Math.max(minWidth, Math.floor(w * scale)));
      totalWidth = colWidths.reduce((s, v) => s + v, 0);

      // if still slightly off (due to minWidth floors) distribute remaining pixels
      let rem = usableWidth - totalWidth;
      let i = 0;
      while (rem > 0 && colWidths.length > 0) {
        colWidths[i % colWidths.length] += 1;
        rem -= 1;
        i += 1;
      }
    } else {
      // If there's extra space, distribute it so table fits exactly
      let rem = usableWidth - totalWidth;
      let i = 0;
      while (rem > 0 && colWidths.length > 0) {
        colWidths[i % colWidths.length] += 1;
        rem -= 1;
        i += 1;
      }
      totalWidth = colWidths.reduce((s, v) => s + v, 0);
    }

    // Determine font sizes by scale factor (larger tables -> smaller font; clamp to readable sizes)
    const baseHeaderFont = 9;
    const baseRowFont = 8;
    const scaleFactor = Math.min(1, usableWidth / (pdfColumns.length * 60)); // heuristic: 60px per col
    const headerFontSize = Math.max(7, Math.min(11, Math.round(baseHeaderFont * (scaleFactor + 0.5)))); // ensure readable
    const rowFontSize = Math.max(6, Math.min(10, Math.round(baseRowFont * (scaleFactor + 0.5))));
    // Row height derived from row font size
    const rowHeight = Math.max(14, Math.round(rowFontSize * 2.4));
    const headerHeight = Math.max(20, Math.round(headerFontSize * 2.4));

    // number formatter for Indian style
    const fmtIN = (n) => {
      if (n === null || n === undefined || n === '') return '';
      const num = Number(n);
      if (!Number.isFinite(num)) return String(n);
      return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    let totalIn = 0, totalOut = 0;
    let rowIndex = 0;
    let finalTableBottom = null;

    // helper to draw header for the current page and set tableTop
    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(headerFontSize);
      const y = doc.y;
      // header background
      doc.save();
      doc.rect(marginLeft - 4, y, usableWidth + 8, headerHeight).fill('#f1f5f9');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(headerFontSize);
      let x = marginLeft;
      for (let i = 0; i < pdfColumns.length; i++) {
        const title = displayColumns[i];
        // center-align header text
        doc.fillColor('#111827').text(title, x + 4, y + (headerHeight - headerFontSize) / 2 - 1, { width: colWidths[i] - 8, align: 'center' });
        x += colWidths[i];
      }
      // bottom border
      doc.lineWidth(0.8);
      doc.strokeColor('#d1d5db');
      doc.moveTo(marginLeft - 4, y + headerHeight).lineTo(marginLeft - 4 + usableWidth + 8, y + headerHeight).stroke();
      doc.restore();
      // move cursor below header
      doc.y = y + headerHeight + 4;
      return y;
    };

    // Render loop: draw pages until all rows rendered
    while (rowIndex < rows.length) {
      const tableTop = drawHeader();

      // compute how many rows fit this page
      const availableHeight = bottomLimit - doc.y;
      const slotHeight = rowHeight + 2; // a small gap
      const rowsPerPage = Math.max(1, Math.floor(availableHeight / slotHeight));

      const start = rowIndex;
      const end = Math.min(rowIndex + rowsPerPage, rows.length);

      // compute x positions
      const xPositions = [marginLeft];
      for (let i = 0; i < colWidths.length; i++) xPositions.push(xPositions[i] + colWidths[i]);

      // draw vertical grid lines
      doc.save();
      doc.lineWidth(0.6);
      doc.strokeColor('#e5e7eb');
      const gridBottom = Math.min(doc.page.height - 60, doc.y + (end - start) * slotHeight);
      for (let xi = 0; xi < xPositions.length; xi++) {
        const xpos = xPositions[xi];
        doc.moveTo(xpos - 2, tableTop).lineTo(xpos - 2, gridBottom).stroke();
      }
      doc.restore();

      // draw rows
      let currentY = doc.y;
      doc.font('Helvetica').fontSize(rowFontSize).fillColor('#000');
      for (let idx = start; idx < end; idx++) {
        const row = rows[idx];
        for (let i = 0; i < pdfColumns.length; i++) {
          const col = pdfColumns[i];
          let v = row[col];
          if (v === null || v === undefined) v = '';
          if ((col === 'date' || col === 'date_display') && v) {
            const d = new Date(v);
            if (!Number.isNaN(d.getTime())) v = d.toISOString().slice(0, 16).replace('T', ' ');
          }
          if (col === 'amount') {
            if (v !== null && v !== undefined && v !== '') {
              if (row['type'] === 'CASH_IN') totalIn += Number(row['amount']) || 0;
              if (row['type'] === 'CASH_OUT') totalOut += Number(row['amount']) || 0;
            }
            v = fmtIN(v);
          }
          if (col === 'running_balance') {
            v = (v === null || v === undefined || v === '') ? '' : fmtIN(v);
          }
          if (typeof v === 'object') v = JSON.stringify(v);
          const cellX = xPositions[i];
          // For receipt_url, show a short 'Link' label and add a clickable area
          if (col === 'receipt_url') {
            const url = v ? String(v) : '';
            const display = url ? 'Link' : '';
            doc.text(display, cellX + 4, currentY + 2, { width: colWidths[i] - 8, align: 'center', lineBreak: false });
            if (url) {
              try { doc.link(cellX + 4, currentY + 2, colWidths[i] - 8, rowHeight, url); } catch (e) { /* ignore */ }
            }
          } else {
            const text = String(v).substring(0, 200); // safe substring
            // center-align; no wrapping (keeps rowHeight predictable)
            doc.text(text, cellX + 4, currentY + 2, { width: colWidths[i] - 8, align: 'center', lineBreak: false });
          }
        }

        // horizontal separator
        doc.save();
        doc.lineWidth(0.5);
        doc.strokeColor('#f3f4f6');
        doc.moveTo(marginLeft - 4, currentY + rowHeight).lineTo(marginLeft - 4 + usableWidth + 8, currentY + rowHeight).stroke();
        doc.restore();

        currentY += slotHeight;
        rowIndex += 1;
      }

      // draw page table border
      const tableBottom = Math.min(doc.page.height - 60, currentY);
      finalTableBottom = tableBottom;
      doc.save();
      doc.lineWidth(0.9);
      doc.strokeColor('#5d5b5b');
      doc.rect(marginLeft - 4, tableTop, usableWidth + 8, Math.max(10, tableBottom - tableTop)).stroke();
      doc.restore();

      // add another page if rows remain
      if (rowIndex < rows.length) {
        doc.addPage({ margin: 20, size: 'A4', layout: 'landscape' });
        // reset any fonts for the new page
        doc.font('Helvetica').fontSize(rowFontSize);
      } else {
        doc.y = tableBottom + 8;
      }
    }

    // Footer summary cards (same layout as original)
    doc.moveDown(0.6);
    const balance = totalIn - totalOut;
    const gap = 12;
    const cardHeight = 36;
    const cardWidth = Math.floor((usableWidth - 2 * gap) / 3);
    const startX = marginLeft;
    const startY = doc.y;

    // Cash In
    doc.save();
    doc.roundedRect(startX, startY, cardWidth, cardHeight, 6).fillAndStroke('#eef2ff', '#b4c6fc');
    doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(10).text('Cash In', startX + 8, startY + 6);
    doc.font('Helvetica').fontSize(12).text(totalIn.toLocaleString('en-IN', { minimumFractionDigits: 2 }), startX + 8, startY + 18);
    doc.restore();

    // Cash Out
    doc.save();
    doc.roundedRect(startX + cardWidth + gap, startY, cardWidth, cardHeight, 6).fillAndStroke('#fee2e2', '#fca5a5');
    doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(10).text('Cash Out', startX + cardWidth + gap + 8, startY + 6);
    doc.font('Helvetica').fontSize(12).text(totalOut.toLocaleString('en-IN', { minimumFractionDigits: 2 }), startX + cardWidth + gap + 8, startY + 18);
    doc.restore();

    // Balance
    doc.save();
    doc.roundedRect(startX + 2 * (cardWidth + gap), startY, cardWidth, cardHeight, 6).fillAndStroke('#f0fdf4', '#6ee7b7');
    doc.fillColor('#166534').font('Helvetica-Bold').fontSize(10).text('Balance', startX + 2 * (cardWidth + gap) + 8, startY + 6);
    doc.font('Helvetica').fontSize(12).text(balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }), startX + 2 * (cardWidth + gap) + 8, startY + 18);
    doc.restore();

    doc.moveDown(1.2);

    // Generated date
    doc.font('Helvetica').fontSize(7).fillColor('#000');
    const genDate = new Date().toISOString().slice(0, 16).replace('T', ' ');
    doc.text('Generated on: ' + genDate, startX, doc.y, { width: usableWidth, align: 'left' });

    doc.end();
  });
}


module.exports = { csvBuffer, pdfBuffer, excelBuffer };
