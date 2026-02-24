import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportService = {
  toCSV(data: Record<string, unknown>[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          const stringValue = String(value ?? '');
          return stringValue.includes(',') || stringValue.includes('"') 
            ? `"${stringValue.replace(/"/g, '""')}"` 
            : stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  },

  toExcel(data: Record<string, unknown>[], filename: string, sheetName: string = 'Datos'): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    
    let csvContent = '\uFEFF';
    csvContent += headers.join('\t');
    csvContent += '\n';
    
    data.forEach(row => {
      csvContent += headers.map(header => {
        const value = row[header];
        const stringValue = String(value ?? '');
        return stringValue.includes('\t') || stringValue.includes('\n') 
          ? `"${stringValue.replace(/"/g, '""')}"` 
          : stringValue;
      }).join('\t');
      csvContent += '\n';
    });

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  },

  toPDF(data: Record<string, unknown>[], filename: string, title: string): void {
    if (data.length === 0) return;

    const doc = new jsPDF();
    const headers = Object.keys(data[0]);
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 14, 30);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 14;
    const marginRight = 14;
    const tableWidth = pageWidth - marginLeft - marginRight;
    const colWidth = tableWidth / headers.length;
    
    let y = 40;
    
    doc.setFillColor(41, 128, 185);
    doc.rect(marginLeft, y, tableWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    headers.forEach((header, i) => {
      const headerStr = String(header).replace(/_/g, ' ');
      doc.text(headerStr.charAt(0).toUpperCase() + headerStr.slice(1), marginLeft + i * colWidth + 2, y + 5.5);
    });
    
    y += 8;
    doc.setTextColor(0, 0, 0);
    
    data.forEach((row, rowIndex) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      
      if (rowIndex % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(marginLeft, y, tableWidth, 7, 'F');
      }
      
      headers.forEach((header, i) => {
        const value = String(row[header] ?? '').substring(0, 20);
        doc.text(value, marginLeft + i * colWidth + 2, y + 5);
      });
      
      y += 7;
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text('SOF-IA - Consultorio Jurídico', pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  async toPNG(elementId: string, filename: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  },

  async toPNGElement(element: HTMLElement, filename: string): Promise<void> {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  }
};

export default exportService;
