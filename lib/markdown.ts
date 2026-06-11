import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

// `html: false` → any raw HTML the writer types is escaped, not rendered.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "h2", "h3",
    "blockquote", "hr", "ul", "ol", "li", "a",
  ],
  allowedAttributes: { a: ["href", "title"] },
  allowedSchemes: ["http", "https", "mailto"],
  // Force safe link behaviour.
  transformTags: {
    a: (tagName, attribs) => ({
      tagName: "a",
      attribs: { ...attribs, target: "_blank", rel: "noopener nofollow ugc" },
    }),
  },
};

/**
 * Render a novel chapter (writer-supplied markdown) to safe HTML.
 * Defense in depth: markdown-it escapes raw HTML, then sanitize-html strips
 * anything outside the whitelist (this content is shown to other users).
 */
export function renderNovel(markdown: string | null | undefined): string {
  if (!markdown) return "";
  return sanitizeHtml(md.render(markdown), SANITIZE);
}

/** Word/character counts + reading-time estimate (Thai-aware heuristic). */
export function novelStats(markdown: string | null | undefined): {
  words: number;
  chars: number;
  minutes: number;
} {
  if (!markdown) return { words: 0, chars: 0, minutes: 0 };
  // Strip the lightweight markdown syntax before counting.
  const text = markdown
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();
  const chars = text.replace(/\s+/g, "").length;
  const thaiChars = (text.match(/[฀-๿]/g) || []).length;
  const latinWords = (text.replace(/[฀-๿]/g, " ").match(/\S+/g) || []).length;
  // Thai has no word spaces — approximate ~3 chars per word.
  const words = latinWords + Math.ceil(thaiChars / 3);
  const minutes = Math.max(1, Math.round(words / 200));
  return { words, chars, minutes };
}
