const PDFDocument = require('pdfkit');
const stream = require('stream');
const ExcelJS = require('exceljs');

function formatReportDate(value) {
  if (!value) return '';
  const parts = String(value).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
}

function formatReportRange(dateRange = {}) {
  const start = formatReportDate(dateRange.startDate);
  const end = formatReportDate(dateRange.endDate);
  if (start && end) return `${start} to ${end}`;
  if (start) return `From ${start} onward`;
  if (end) return `Through ${end}`;
  return 'All dates';
}

function formatGeneratedAt(value = new Date()) {
  return `${new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  }).format(value)} IST`;
}

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

async function excelBuffer(rows, columns, summary, options = {}) {
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'My Pern App';
  const worksheet = workbook.addWorksheet('Transactions', {
    views: [{ state: 'frozen', ySplit: 5 }]
  });
  worksheet.columns = columns.map(key => ({
    header: headerMap[key] || key,
    key,
    width: key === 'description' ? 64 : key === 'receipt_url' ? 20 : 18,
    style: { alignment: { vertical: 'top', wrapText: key === 'description' } }
  }));

  worksheet.insertRows(1, Array.from({ length: 4 }, () => columns.map(() => '')));
  worksheet.getRow(1).height = 22;
  worksheet.getRow(2).height = 22;
  worksheet.getRow(3).height = 22;
  worksheet.getRow(4).height = 22;
  const brandLastColumn = Math.min(2, columns.length);
  worksheet.mergeCells(1, 1, 4, brandLastColumn);
  worksheet.getCell(1, 1).value = 'BHARATHI CONSTRUCTION';
  worksheet.getCell(1, 1).font = { name: 'Georgia', bold: true, italic: true, size: 14, color: { argb: 'FFC18B22' } };
  worksheet.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  if (columns.length > 2) {
    worksheet.mergeCells(1, 3, 4, columns.length);
    worksheet.getCell(1, 3).value = options.title || 'Transactions Report';
    worksheet.getCell(1, 3).font = { bold: true, size: 16 };
    worksheet.getCell(1, 3).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const headerRow = worksheet.getRow(5);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;
  worksheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: columns.length }
  };

  rows.forEach(row => {
    const values = {};
    columns.forEach(key => {
      const value = row[key];
      if ((key === 'amount' || key === 'running_balance') && value != null && value !== '') {
        values[key] = Number(value);
      } else if (key === 'receipt_url' && value) {
        values[key] = { text: 'Link', hyperlink: String(value) };
      } else {
        values[key] = value == null ? '' : value;
      }
    });
    const worksheetRow = worksheet.addRow(values);
    ['amount', 'running_balance'].forEach(key => {
      if (columns.includes(key)) worksheetRow.getCell(columns.indexOf(key) + 1).numFmt = '#,##0.00';
    });
  });

  if (summary && (summary.totalIn !== undefined || summary.totalOut !== undefined)) {
    worksheet.addRow([]);
    worksheet.addRow(['Selected Range Summary']);
    worksheet.addRow(['Cash In', Number(summary.totalIn || 0)]);
    worksheet.addRow(['Cash Out', Number(summary.totalOut || 0)]);
    worksheet.addRow(['Net Balance', Number(summary.totalIn || 0) - Number(summary.totalOut || 0)]);
    worksheet.addRow([]);
    worksheet.addRow(['GRAND TOTAL - ENTIRE BOOK']);
    worksheet.addRow(['Cash In', Number(summary.bookTotalIn ?? summary.totalIn ?? 0)]);
    worksheet.addRow(['Cash Out', Number(summary.bookTotalOut ?? summary.totalOut ?? 0)]);
    worksheet.addRow([
      'Net Balance',
      Number(summary.bookTotalIn ?? summary.totalIn ?? 0) - Number(summary.bookTotalOut ?? summary.totalOut ?? 0)
    ]);
    const summaryTitleRows = [worksheet.rowCount - 8, worksheet.rowCount - 3];
    summaryTitleRows.forEach(rowNo => {
      worksheet.getRow(rowNo).getCell(1).font = { bold: true, size: 12 };
    });
    const summaryValueRows = [
      worksheet.rowCount - 7, worksheet.rowCount - 6, worksheet.rowCount - 5,
      worksheet.rowCount - 2, worksheet.rowCount - 1, worksheet.rowCount
    ];
    summaryValueRows.forEach(rowNo => {
      worksheet.getRow(rowNo).getCell(1).font = { bold: true };
      worksheet.getRow(rowNo).getCell(2).numFmt = '#,##0.00';
    });
  }

  worksheet.addRow([]);
  const rangeRow = worksheet.addRow(['Selected Date Range', formatReportRange(options.dateRange)]);
  const generatedRow = worksheet.addRow(['Report Overview Generated', formatGeneratedAt(options.generatedAt)]);
  [rangeRow, generatedRow].forEach(row => {
    row.getCell(1).font = { bold: true, color: { argb: 'FF1E3A8A' } };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    row.getCell(2).font = { bold: true };
  });

  return workbook.xlsx.writeBuffer();
}

