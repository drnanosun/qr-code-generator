"use client";

import { useMemo, useState } from "react";
import JsBarcode from "jsbarcode";
import * as QRCode from "qrcode";

const modes = [
  { id: "qr", label: "QR Code" },
  { id: "barcode", label: "Barcode" },
];

const contentTypes = [
  { id: "url", label: "URL" },
  { id: "text", label: "Text" },
  { id: "wifi", label: "WiFi" },
  { id: "vcard", label: "vCard" },
];

const palettes = [
  { name: "Mint", fg: "#476A6F", bg: "#D8F3DC" },
  { name: "Peach", fg: "#7C5E4F", bg: "#FFE5D9" },
  { name: "Lilac", fg: "#584B7A", bg: "#E9D8FD" },
  { name: "Sky", fg: "#42657A", bg: "#D7F3FF" },
  { name: "Rose", fg: "#7B4B61", bg: "#FFDDE8" },
  { name: "Lemon", fg: "#665C34", bg: "#FFF4B8" },
];

const defaultForms = {
  url: { value: "https://example.com" },
  text: { value: "Hello from Pastel QR Generator" },
  wifi: { ssid: "My WiFi", password: "password123", encryption: "WPA", hidden: false },
  vcard: {
    firstName: "Jane",
    lastName: "Doe",
    phone: "+66123456789",
    email: "jane@example.com",
    organization: "Pastel Studio",
    website: "https://example.com",
  },
  barcode: {
    value: "8851234567890",
    showText: true,
  },
};

