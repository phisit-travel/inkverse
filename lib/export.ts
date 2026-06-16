import { createZip } from "./zip";
import { renderNovel } from "./markdown";

export interface ExportChapter {
  chapterNum: number;
  title: string | null;
  content: string | null;
}

function xmlEsc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Strip HTML to readable plain text (for the .txt export). */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n— — —\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chapterHeading(ch: ExportChapter): string {
  return `ตอนที่ ${ch.chapterNum}${ch.title ? " — " + ch.title : ""}`;
}

export function buildTxt(title: string, author: string, chapters: ExportChapter[]): string {
  const out: string[] = [title];
  if (author) out.push(`โดย ${author}`);
  out.push("", "");
  for (const ch of chapters) {
    out.push(chapterHeading(ch), "");
    out.push(htmlToText(ch.content) || "(ไม่มีเนื้อหา)");
    out.push("", "— — — — —", "");
  }
  return out.join("\n");
}

export function buildEpub(title: string, author: string, chapters: ExportChapter[]): Buffer {
  const uid = "urn:inkverse:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const creator = author || "INKVERSE";

  const items = chapters.map((ch, i) => {
    const id = `chap${i + 1}`;
    const heading = xmlEsc(chapterHeading(ch));
    const bodyHtml = renderNovel(ch.content) || "<p>(ไม่มีเนื้อหา)</p>";
    const xhtml =
      `<?xml version="1.0" encoding="utf-8"?>\n` +
      `<!DOCTYPE html>\n` +
      `<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="th"><head><meta charset="utf-8"/>` +
      `<title>${heading}</title></head><body><h2>${heading}</h2>${bodyHtml}</body></html>`;
    return { id, heading, xhtml };
  });

  const manifestItems = items.map((it) => `<item id="${it.id}" href="${it.id}.xhtml" media-type="application/xhtml+xml"/>`).join("\n");
  const spineItems = items.map((it) => `<itemref idref="${it.id}"/>`).join("\n");
  const navPoints = items
    .map((it, i) => `<navPoint id="np${i + 1}" playOrder="${i + 1}"><navLabel><text>${it.heading}</text></navLabel><content src="${it.id}.xhtml"/></navPoint>`)
    .join("\n");
  const navLis = items.map((it) => `<li><a href="${it.id}.xhtml">${it.heading}</a></li>`).join("\n");

  const contentOpf =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">\n` +
    `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n` +
    `<dc:identifier id="bookid">${uid}</dc:identifier>\n` +
    `<dc:title>${xmlEsc(title)}</dc:title>\n` +
    `<dc:language>th</dc:language>\n` +
    `<dc:creator>${xmlEsc(creator)}</dc:creator>\n` +
    `</metadata>\n` +
    `<manifest>\n` +
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n` +
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n` +
    `${manifestItems}\n` +
    `</manifest>\n` +
    `<spine toc="ncx">\n${spineItems}\n</spine>\n` +
    `</package>`;

  const tocNcx =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n` +
    `<head><meta name="dtb:uid" content="${uid}"/></head>\n` +
    `<docTitle><text>${xmlEsc(title)}</text></docTitle>\n` +
    `<navMap>\n${navPoints}\n</navMap>\n</ncx>`;

  const navXhtml =
    `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n` +
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="th"><head><meta charset="utf-8"/>` +
    `<title>สารบัญ</title></head><body><nav epub:type="toc"><h1>สารบัญ</h1><ol>\n${navLis}\n</ol></nav></body></html>`;

  const container =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n` +
    `<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>\n` +
    `</container>`;

  return createZip([
    // mimetype MUST be first and stored uncompressed (our writer always stores).
    { name: "mimetype", data: Buffer.from("application/epub+zip", "ascii") },
    { name: "META-INF/container.xml", data: Buffer.from(container, "utf8") },
    { name: "OEBPS/content.opf", data: Buffer.from(contentOpf, "utf8") },
    { name: "OEBPS/toc.ncx", data: Buffer.from(tocNcx, "utf8") },
    { name: "OEBPS/nav.xhtml", data: Buffer.from(navXhtml, "utf8") },
    ...items.map((it) => ({ name: `OEBPS/${it.id}.xhtml`, data: Buffer.from(it.xhtml, "utf8") })),
  ]);
}
