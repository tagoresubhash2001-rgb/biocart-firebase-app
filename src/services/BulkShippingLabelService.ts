import { PDFDocument } from 'pdf-lib';

export interface LabelJob {
  orderNumber: string;
  waybill: string;
  vendorId: string;
}

export interface BulkLabelProgress {
  total: number;
  completed: number;
  successCount: number;
  failedCount: number;
  currentOrder?: string;
  status: 'idle' | 'fetching' | 'merging' | 'completed' | 'error';
  failures: { orderNumber: string; waybill: string; error: string }[];
}

export class BulkShippingLabelService {
  /**
   * Fetches the official PDF label bytes for a given waybill from the backend/EKART URL.
   */
  static async fetchLabelPdfBytes(labelUrl: string): Promise<Uint8Array> {
    const res = await fetch(labelUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf, application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to download carrier label (HTTP ${res.status})`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data.pdf_download_link || data.labelUrl) {
        return this.fetchLabelPdfBytes(data.pdf_download_link || data.labelUrl);
      }
      throw new Error('Received JSON instead of binary PDF for shipping label.');
    }

    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  }

  /**
   * Merges multiple 4x6 inch carrier shipping label PDFs into a single standard thermal-ready PDF.
   * 4 x 6 inches in PDF points (72 points per inch) = 288 x 432 pt (or 101.6 x 152.4 mm).
   */
  static async mergeShippingLabels(
    labelPdfs: { waybill: string; orderNumber: string; pdfBytes: Uint8Array }[]
  ): Promise<Uint8Array> {
    const mergedDoc = await PDFDocument.create();

    for (const item of labelPdfs) {
      try {
        const sourceDoc = await PDFDocument.load(item.pdfBytes);
        const copiedPages = await mergedDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
        for (const page of copiedPages) {
          mergedDoc.addPage(page);
        }
      } catch (err: any) {
        console.error(`Error embedding label for ${item.waybill}:`, err);
        throw new Error(`Corrupted carrier label for AWB ${item.waybill}: ${err.message}`);
      }
    }

    return await mergedDoc.save();
  }

  /**
   * Generates a safe printable browser download for the merged PDF.
   */
  static downloadPdf(bytes: Uint8Array, filename: string): void {
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  }
}