function escapeWifi(value) {
  return value.replace(/([\\;,":])/g, "\\$1");
}

function escapeSvg(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPayload(type, forms) {
  if (type === "url") return forms.url.value.trim();
  if (type === "text") return forms.text.value;
  if (type === "wifi") {
    const { ssid, password, encryption, hidden } = forms.wifi;
    return `WIFI:T:${encryption};S:${escapeWifi(ssid)};P:${escapeWifi(password)};H:${hidden ? "true" : "false"};;`;
  }

  const card = forms.vcard;
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${card.lastName};${card.firstName};;;`,
    `FN:${[card.firstName, card.lastName].filter(Boolean).join(" ")}`,
    card.organization ? `ORG:${card.organization}` : "",
    card.phone ? `TEL:${card.phone}` : "",
    card.email ? `EMAIL:${card.email}` : "",
    card.website ? `URL:${card.website}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function extractInnerSvg(svg) {
  return svg
    .replace(/<\?xml[^>]*>/g, "")
    .replace(/<!DOCTYPE[^>]*>/g, "")
    .replace(/<svg[^>]*>/, "")
    .replace("</svg>", "");
}

function qrMatrixSvg(payload, settings) {
  if (payload.length > 1200) {
    throw new Error("Payload is too long");
  }

  const qr = QRCode.create(payload, { errorCorrectionLevel: "H" });
  const margin = 2;
  const totalCells = qr.modules.size + margin * 2;
  const cellSize = settings.qrBaseSize / totalCells;
  const darkModules = [];

  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let col = 0; col < qr.modules.size; col += 1) {
      if (qr.modules.get(row, col)) {
        darkModules.push(
          `<rect x="${(col + margin) * cellSize}" y="${(row + margin) * cellSize}" width="${cellSize}" height="${cellSize}" />`,
        );
      }
    }
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${settings.qrBaseSize}" height="${settings.qrBaseSize}" viewBox="0 0 ${settings.qrBaseSize} ${settings.qrBaseSize}">
  <rect width="${settings.qrBaseSize}" height="${settings.qrBaseSize}" fill="${settings.background}" />
  <g fill="${settings.foreground}" shape-rendering="crispEdges">
    ${darkModules.join("\n    ")}
  </g>
</svg>`.trim();
}

function frameQrSvg(qrSvg, settings) {
  const size = 920;
  const qrSize = 620;
  const qrX = (size - qrSize) / 2;
  const qrY = 160;
  const safeText = escapeSvg(settings.frameText.trim());

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="54" fill="${settings.background}" />
  <rect x="58" y="58" width="${size - 116}" height="${size - 116}" rx="42" fill="none" stroke="${settings.foreground}" stroke-width="18" opacity="0.22" />
  ${
    safeText
      ? `<text x="${size / 2}" y="104" text-anchor="middle" font-family="Prompt, Arial, sans-serif" font-size="38" font-weight="800" fill="${settings.foreground}">${safeText}</text>
  <text x="${size / 2}" y="842" text-anchor="middle" font-family="Prompt, Arial, sans-serif" font-size="30" font-weight="700" fill="${settings.foreground}" opacity="0.72">${safeText}</text>
  <text x="102" y="${size / 2}" text-anchor="middle" font-family="Prompt, Arial, sans-serif" font-size="24" font-weight="700" fill="${settings.foreground}" opacity="0.52" transform="rotate(-90 102 ${size / 2})">${safeText}</text>
  <text x="818" y="${size / 2}" text-anchor="middle" font-family="Prompt, Arial, sans-serif" font-size="24" font-weight="700" fill="${settings.foreground}" opacity="0.52" transform="rotate(90 818 ${size / 2})">${safeText}</text>`
      : ""
  }
  <rect x="${qrX - 26}" y="${qrY - 26}" width="${qrSize + 52}" height="${qrSize + 52}" rx="34" fill="${settings.background}" stroke="${settings.foreground}" stroke-width="8" opacity="0.95" />
  <g transform="translate(${qrX} ${qrY}) scale(${qrSize / settings.qrBaseSize})">
    ${extractInnerSvg(qrSvg)}
  </g>
</svg>`.trim();
}

function barcodeRects(bits, x, y, width, height) {
  const moduleWidth = width / bits.length;
  const rects = [];
  let start = null;

  for (let index = 0; index <= bits.length; index += 1) {
    const isBar = bits[index] === "1";
    if (isBar && start === null) start = index;
    if ((!isBar || index === bits.length) && start !== null) {
      const barWidth = (index - start) * moduleWidth;
      rects.push(`<rect x="${x + start * moduleWidth}" y="${y}" width="${barWidth}" height="${height}" />`);
      start = null;
    }
  }

  return rects.join("\n    ");
}

function barcodeSvg(value, settings, barcodeSettings) {
  const cleanValue = value.trim();
  if (!cleanValue) throw new Error("Barcode value is required");
  if (cleanValue.length > 80) throw new Error("Barcode value is too long");

  const barcode = {};
  JsBarcode(barcode, cleanValue, {
    format: "CODE128",
    displayValue: barcodeSettings.showText,
  });

  const bits = barcode.encodings.map((encoding) => encoding.data).join("");
  const size = 920;
  const barX = 110;
  const barY = 320;
  const barWidth = 700;
  const barHeight = 250;
  const safeText = escapeSvg(settings.frameText.trim());
  const safeValue = escapeSvg(cleanValue);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="54" fill="${settings.background}" />
  <rect x="58" y="58" width="${size - 116}" height="${size - 116}" rx="42" fill="none" stroke="${settings.foreground}" stroke-width="18" opacity="0.22" />
  ${
    safeText
      ? `<text x="${size / 2}" y="122" text-anchor="middle" font-family="Prompt, Arial, sans-serif" font-size="40" font-weight="800" fill="${settings.foreground}">${safeText}</text>`
      : ""
  }
  <rect x="82" y="248" width="756" height="424" rx="34" fill="#ffffff" opacity="0.82" />
  <g fill="${settings.foreground}" shape-rendering="crispEdges">
    ${barcodeRects(bits, barX, barY, barWidth, barHeight)}
  </g>
  ${
    barcodeSettings.showText
      ? `<text x="${size / 2}" y="640" text-anchor="middle" font-family="Prompt, Arial, sans-serif" font-size="40" font-weight="700" fill="${settings.foreground}">${safeValue}</text>`
      : ""
  }
  <text x="${size / 2}" y="802" text-anchor="middle" font-family="Prompt, Arial, sans-serif" font-size="28" font-weight="700" fill="${settings.foreground}" opacity="0.68">CODE128 Barcode</text>
</svg>`.trim();
}

export default function Home() {
  const [mode, setMode] = useState("qr");
  const [type, setType] = useState("url");
  const [forms, setForms] = useState(defaultForms);
  const [settings, setSettings] = useState({
    foreground: "#476A6F",
    background: "#D8F3DC",
    frameText: "SCAN ME",
    qrBaseSize: 512,
  });

  const payload = useMemo(() => buildPayload(type, forms), [type, forms]);
  const result = useMemo(() => {
    try {
      if (mode === "barcode") {
        return {
          svg: barcodeSvg(forms.barcode.value, settings, forms.barcode),
          status: "",
          filename: "pastel-barcode",
        };
      }

      if (!payload.trim()) {
        return { svg: "", status: "ใส่ข้อมูลก่อนสร้าง QR", filename: "pastel-qr" };
      }

      const qrSvg = qrMatrixSvg(payload, settings);
      return { svg: frameQrSvg(qrSvg, settings), status: "", filename: "pastel-qr" };
    } catch (error) {
      const messages = {
        "Payload is too long": "ข้อมูล QR ยาวเกินไป กรุณาลดความยาวให้ไม่เกิน 1,200 ตัวอักษร",
        "Barcode value is required": "ใส่ข้อมูลก่อนสร้างบาร์โค้ด",
        "Barcode value is too long": "ข้อมูลบาร์โค้ดยาวเกินไป กรุณาลดความยาวให้ไม่เกิน 80 ตัวอักษร",
      };

      return {
        svg: "",
        status: messages[error.message] ?? "สร้างโค้ดไม่สำเร็จ",
        filename: mode === "barcode" ? "pastel-barcode" : "pastel-qr",
      };
    }
  }, [forms.barcode, mode, payload, settings]);

  function updateForm(section, field, value) {
    setForms((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  }

  function applyPalette(palette) {
    setSettings((current) => ({
      ...current,
      foreground: palette.fg,
      background: palette.bg,
    }));
  }

  function downloadSvg() {
    if (!result.svg) return;
    const blob = new Blob([result.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.filename}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPng() {
    if (!result.svg) return;
    const image = new Image();
    image.src = svgToDataUri(result.svg);
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 1840;
    canvas.height = 1840;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${result.filename}.png`;
    link.click();
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="editor-panel">
          <div className="intro">
            <p>QR & Barcode Generator</p>
            <h1>สร้าง QR code และบาร์โค้ดสีพาสเทลพร้อมกรอบข้อความ</h1>
          </div>

          <div className="mode-switch" aria-label="Code mode">
            {modes.map((item) => (
              <button
                key={item.id}
                className={mode === item.id ? "active" : ""}
                onClick={() => setMode(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === "qr" && (
            <div className="segmented" aria-label="QR content type">
              {contentTypes.map((item) => (
                <button
                  key={item.id}
                  className={type === item.id ? "active" : ""}
                  onClick={() => setType(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="form-grid">
            {mode === "barcode" && (
              <>
                <label>
                  Barcode value
                  <input
                    value={forms.barcode.value}
                    onChange={(event) => updateForm("barcode", "value", event.target.value)}
                    placeholder="8851234567890"
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={forms.barcode.showText}
                    onChange={(event) => updateForm("barcode", "showText", event.target.checked)}
                  />
                  Show text under barcode
                </label>
              </>
            )}

            {mode === "qr" && type === "url" && (
              <label>
                URL
                <input
                  value={forms.url.value}
                  onChange={(event) => updateForm("url", "value", event.target.value)}
                  placeholder="https://example.com"
                />
              </label>
            )}

            {mode === "qr" && type === "text" && (
              <label>
                Text
                <textarea
                  value={forms.text.value}
                  onChange={(event) => updateForm("text", "value", event.target.value)}
                  placeholder="พิมพ์ข้อความ"
                  rows={5}
                />
              </label>
            )}

            {mode === "qr" && type === "wifi" && (
              <>
                <label>
                  Network name
                  <input value={forms.wifi.ssid} onChange={(event) => updateForm("wifi", "ssid", event.target.value)} />
                </label>
                <label>
                  Password
                  <input value={forms.wifi.password} onChange={(event) => updateForm("wifi", "password", event.target.value)} />
                </label>
                <label>
                  Encryption
                  <select value={forms.wifi.encryption} onChange={(event) => updateForm("wifi", "encryption", event.target.value)}>
                    <option value="WPA">WPA/WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">No password</option>
                  </select>
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={forms.wifi.hidden}
                    onChange={(event) => updateForm("wifi", "hidden", event.target.checked)}
                  />
                  Hidden network
                </label>
              </>
            )}

            {mode === "qr" && type === "vcard" && (
              <>
                <label>
                  First name
                  <input value={forms.vcard.firstName} onChange={(event) => updateForm("vcard", "firstName", event.target.value)} />
                </label>
                <label>
                  Last name
                  <input value={forms.vcard.lastName} onChange={(event) => updateForm("vcard", "lastName", event.target.value)} />
                </label>
                <label>
                  Phone
                  <input value={forms.vcard.phone} onChange={(event) => updateForm("vcard", "phone", event.target.value)} />
                </label>
                <label>
                  Email
                  <input value={forms.vcard.email} onChange={(event) => updateForm("vcard", "email", event.target.value)} />
                </label>
                <label>
                  Organization
                  <input value={forms.vcard.organization} onChange={(event) => updateForm("vcard", "organization", event.target.value)} />
                </label>
                <label>
                  Website
                  <input value={forms.vcard.website} onChange={(event) => updateForm("vcard", "website", event.target.value)} />
                </label>
              </>
            )}
          </div>

          <div className="style-tools">
            <div>
              <h2>Pastel palette</h2>
              <div className="swatches">
                {palettes.map((palette) => (
                  <button key={palette.name} type="button" onClick={() => applyPalette(palette)} title={palette.name}>
                    <span style={{ background: palette.bg }} />
                    <span style={{ background: palette.fg }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="color-grid">
              <label>
                Foreground
                <input
                  type="color"
                  value={settings.foreground}
                  onChange={(event) => setSettings((current) => ({ ...current, foreground: event.target.value }))}
                />
              </label>
              <label>
                Background
                <input
                  type="color"
                  value={settings.background}
                  onChange={(event) => setSettings((current) => ({ ...current, background: event.target.value }))}
                />
              </label>
            </div>

            <label>
              Frame text
              <input
                value={settings.frameText}
                maxLength={28}
                onChange={(event) => setSettings((current) => ({ ...current, frameText: event.target.value }))}
                placeholder="SCAN ME"
              />
            </label>
          </div>
        </div>

        <aside className="preview-panel">
          <div className="qr-preview">
            {result.svg ? (
              <div className="qr-svg" aria-label="Generated code preview" dangerouslySetInnerHTML={{ __html: result.svg }} />
            ) : (
              <p>{result.status}</p>
            )}
          </div>
          <div className="export-row">
            <button type="button" onClick={downloadPng} disabled={!result.svg}>
              Export PNG
            </button>
            <button type="button" onClick={downloadSvg} disabled={!result.svg}>
              Export SVG
            </button>
          </div>
          <p className="hint">รองรับ QR สำหรับ URL, ข้อความ, WiFi, vCard และบาร์โค้ด CODE128 พร้อม export ไฟล์ครบถ้วน</p>
        </aside>
      </section>
    </main>
  );
}
