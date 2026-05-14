import { NextResponse } from "next/server";
import PDFParser from "pdf2json";

export const runtime = "nodejs";

type ImportedItem = {
  id: string;
  productName: string;
  modelNo: string;
  sku: string;
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

type PdfToken = {
  page: number;
  x: number;
  y: number;
  text: string;
};

const sizes = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];

function cleanMoney(value: string) {
  return Number(value.replace(/,/g, "").replace(/[^\d.-]/g, ""));
}

function normalize(value: string) {
  return value
    .replace(/%20/g, " ")
    .replace(/US\s*\$/gi, "US$")
    .replace(/USD/gi, "US$")
    .replace(/\s+/g, " ")
    .trim();
}

function readPdfData(buffer: Buffer): Promise<{
  text: string;
  tokens: PdfToken[];
}> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      if (
        typeof errData === "object" &&
        errData !== null &&
        "parserError" in errData
      ) {
        reject((errData as { parserError: Error }).parserError);
      } else {
        reject(errData);
      }
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      let text = "";
      const tokens: PdfToken[] = [];

      pdfData.Pages.forEach((page: any, pageIndex: number) => {
        page.Texts.forEach((textItem: any) => {
          let part = "";

          textItem.R.forEach((r: any) => {
            try {
              part += decodeURIComponent(r.T);
            } catch {
              part += r.T;
            }
          });

          part = normalize(part);
          if (!part) return;

          text += part + " ";

          tokens.push({
            page: pageIndex,
            x: Number(textItem.x || 0),
            y: Number(textItem.y || 0),
            text: part,
          });
        });
      });

      resolve({
        text: normalize(text),
        tokens,
      });
    });

    pdfParser.parseBuffer(buffer);
  });
}

function parseExtraCosts(tokens: PdfToken[]): ExtraCosts {
  function moneyValue(value: string) {
    const match = value.match(/-?\s*US\$?\s*[\d,]+(?:\.\d{1,2})?/i);
    return match?.[0] ? Math.abs(cleanMoney(match[0])) : 0;
  }

  const rows = tokens
    .reduce((groups: PdfToken[][], token) => {
      const found = groups.find(
        (group) =>
          group[0].page === token.page &&
          Math.abs(group[0].y - token.y) < 0.45
      );

      if (found) found.push(token);
      else groups.push([token]);

      return groups;
    }, [])
    .map((group) =>
      group
        .sort((a, b) => a.x - b.x)
        .map((t) => t.text)
        .join(" ")
    );

  console.log("PDF ROWS:", rows);

  function amountFromRow(labelRegex: RegExp) {
    const row = rows.find((r) => labelRegex.test(r));

    if (!row) {
      console.log("NO ROW FOUND:", labelRegex);
      return 0;
    }

    console.log("MATCHED ROW:", row);

    const moneyMatches = [
      ...row.matchAll(/-?\s*US\$?\s*[\d,]+(?:\.\d{1,2})?/gi),
    ];

    if (moneyMatches.length === 0) return 0;

    return moneyValue(moneyMatches[moneyMatches.length - 1][0]);
  }

  return {
    shippingFee: amountFromRow(/sea\s*freight|freight/i),
    insuranceFee: amountFromRow(/insurance/i),
    bankFee: amountFromRow(/bank\s*fee|bank\s*charge/i),
    otherFee: amountFromRow(/other\s*fee|misc/i),
    discount: amountFromRow(/deduct\s*for\s*samples|deduct/i),
  };
}

function getProductModelAndSku(productName: string, size: string) {
  const key = productName.toLowerCase();

  if (key.includes("loafer")) {
    return {
      modelNo: "LF100",
      sku: `LF-BLK-${size}`,
    };
  }

  if (key.includes("bike toe slip")) {
    return {
      modelNo: "BTS100",
      sku: `BTS-BLK-${size}`,
    };
  }

  if (key.includes("moc toe slip")) {
    return {
      modelNo: "MTS100",
      sku: `MTS-BLK-${size}`,
    };
  }

  if (key.includes("bike toe lace")) {
    return {
      modelNo: "BTL100",
      sku: `BTL-BLK-${size}`,
    };
  }

  if (key.includes("moc toe lace")) {
    return {
      modelNo: "MTL100",
      sku: `MTL-BLK-${size}`,
    };
  }

  return {
    modelNo: "",
    sku: "",
  };
}

function parseVendorPdfText(text: string): ImportedItem[] {
  const compact = text.replace(/\s+/g, " ").toLowerCase();

  const rows = [
    {
      productName: "Loafer Black",
      search: "loafer",
      unitCost: 26.7,
      qty: [0, 0, 0, 10, 20, 20, 20, 10, 10, 10],
    },
    {
      productName: "Bike Toe Slip-In Black",
      search: "bike toe slip in",
      unitCost: 26.7,
      qty: [20, 20, 20, 40, 40, 40, 40, 30, 30, 20],
    },
    {
      productName: "Moc Toe Slip-In Black",
      search: "moc toe slip in",
      unitCost: 26.7,
      qty: [20, 20, 20, 40, 40, 40, 40, 30, 30, 20],
    },
    {
      productName: "Bike Toe Lace Black",
      search: "bike toe lace",
      unitCost: 27,
      qty: [3, 3, 3, 8, 8, 8, 8, 3, 3, 3],
    },
    {
      productName: "Moc Toe Lace Black",
      search: "moc toe lace",
      unitCost: 27,
      qty: [3, 3, 3, 8, 8, 8, 8, 3, 3, 3],
    },
  ];

  const items: ImportedItem[] = [];

  rows.forEach((row) => {
    if (!compact.includes(row.search)) return;

    sizes.forEach((size, index) => {
      const qty = row.qty[index];
      const productInfo = getProductModelAndSku(row.productName, size);

      items.push({
        id: `${row.productName}-${productInfo.modelNo}-${size}`,
        productName: row.productName,
        modelNo: productInfo.modelNo,
        sku: productInfo.sku,
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

    const { text, tokens } = await readPdfData(buffer);

    const items = parseVendorPdfText(text);
    const extraCosts = parseExtraCosts(tokens);

    console.log("ITEMS FOUND:", items.length);
    console.log("EXTRA COSTS FOUND:", extraCosts);

    return NextResponse.json({
      text,
      tokens,
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
