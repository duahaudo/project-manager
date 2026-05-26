import { type AdfDocument, type AdfNode } from "./types";

/** Parse inline markdown within a line into ADF text nodes with marks. */
function parseInline(text: string): AdfNode[] {
  const nodes: AdfNode[] = [];
  // Regex captures: **bold**, _italic_, `code`, [text](url), and plain text
  const re = /(\*\*(.+?)\*\*|_(.+?)_|`(.+?)`|\[(.+?)\]\((.+?)\)|([^*_`[\]]+))/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match[2] !== undefined) {
      // **bold**
      nodes.push({ type: "text", text: match[2], marks: [{ type: "strong" }] });
    } else if (match[3] !== undefined) {
      // _italic_
      nodes.push({ type: "text", text: match[3], marks: [{ type: "em" }] });
    } else if (match[4] !== undefined) {
      // `code`
      nodes.push({ type: "text", text: match[4], marks: [{ type: "code" }] });
    } else if (match[5] !== undefined && match[6] !== undefined) {
      // [text](url)
      nodes.push({
        type: "text",
        text: match[5],
        marks: [{ type: "link", attrs: { href: match[6] } }],
      });
    } else if (match[7] !== undefined) {
      // plain text segment
      nodes.push({ type: "text", text: match[7] });
    }
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

function makeParagraph(line: string): AdfNode {
  return {
    type: "paragraph",
    content: parseInline(line),
  };
}

function makeHeading(level: number, text: string): AdfNode {
  return {
    type: "heading",
    attrs: { level },
    content: parseInline(text),
  };
}

function makeListItem(text: string): AdfNode {
  return {
    type: "listItem",
    content: [{ type: "paragraph", content: parseInline(text) }],
  };
}

export function markdownToAdf(markdown: string): AdfDocument {
  const content: AdfNode[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Triple backtick code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      content.push({
        type: "codeBlock",
        attrs: { language: lang },
        content: [{ type: "text", text: codeLines.join("\n") }],
      });
      continue;
    }

    // Horizontal rule: ---, ***, ___
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      content.push({ type: "rule" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      content.push(makeHeading(headingMatch[1].length, headingMatch[2]));
      i++;
      continue;
    }

    // Blockquote: lines starting with >
    if (/^>\s?/.test(line)) {
      const bqLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        bqLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      const innerDoc = markdownToAdf(bqLines.join("\n"));
      content.push({ type: "blockquote", content: innerDoc.content });
      continue;
    }

    // Bullet list: collect consecutive bullet lines
    if (/^[-*]\s+/.test(line)) {
      const items: AdfNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*]\s+/, "");
        i++;
        const nestedItems: AdfNode[] = [];
        while (i < lines.length && /^\s{2,}[-*]\s+/.test(lines[i])) {
          nestedItems.push(makeListItem(lines[i].replace(/^\s+[-*]\s+/, "")));
          i++;
        }
        if (nestedItems.length > 0) {
          items.push({
            type: "listItem",
            content: [
              { type: "paragraph", content: parseInline(itemText) },
              { type: "bulletList", content: nestedItems },
            ],
          });
        } else {
          items.push(makeListItem(itemText));
        }
      }
      content.push({ type: "bulletList", content: items });
      continue;
    }

    // Ordered list: collect consecutive ordered lines
    if (/^\d+\.\s+/.test(line)) {
      const items: AdfNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(makeListItem(lines[i].replace(/^\d+\.\s+/, "")));
        i++;
      }
      content.push({ type: "orderedList", content: items });
      continue;
    }

    // Empty line — skip (paragraph separator, already handled by line grouping)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph — collect non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !/^>\s?/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      content.push(makeParagraph(paraLines.join(" ")));
    }
  }

  return {
    version: 1,
    type: "doc",
    content,
  };
}
