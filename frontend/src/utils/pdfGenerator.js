/**
 * Client-side Hebrew RTL PDF Generator
 * Renders the exact official attendance report template onto high-resolution A4 canvas pages
 * using native browser Hebrew font shaping (direction: rtl) and packages them into a valid
 * multi-page A4 PDF file for immediate download — zero gibberish, zero external dependencies.
 */

const A4_PT_WIDTH = 595.28;
const A4_PT_HEIGHT = 841.89;
const CANVAS_WIDTH = 1488;  // 2.5x scale for crisp print-quality text
const CANVAS_HEIGHT = 2105;

function drawRoundedRect(ctx, x, y, w, h, r, fillColor, strokeColor = null, lineWidth = 1.5) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Packages an array of HTMLCanvasElements into a valid multi-page A4 PDF Blob.
 */
function canvasesToPdfBlob(canvases) {
  const encoder = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const offsets = [];

  const pushStr = (str) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    offset += bytes.length;
  };

  const pushBytes = (bytes) => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  const startObj = (id) => {
    offsets[id] = offset;
    pushStr(`${id} 0 obj\n`);
  };

  const endObj = () => {
    pushStr(`\nendobj\n`);
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  const numPages = canvases.length;
  // Object IDs:
  // 1: Catalog
  // 2: Pages
  // For each page i (0..numPages-1):
  //   pageObjId = 3 + i * 3
  //   contentObjId = 4 + i * 3
  //   imgObjId = 5 + i * 3
  const pageObjIds = [];

  for (let i = 0; i < numPages; i++) {
    const pageObjId = 3 + i * 3;
    const contentObjId = 4 + i * 3;
    const imgObjId = 5 + i * 3;
    pageObjIds.push(pageObjId);

    const canvas = canvases[i];
    const jpegBytes = dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.94));
    const imgName = `/Im${i}`;

    // Page object
    startObj(pageObjId);
    pushStr(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_PT_WIDTH.toFixed(2)} ${A4_PT_HEIGHT.toFixed(2)}] ` +
      `/Resources << /XObject << ${imgName} ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );
    endObj();

    // Content stream drawing the image full-page
    const contentStream = `q\n${A4_PT_WIDTH.toFixed(2)} 0 0 ${A4_PT_HEIGHT.toFixed(2)} 0 0 cm\n${imgName} Do\nQ\n`;
    const contentBytes = encoder.encode(contentStream);
    startObj(contentObjId);
    pushStr(`<< /Length ${contentBytes.length} >>\nstream\n`);
    pushBytes(contentBytes);
    pushStr(`\nendstream`);
    endObj();

    // Image XObject
    startObj(imgObjId);
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
    );
    pushBytes(jpegBytes);
    pushStr(`\nendstream`);
    endObj();
  }

  // Catalog (Obj 1)
  startObj(1);
  pushStr(`<< /Type /Catalog /Pages 2 0 R >>`);
  endObj();

  // Pages (Obj 2)
  startObj(2);
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  pushStr(`<< /Type /Pages /Kids [${kidsStr}] /Count ${numPages} >>`);
  endObj();

  const totalObjs = 2 + numPages * 3;
  const xrefOffset = offset;
  pushStr(`xref\n0 ${totalObjs + 1}\n`);
  pushStr(`0000000000 65535 f \n`);
  for (let id = 1; id <= totalObjs; id++) {
    const offStr = String(offsets[id] || 0).padStart(10, '0');
    pushStr(`${offStr} 00000 n \n`);
  }

  pushStr(
    `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return new Blob(chunks, { type: 'application/pdf' });
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Generates and downloads the Volunteer Attendance Report PDF matching the exact screen/print template.
 */
export function downloadVolunteerAttendancePdf(report, userFallback = {}, goalHours = 60) {
  const fontStack = "'Rubik', 'Heebo', 'Segoe UI', Arial, sans-serif";
  const records = report?.records || [];
  const userName = report?.user_name || userFallback?.name || 'מתנדב/ת';
  const userPhone = report?.user_phone || userFallback?.phone || '—';
  const periodLabel = report?.period_label || `שנת ${report?.year || new Date().getFullYear()}`;
  const totalHours = report?.total_hours ?? 0;
  const shiftCount = report?.shift_count ?? 0;
  const goalPct = goalHours > 0 ? Math.min(100, Math.round((totalHours / goalHours) * 100)) : 0;
  const todayStr = new Date().toLocaleDateString('he-IL');

  const marginX = 80;
  const contentWidth = CANVAS_WIDTH - marginX * 2;
  const rightEdge = CANVAS_WIDTH - marginX;
  const leftEdge = marginX;

  // Table columns (Right-to-Left order matching the screen template):
  // תאריך | יום | משמרת / שעות | כניסה בפועל | יציאה בפועל | שעות שבוצעו | סטטוס נוכחות | הערות
  const columns = [
    { label: 'תאריך', width: 155 },
    { label: 'יום', width: 105 },
    { label: 'משמרת / שעות', width: 235 },
    { label: 'כניסה בפועל', width: 130 },
    { label: 'יציאה בפועל', width: 130 },
    { label: 'שעות שבוצעו', width: 145 },
    { label: 'סטטוס נוכחות', width: 215 },
    { label: 'הערות', width: contentWidth - (155 + 105 + 235 + 130 + 130 + 145 + 215) },
  ];

  // Calculate X right-edge for each column in RTL
  let curRight = rightEdge;
  const colPositions = columns.map((col) => {
    const colRight = curRight;
    curRight -= col.width;
    return { ...col, right: colRight, left: curRight };
  });

  const rowsFirstPage = 16;
  const rowsNextPage = 23;

  const pagesRecords = [];
  if (records.length === 0) {
    pagesRecords.push([]);
  } else {
    pagesRecords.push(records.slice(0, rowsFirstPage));
    let idx = rowsFirstPage;
    while (idx < records.length) {
      pagesRecords.push(records.slice(idx, idx + rowsNextPage));
      idx += rowsNextPage;
    }
  }

  const canvases = pagesRecords.map((pageRows, pageIndex) => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';

    let y = 85;

    // Header Title
    ctx.fillStyle = '#1565c0';
    ctx.font = `bold 38px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText(`דוח נוכחות והתנדבות - סלון קהילתי`, CANVAS_WIDTH / 2, y);

    y += 48;
    ctx.fillStyle = '#616161';
    ctx.font = `24px ${fontStack}`;
    ctx.fillText(`תקופת הדוח: ${periodLabel}  |  תאריך הפקה: ${todayStr}`, CANVAS_WIDTH / 2, y);

    y += 32;
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftEdge, y);
    ctx.lineTo(rightEdge, y);
    ctx.stroke();

    y += 36;

    if (pageIndex === 0) {
      // Two Summary Boxes side by side (Right: Volunteer Info, Left: Hours & Goal)
      const gap = 32;
      const boxW = (contentWidth - gap) / 2;
      const boxH = 175;
      const rightBoxX = rightEdge - boxW;
      const leftBoxX = leftEdge;

      // Right Card: Volunteer Details (#f5f5f5)
      drawRoundedRect(ctx, rightBoxX, y, boxW, boxH, 16, '#f5f5f5', '#e0e0e0', 1.5);
      ctx.textAlign = 'right';
      const rPad = rightBoxX + boxW - 28;

      ctx.fillStyle = '#212121';
      ctx.font = `bold 24px ${fontStack}`;
      ctx.fillText(`שם המתנדב/ת:  ${userName}`, rPad, y + 44);

      ctx.font = `23px ${fontStack}`;
      ctx.fillText(`טלפון:  ${userPhone}`, rPad, y + 90);
      ctx.fillText(`תפקיד:  מתנדב / אחראי משמרת`, rPad, y + 136);

      // Left Card: Hours & Goal (#e8f5e9)
      drawRoundedRect(ctx, leftBoxX, y, boxW, boxH, 16, '#e8f5e9', '#c8e6c9', 2);
      const lPad = leftBoxX + boxW - 28;

      ctx.fillStyle = '#2e7d32';
      ctx.font = `bold 25px ${fontStack}`;
      ctx.fillText(`סה"כ שעות שבוצעו בפועל:  ${totalHours} שעות`, lPad, y + 44);

      ctx.fillStyle = '#1b5e20';
      ctx.font = `bold 23px ${fontStack}`;
      ctx.fillText(`סה"כ משמרות שהושלמו:  ${shiftCount} משמרות`, lPad, y + 90);

      ctx.fillStyle = '#212121';
      ctx.font = `23px ${fontStack}`;
      ctx.fillText(`יעד שעות שנתי:  ${goalHours} שעות (${goalPct}% עמידה ביעד)`, lPad, y + 136);

      y += boxH + 45;
    }

    // Section Title above table
    ctx.textAlign = 'right';
    ctx.fillStyle = '#212121';
    ctx.font = `bold 26px ${fontStack}`;
    ctx.fillText(
      `פירוט כל המשמרות והשעות שבוצעו (${periodLabel})${pagesRecords.length > 1 ? ` - עמוד ${pageIndex + 1} מתוך ${pagesRecords.length}` : ''}:`,
      rightEdge,
      y
    );

    y += 28;

    // Table Header
    const headerH = 68;
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(leftEdge, y, contentWidth, headerH);
    ctx.strokeStyle = '#d0d7de';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftEdge, y, contentWidth, headerH);

    ctx.fillStyle = '#1e293b';
    ctx.font = `bold 22px ${fontStack}`;
    colPositions.forEach((col) => {
      ctx.textAlign = 'right';
      ctx.fillText(col.label, col.right - 14, y + headerH / 2);
    });

    y += headerH;

    // Table Rows
    const rowH = 66;
    if (pageRows.length === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(leftEdge, y, contentWidth, rowH * 1.5);
      ctx.strokeStyle = '#e0e0e0';
      ctx.strokeRect(leftEdge, y, contentWidth, rowH * 1.5);
      ctx.fillStyle = '#757575';
      ctx.font = `23px ${fontStack}`;
      ctx.textAlign = 'center';
      ctx.fillText('אין רשומות נוכחות לתקופה שנבחרה', CANVAS_WIDTH / 2, y + (rowH * 1.5) / 2);
      y += rowH * 1.5;
    } else {
      pageRows.forEach((rec, rIdx) => {
        ctx.fillStyle = rIdx % 2 === 1 ? '#fafbfc' : '#ffffff';
        ctx.fillRect(leftEdge, y, contentWidth, rowH);

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftEdge, y + rowH);
        ctx.lineTo(rightEdge, y + rowH);
        ctx.stroke();

        const rowCenterY = y + rowH / 2;
        ctx.textAlign = 'right';

        // 0: תאריך
        ctx.fillStyle = '#212121';
        ctx.font = `21px ${fontStack}`;
        ctx.fillText(String(rec.date || ''), colPositions[0].right - 14, rowCenterY);

        // 1: יום
        ctx.fillText(String(rec.day_of_week || ''), colPositions[1].right - 14, rowCenterY);

        // 2: משמרת / שעות
        ctx.fillText(`${rec.slot || ''} (${rec.hours_range || ''})`, colPositions[2].right - 14, rowCenterY);

        // 3: כניסה בפועל
        ctx.fillText(rec.clock_in || '—', colPositions[3].right - 14, rowCenterY);

        // 4: יציאה בפועל
        ctx.fillText(rec.clock_out || '—', colPositions[4].right - 14, rowCenterY);

        // 5: שעות שבוצעו
        const hrs = rec.hours_logged > 0 ? `${rec.hours_logged} שעות` : '0 שעות';
        ctx.fillStyle = rec.hours_logged > 0 ? '#2e7d32' : '#757575';
        ctx.font = `bold 22px ${fontStack}`;
        ctx.fillText(hrs, colPositions[5].right - 14, rowCenterY);

        // 6: סטטוס נוכחות (Rounded pill badge like the screenshot)
        const statusStr = String(rec.status || '');
        const isCompleted = statusStr.includes('הושלמה');
        const isApproved = statusStr.includes('אושר');
        const badgeStroke = isCompleted ? '#2e7d32' : isApproved ? '#1976d2' : '#9e9e9e';
        const badgeFill = isCompleted ? '#f1f8e9' : isApproved ? '#f0f7ff' : '#f5f5f5';
        const badgeText = isCompleted ? '#1b5e20' : isApproved ? '#1565c0' : '#616161';

        const pillW = 165;
        const pillH = 38;
        const pillX = colPositions[6].right - 14 - pillW;
        const pillY = rowCenterY - pillH / 2;
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 19, badgeFill, badgeStroke, 1.5);
        ctx.fillStyle = badgeText;
        ctx.font = `bold 19px ${fontStack}`;
        ctx.textAlign = 'center';
        ctx.fillText(statusStr, pillX + pillW / 2, rowCenterY);

        // 7: הערות
        ctx.textAlign = 'right';
        ctx.fillStyle = '#424242';
        ctx.font = `20px ${fontStack}`;
        const notesStr = rec.notes ? String(rec.notes).slice(0, 22) : '—';
        ctx.fillText(notesStr, colPositions[7].right - 14, rowCenterY);

        y += rowH;
      });

      // Outer border around table body
      const tableBodyH = pageRows.length * rowH;
      ctx.strokeStyle = '#d0d7de';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(leftEdge, y - tableBodyH, contentWidth, tableBodyH);
    }

    // Signatures on last page
    if (pageIndex === pagesRecords.length - 1) {
      const sigY = Math.min(CANVAS_HEIGHT - 160, Math.max(y + 90, CANVAS_HEIGHT - 220));
      ctx.strokeStyle = '#bdbdbd';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftEdge, sigY - 40);
      ctx.lineTo(rightEdge, sigY - 40);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#424242';
      ctx.font = `22px ${fontStack}`;
      ctx.textAlign = 'center';

      // Right signature
      const rightSigCenterX = rightEdge - 220;
      ctx.fillText('חתימת המתנדב/ת:', rightSigCenterX, sigY);
      ctx.strokeStyle = '#212121';
      ctx.beginPath();
      ctx.moveTo(rightSigCenterX - 140, sigY + 55);
      ctx.lineTo(rightSigCenterX + 140, sigY + 55);
      ctx.stroke();

      // Left signature
      const leftSigCenterX = leftEdge + 220;
      ctx.fillText('חתימת ואישור מנהל/ת הסלון:', leftSigCenterX, sigY);
      ctx.beginPath();
      ctx.moveTo(leftSigCenterX - 140, sigY + 55);
      ctx.lineTo(leftSigCenterX + 140, sigY + 55);
      ctx.stroke();
    }

    // Footer credit on every page
    ctx.fillStyle = '#757575';
    ctx.font = `20px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText('נבנה ליוצאים לשינוי על ידי יצחק גרוס', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 45);

    return canvas;
  });

  const pdfBlob = canvasesToPdfBlob(canvases);
  const safeName = String(userName).replace(/\s+/g, '_');
  const filename = `דוח_נוכחות_${safeName}_${report?.year || new Date().getFullYear()}.pdf`;
  triggerBlobDownload(pdfBlob, filename);
}

/**
 * Generates and downloads the Admin Monthly Summary Report PDF in clean Hebrew RTL.
 */
export function downloadAdminMonthlyReportPdf({ month, year, stats = [], goalHours = 60, shiftsGaps = [] }) {
  const fontStack = "'Rubik', 'Heebo', 'Segoe UI', Arial, sans-serif";
  const todayStr = new Date().toLocaleDateString('he-IL');
  const marginX = 80;
  const contentWidth = CANVAS_WIDTH - marginX * 2;
  const rightEdge = CANVAS_WIDTH - marginX;
  const leftEdge = marginX;

  const totalHours = stats.reduce((acc, s) => acc + (s.total_hours || 0), 0);
  const totalShifts = stats.reduce((acc, s) => acc + (s.shift_count || 0), 0);

  const columns = [
    { label: 'שם המתנדב/ת', width: 360 },
    { label: 'משמרות החודש', width: 220 },
    { label: 'שעות שבוצעו', width: 220 },
    { label: 'יעד שעות', width: 180 },
    { label: 'עמידה ביעד', width: 180 },
    { label: 'סטטוס פעילות', width: contentWidth - (360 + 220 + 220 + 180 + 180) },
  ];

  let curRight = rightEdge;
  const colPositions = columns.map((col) => {
    const colRight = curRight;
    curRight -= col.width;
    return { ...col, right: colRight, left: curRight };
  });

  const rowsFirstPage = 18;
  const rowsNextPage = 24;
  const pagesStats = [];
  if (stats.length === 0) {
    pagesStats.push([]);
  } else {
    pagesStats.push(stats.slice(0, rowsFirstPage));
    let idx = rowsFirstPage;
    while (idx < stats.length) {
      pagesStats.push(stats.slice(idx, idx + rowsNextPage));
      idx += rowsNextPage;
    }
  }

  const canvases = pagesStats.map((pageRows, pageIndex) => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';

    let y = 85;
    ctx.fillStyle = '#1565c0';
    ctx.font = `bold 38px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText('דוח סיכום פעילות והתנדבות - סלון קהילתי', CANVAS_WIDTH / 2, y);

    y += 48;
    ctx.fillStyle = '#616161';
    ctx.font = `24px ${fontStack}`;
    ctx.fillText(`תקופת הדוח: ${month}/${year}  |  תאריך הפקה: ${todayStr}`, CANVAS_WIDTH / 2, y);

    y += 32;
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftEdge, y);
    ctx.lineTo(rightEdge, y);
    ctx.stroke();

    y += 36;

    if (pageIndex === 0) {
      const boxH = 125;
      drawRoundedRect(ctx, leftEdge, y, contentWidth, boxH, 16, '#f0f7ff', '#bbdefb', 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1565c0';
      ctx.font = `bold 24px ${fontStack}`;
      ctx.fillText(`סה"כ מתנדבים בדוח: ${stats.length}   |   סה"כ משמרות: ${totalShifts}   |   סה"כ שעות שבוצעו: ${totalHours.toFixed(1)}`, rightEdge - 30, y + 45);
      ctx.fillStyle = '#424242';
      ctx.font = `22px ${fontStack}`;
      ctx.fillText(`יעד שעות: ${goalHours} שעות   |   חורים במשמרות החודש: ${shiftsGaps.length}`, rightEdge - 30, y + 88);
      y += boxH + 40;
    }

    const headerH = 66;
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(leftEdge, y, contentWidth, headerH);
    ctx.strokeStyle = '#d0d7de';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftEdge, y, contentWidth, headerH);

    ctx.fillStyle = '#1e293b';
    ctx.font = `bold 22px ${fontStack}`;
    colPositions.forEach((col) => {
      ctx.textAlign = 'right';
      ctx.fillText(col.label, col.right - 16, y + headerH / 2);
    });

    y += headerH;
    const rowH = 62;

    pageRows.forEach((row, rIdx) => {
      ctx.fillStyle = (row.shift_count || 0) === 0 ? '#fff5f5' : rIdx % 2 === 1 ? '#fafbfc' : '#ffffff';
      ctx.fillRect(leftEdge, y, contentWidth, rowH);
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftEdge, y + rowH);
      ctx.lineTo(rightEdge, y + rowH);
      ctx.stroke();

      const cy = y + rowH / 2;
      const pct = goalHours > 0 ? Math.min(100, Math.round(((row.total_hours || 0) / goalHours) * 100)) : 0;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#212121';
      ctx.font = `bold 21px ${fontStack}`;
      ctx.fillText(String(row.user_name || ''), colPositions[0].right - 16, cy);

      ctx.font = `21px ${fontStack}`;
      ctx.fillText(`${row.shift_count || 0} משמרות`, colPositions[1].right - 16, cy);

      ctx.fillStyle = '#2e7d32';
      ctx.font = `bold 21px ${fontStack}`;
      ctx.fillText(`${(row.total_hours || 0).toFixed(1)} שעות`, colPositions[2].right - 16, cy);

      ctx.fillStyle = '#212121';
      ctx.font = `21px ${fontStack}`;
      ctx.fillText(`${goalHours}`, colPositions[3].right - 16, cy);
      ctx.fillText(`${pct}%`, colPositions[4].right - 16, cy);

      const statusText = (row.shift_count || 0) === 0 ? 'ללא משמרות (0)' : (row.shift_count || 0) < 2 ? 'מתחת למינימום' : 'פעיל';
      ctx.fillStyle = (row.shift_count || 0) === 0 ? '#c62828' : (row.shift_count || 0) < 2 ? '#ef6c00' : '#2e7d32';
      ctx.font = `bold 20px ${fontStack}`;
      ctx.fillText(statusText, colPositions[5].right - 16, cy);

      y += rowH;
    });

    ctx.fillStyle = '#757575';
    ctx.font = `20px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText('נבנה ליוצאים לשינוי על ידי יצחק גרוס', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 45);

    return canvas;
  });

  const pdfBlob = canvasesToPdfBlob(canvases);
  triggerBlobDownload(pdfBlob, `דוח_מנהל_${month}_${year}.pdf`);
}

