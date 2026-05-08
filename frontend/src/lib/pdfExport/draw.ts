import { PDFDocument, PDFFont, rgb } from "pdf-lib";

/** Переносит текст по словам, измеряя реальную ширину глифов в заданном шрифте. */
export function wrapByWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let buf = "";
    for (const w of words) {
      const candidate = buf ? `${buf} ${w}` : w;
      const width = font.widthOfTextAtSize(candidate, size);
      if (width > maxWidth && buf) {
        lines.push(buf);
        buf = w;
      } else {
        buf = candidate;
      }
    }
    if (buf) lines.push(buf);
  }
  return lines;
}

/** Отрисовывает текст с переносом по словам в прямоугольной области на заданной странице. */
export function drawWrappedText(
  page: ReturnType<PDFDocument["getPages"]>[number],
  text: string,
  box: { x: number; y: number; w: number; h: number },
  font: PDFFont,
  size: number,
  lineHeight = size * 1.25,
) {
  if (!text) return;
  const lines = wrapByWidth(text, font, size, box.w);
  let y = box.y + box.h - size;
  for (const line of lines) {
    if (y < box.y) break;
    page.drawText(line, {
      x: box.x,
      y,
      size,
      font,
      color: rgb(0.05, 0.05, 0.07),
    });
    y -= lineHeight;
  }
}

/**
 * Устанавливает текст у поля формы и пересоздаёт его внешний вид заданным шрифтом.
 * *Размер* шрифта поля контролируется default appearance шаблона — setFontSize
 * учитывают одни просмотрщики PDF и игнорируют другие, поэтому мы его не задаём.
 * Если важен размер — отрисовывайте текст напрямую через `drawWrappedText`.
 */
export function safeSetText(
  form: ReturnType<PDFDocument["getForm"]>,
  fieldName: string,
  value: string,
  font: PDFFont,
) {
  try {
    const f = form.getTextField(fieldName);
    f.setText(value);
    f.updateAppearances(font);
  } catch {
    // поле отсутствует или другого типа — игнорируем (шаблоны со временем меняются)
  }
}
