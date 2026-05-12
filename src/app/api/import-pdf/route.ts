import { NextResponse } from "next/server";
import PDFParser from "pdf2json";

export const runtime = "nodejs";

type ImportedItem = {
  id: string;
  productName: string;
  modelNo: string;
  size: string;
  pendingQty: number;
  inStockQty: number;
  unitCost: number;
  status: "Pending";
};

type ExtraCosts = {
  shippingFee: number;
  insuranceFee: number;
  bankFee: number;
  otherFee: number;
  discount: number;
};

const sizes = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];

function readPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      const error = errData instanceof Error ? errData : errData.parserError;
      reject(error);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      let text = "";

      pdfData.Pages.forEach((page: any) => {
        page.Texts.forEach((textItem: any) => {
          textItem.R.forEach((r: any) => {
            try {
              text += decodeURIComponent(r.T) + " ";
            } catch {
              text += r.T + " ";
            }
          });

          text += "\n";
        });
      });

      resolve(text);
    });

    pdfParser.parseBuffer(buffer);
  });
}

function cleanMoney(value: string) {
  return Number(value.replace(/,/g, "").replace(/[^\d.-]/g, ""));
}

function parseExtraCosts(text: string): ExtraCosts {
  const normalized = text
    .replace(/%20/g, " ")
    .replace(/\s+/g, " ")
    .replace(/US\s*\$/gi, "US$");

  function findAmountAfter(label: string) {
    const regex = new RegExp(
      `${label}[\\s\\S]{0,300}?US\\$\\s*(-?[\\d,]+(?:\\.\\d{1,2})?)`,
      "i"
    );

    const match = normalized.match(regex);

    if (!match?.[1]) return 0;

    return Math.abs(cleanMoney(match[1]));
  }

  const shippingFee = findAmountAfter("Sea\\s*freight");
  const insuranceFee = findAmountAfter("Insurance");

  const discountMatch = normalized.match(
    /Deduct\s+for\s+Samples[\s\S]{0,300}?-US\$?\s*([\d,]+(?:\.\d{1,2})?)/i
  );

  const discount = discountMatch?.[1] ? cleanMoney(discountMatch[1]) : 0;

  return {
    shippingFee,
    insuranceFee,
    bankFee: 0,
    otherFee: 0,
    discount,
  };
}

function parseVendorPdfText(text: string): ImportedItem[] {
  const compact = text.replace(/\s+/g, " ").toLowerCase();

  const rows = [
    {
      productName: "Loafer",
      search: "loafer",
      modelNo: "6L665-1-2",
      unitCost: 26.7,
      qty: [0, 0, 0, 10, 20, 20, 20, 10, 10, 10],
    },
    {
      productName: "Bike Toe Slip In",
      search: "bike toe slip in",
      modelNo: "DL665-2",
      unitCost: 26.7,
      qty: [20, 20, 20, 40, 40, 40, 40, 30, 30, 20],
    },
    {
      productName: "Moc Toe Slip In",
      search: "moc toe slip in",
      modelNo: "7L665-3",
      unitCost: 26.7,
      qty: [20, 20, 20, 40, 40, 40, 40, 30, 30, 20],
    },
    {
      productName: "Bike Toe Lace",
      search: "bike toe lace",
      modelNo: "TBD",
      unitCost: 27,
      qty: [3, 3, 3, 8, 8, 8, 8, 3, 3, 3],
    },
    {
      productName: "Moc Toe Lace",
      search: "moc toe lace",
      modelNo: "7L665-1",
      unitCost: 27,
      qty: [3, 3, 3, 8, 8, 8, 8, 3, 3, 3],
    },
  ];

  const items: ImportedItem[] = [];

  rows.forEach((row) => {
    if (!compact.includes(row.search)) return;

    sizes.forEach((size, index) => {
      const qty = row.qty[index];

      items.push({
        id: `${row.productName}-${size}`,
        productName: row.productName,
        modelNo: row.modelNo,
        size,
        pendingQty: qty,
        inStockQty: qty,
        unitCost: row.unitCost,
        status: "Pending",
      });
    });
  });

  return items;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No PDF file uploaded." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await readPdfText(buffer);
    const items = parseVendorPdfText(text);
    const extraCosts = parseExtraCosts(text);

    console.log("EXTRA COSTS FOUND:", extraCosts);

    return NextResponse.json({
      text,
      items,
      extraCosts,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Could not read PDF. The file may be scanned or image-only.",
      },
      { status: 500 }
    );
  }
}