function pdfBuffer(title, rows, columns, overallTotals = {}, metadata = {}) {
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

    // Use a decorative text wordmark only in the generated report header.
    const reportHeaderTop = 30;
    doc.font('Times-BoldItalic').fontSize(12).fillColor('#b8860b').text(
      'BHARATHI CONSTRUCTION',
      marginLeft,
      reportHeaderTop + 8,
      { width: 180, align: 'left', lineBreak: false }
    );
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000').text(
      title || 'Report',
      marginLeft,
      reportHeaderTop + 8,
      { width: usableWidth, align: 'center' }
    );
    doc.y = reportHeaderTop + 44;

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
    // Base row height is expanded for wrapped descriptions.
    const rowHeight = Math.max(14, Math.round(rowFontSize * 2.4));
    const headerHeight = Math.max(20, Math.round(headerFontSize * 2.4));
    const descriptionIndex = pdfColumns.indexOf('description');
    doc.font('Helvetica').fontSize(rowFontSize);

    // number formatter for Indian style
    const fmtIN = (n) => {
      if (n === null || n === undefined || n === '') return '';
      const num = Number(n);
      if (!Number.isFinite(num)) return String(n);
      return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const descriptionWidth = descriptionIndex < 0 ? 0 : Math.max(1, colWidths[descriptionIndex] - 8);
    const measureDescription = text => doc.heightOfString(String(text || ''), {
      width: descriptionWidth,
      align: 'left',
      lineGap: 1
    });
    const maxDescriptionHeight = bottomLimit - 20 - headerHeight - 20;
    const splitDescription = text => {
      const chunks = [];
      let chunk = '';
      const maxChars = Math.max(1, Math.floor(
        (descriptionWidth / (rowFontSize * 0.55)) * (maxDescriptionHeight / (rowFontSize * 1.25))
      ));
      const splitLongPart = part => {
        const parts = [];
        let offset = 0;
        while (offset < part.length) {
          let low = 1;
          let high = Math.min(maxChars, part.length - offset);
          let best = 1;
          while (low <= high) {
            const middle = Math.floor((low + high) / 2);
            if (measureDescription(part.slice(offset, offset + middle)) <= maxDescriptionHeight) {
              best = middle;
              low = middle + 1;
            } else {
              high = middle - 1;
            }
          }
          parts.push(part.slice(offset, offset + best));
          offset += best;
        }
        return parts;
      };
      String(text).split(/(\s+)/).filter(Boolean).forEach(part => {
        if (measureDescription(part) > maxDescriptionHeight) {
          if (chunk) chunks.push(chunk.trimEnd());
          chunk = '';
          const parts = splitLongPart(part);
          chunks.push(...parts.slice(0, -1));
          chunk = parts[parts.length - 1] || '';
          return;
        }
        const candidate = chunk + part;
        if (chunk && measureDescription(candidate) > maxDescriptionHeight) {
          chunks.push(chunk.trimEnd());
          chunk = part.trimStart();
        } else {
          chunk = candidate;
        }
      });
      if (chunk) chunks.push(chunk.trim());
      return chunks.length ? chunks : [''];
    };
    // Extremely long descriptions continue on a new page instead of running
    // into the footer or beyond the page boundary.
    const renderRows = descriptionIndex < 0 ? rows : rows.flatMap(row => {
      const description = String(row.description || '');
      if (measureDescription(description) <= maxDescriptionHeight) return [row];
      return splitDescription(description).map((part, index) => ({
        ...row,
        description: part,
        _continued: index > 0
      }));
    });

    const getRowHeight = row => {
      if (descriptionIndex < 0 || !row.description) return rowHeight;
      const descriptionHeight = measureDescription(row.description);
      return Math.max(rowHeight, Math.ceil(descriptionHeight + 6));
    };
    const rowHeights = renderRows.map(getRowHeight);

    let totalIn = 0, totalOut = 0;
    let rowIndex = 0;
    let finalTableBottom = null;
    let isFirstTablePage = true;

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
    while (rowIndex < renderRows.length) {
      const tableTop = drawHeader();

      // Select as many complete, dynamically sized rows as fit on this page.
      const availableHeight = bottomLimit - doc.y;
      const start = rowIndex;
      let pageHeight = 0;
      while (rowIndex < renderRows.length) {
        const nextHeight = rowHeights[rowIndex] + 2;
        if (pageHeight > 0 && pageHeight + nextHeight > availableHeight) break;
        pageHeight += nextHeight;
        rowIndex += 1;
      }
      // Always make progress if an unusually tall row cannot fit in the
      // remaining space. It will be placed on a fresh page on the next loop.
      if (rowIndex === start) {
        if (isFirstTablePage) {
          doc.addPage({ margin: 20, size: 'A4', layout: 'landscape' });
          doc.font('Helvetica').fontSize(rowFontSize);
          isFirstTablePage = false;
          continue;
        }
        pageHeight = Math.min(rowHeights[rowIndex] + 2, availableHeight);
        rowIndex += 1;
      }
      const end = rowIndex;
      const pageRowHeights = rowHeights.slice(start, end);

      // compute x positions
      const xPositions = [marginLeft];
      for (let i = 0; i < colWidths.length; i++) xPositions.push(xPositions[i] + colWidths[i]);

      // draw vertical grid lines
      doc.save();
      doc.lineWidth(0.6);
      doc.strokeColor('#e5e7eb');
      const gridBottom = Math.min(bottomLimit, doc.y + pageHeight);
      for (let xi = 0; xi < xPositions.length; xi++) {
        const xpos = xPositions[xi];
        doc.moveTo(xpos - 2, tableTop).lineTo(xpos - 2, gridBottom).stroke();
      }
      doc.restore();

      // draw rows
      let currentY = doc.y;
      doc.font('Helvetica').fontSize(rowFontSize).fillColor('#000');
      for (let idx = start; idx < end; idx++) {
        const row = renderRows[idx];
        const currentRowHeight = pageRowHeights[idx - start];
        for (let i = 0; i < pdfColumns.length; i++) {
          const col = pdfColumns[i];
          let v = row._continued && col !== 'description' ? '' : row[col];
          if (v === null || v === undefined) v = '';
          if ((col === 'date' || col === 'date_display') && v) {
            const d = new Date(v);
            if (!Number.isNaN(d.getTime())) v = d.toISOString().slice(0, 16).replace('T', ' ');
          }
          if (col === 'amount') {
            if (v !== null && v !== undefined && v !== '') {
              if (!row._continued && row['type'] === 'CASH_IN') totalIn += Number(row['amount']) || 0;
              if (!row._continued && row['type'] === 'CASH_OUT') totalOut += Number(row['amount']) || 0;
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
              try { doc.link(cellX + 4, currentY + 2, colWidths[i] - 8, currentRowHeight, url); } catch (e) { /* ignore */ }
            }
          } else if (col === 'description') {
            doc.text(String(v), cellX + 4, currentY + 3, {
              width: colWidths[i] - 8,
              align: 'left',
              lineGap: 1
            });
          } else {
            const text = String(v).substring(0, 200);
            doc.text(text, cellX + 4, currentY + Math.max(2, (currentRowHeight - rowFontSize) / 2), {
              width: colWidths[i] - 8,
              align: 'center',
              lineBreak: false
            });
          }
        }

        // horizontal separator
        doc.save();
        doc.lineWidth(0.5);
        doc.strokeColor('#f3f4f6');
        doc.moveTo(marginLeft - 4, currentY + currentRowHeight).lineTo(marginLeft - 4 + usableWidth + 8, currentY + currentRowHeight).stroke();
        doc.restore();

        currentY += currentRowHeight + 2;
      }

      // draw page table border
      const tableBottom = Math.min(doc.page.height - 60, currentY);
      finalTableBottom = tableBottom;
      doc.save();
      doc.lineWidth(0.9);
      doc.strokeColor('#5d5b5b');
      doc.rect(marginLeft - 4, tableTop, usableWidth + 8, Math.max(10, tableBottom - tableTop)).stroke();
      doc.restore();
      isFirstTablePage = false;

      // add another page if rows remain
      if (rowIndex < renderRows.length) {
        doc.addPage({ margin: 20, size: 'A4', layout: 'landscape' });
        // reset any fonts for the new page
        doc.font('Helvetica').fontSize(rowFontSize);
      } else {
        doc.y = tableBottom + 8;
      }
    }

    // Keep selected-range totals and whole-book grand totals distinct.
    const gap = 12;
    const cardHeight = 34;
    const cardWidth = Math.floor((usableWidth - 2 * gap) / 3);
    const startX = marginLeft;
    const drawSummaryGroup = (label, cashIn, cashOut, y) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827').text(label, startX, y, { width: usableWidth });
      const cardY = y + 14;
      const values = [
        { label: 'Cash In', value: cashIn, fill: '#eef2ff', stroke: '#b4c6fc', color: '#1e3a8a' },
        { label: 'Cash Out', value: cashOut, fill: '#fee2e2', stroke: '#fca5a5', color: '#b91c1c' },
        { label: 'Net Balance', value: cashIn - cashOut, fill: '#f0fdf4', stroke: '#6ee7b7', color: '#166534' }
      ];
      values.forEach((item, index) => {
        const x = startX + index * (cardWidth + gap);
        doc.save();
        doc.roundedRect(x, cardY, cardWidth, cardHeight, 6).fillAndStroke(item.fill, item.stroke);
        doc.fillColor(item.color).font('Helvetica-Bold').fontSize(9).text(item.label, x + 8, cardY + 5);
        doc.font('Helvetica').fontSize(11).text(item.value.toLocaleString('en-IN', { minimumFractionDigits: 2 }), x + 8, cardY + 17);
        doc.restore();
      });
      return cardY + cardHeight;
    };

    doc.moveDown(0.6);
    const summaryHeight = 150;
    if (doc.y + summaryHeight > bottomLimit) doc.addPage({ margin: 20, size: 'A4', layout: 'landscape' });
    let summaryY = doc.y;
    summaryY = drawSummaryGroup('Selected Range Totals', totalIn, totalOut, summaryY);
    summaryY += 7;
    summaryY = drawSummaryGroup(
      'GRAND TOTAL - ENTIRE BOOK',
      Number(overallTotals.bookTotalIn ?? totalIn),
      Number(overallTotals.bookTotalOut ?? totalOut),
      summaryY
    );
    doc.y = summaryY + 8;

    // Generated date
    doc.font('Helvetica').fontSize(7).fillColor('#000');
    const footerText = `Selected range: ${formatReportRange(metadata.dateRange)}  |  Overview generated: ${formatGeneratedAt(metadata.generatedAt)}`;
    doc.text(footerText, startX, doc.y, { width: usableWidth, align: 'left' });

    doc.end();
  });
}


module.exports = { csvBuffer, pdfBuffer, excelBuffer };
