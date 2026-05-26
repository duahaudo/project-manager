import { type AdfNode, type AdfDocument } from "./types";

function renderTextNode(node: AdfNode): string {
  let text = node.text ?? "";
  if (!node.marks || node.marks.length === 0) return text;

  for (const mark of node.marks) {
    if (mark.type === "strong") {
      text = `**${text}**`;
    } else if (mark.type === "em") {
      text = `_${text}_`;
    } else if (mark.type === "code") {
      text = `\`${text}\``;
    } else if (mark.type === "link") {
      const href = (mark.attrs?.href as string) ?? "";
      text = `[${text}](${href})`;
    } else if (mark.type === "strike") {
      text = `~~${text}~~`;
    } else if (mark.type === "underline") {
      text = `__${text}__`;
    } else if (mark.type === "textColor") {
      // ignore color, can't represent in markdown
    } else if (mark.type === "subsup") {
      // ignore sub/sup in markdown
    }
  }
  return text;
}

function renderChildren(node: AdfNode | AdfDocument): string {
  if (!("content" in node) || !node.content) return "";
  return node.content.map((child) => adfToMarkdown(child)).join("");
}

function renderTable(node: AdfNode): string {
  if (!node.content || node.content.length === 0) return "";

  const rows = node.content;
  const lines: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.content) continue;

    const cells: string[] = [];
    for (const cell of row.content) {
      const cellContent = renderChildren(cell).trim();
      cells.push(cellContent);
    }

    lines.push("| " + cells.join(" | ") + " |");

    if (i === 0) {
      lines.push("| " + cells.map(() => "---").join(" | ") + " |");
    }
  }

  return lines.join("\n") + "\n\n";
}

export function adfToMarkdown(node: AdfNode | AdfDocument): string {
  switch (node.type) {
    case "doc":
      return renderChildren(node);

    case "paragraph":
      return renderChildren(node) + "\n\n";

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      return "#".repeat(level) + " " + renderChildren(node) + "\n\n";
    }

    case "bulletList": {
      if (!node.content) return "";
      return node.content
        .map((item) => "- " + renderChildren(item).trim())
        .join("\n") + "\n";
    }

    case "orderedList": {
      if (!node.content) return "";
      return node.content
        .map((item) => "1. " + renderChildren(item).trim())
        .join("\n") + "\n";
    }

    case "listItem":
      return renderChildren(node);

    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      const code = node.content?.map((c) => c.text ?? "").join("") ?? "";
      return "```" + lang + "\n" + code + "\n```\n\n";
    }

    case "blockquote":
      return "> " + renderChildren(node).trim() + "\n\n";

    case "text":
      return renderTextNode(node);

    case "hardBreak":
      return "\n";

    case "rule":
      return "---\n\n";

    case "table":
      return renderTable(node);

    case "tableRow":
      if (!node.content) return "";
      const cells: string[] = [];
      for (const cell of node.content) {
        const cellContent = renderChildren(cell).trim();
        cells.push(cellContent);
      }
      return "| " + cells.join(" | ") + " |\n";

    case "tableHeader":
      return renderChildren(node);

    case "tableCell":
      return renderChildren(node);

    case "mention": {
      const mentionText = (node.attrs?.text as string) ?? (node.attrs?.id as string) ?? "unknown";
      return `@${mentionText}`;
    }

    case "emoji": {
      const emojiText = (node.attrs?.text as string) ?? `:${(node.attrs?.shortName as string) ?? "emoji"}:`;
      return emojiText;
    }

    case "inlineCard": {
      const url = (node.attrs?.url as string) ?? "";
      return `[${url}](${url})`;
    }

    case "blockCard": {
      const url = (node.attrs?.url as string) ?? "";
      return `[${url}](${url})\n\n`;
    }

    case "panel": {
      const panelType = (node.attrs?.panelType as string) ?? "info";
      return `> **${panelType}**: ${renderChildren(node).trim()}\n\n`;
    }

    case "expand":
    case "nestedExpand": {
      const title = (node.attrs?.title as string) ?? "";
      return `**${title}**\n\n${renderChildren(node)}`;
    }

    case "media": {
      const alt = (node.attrs?.alt as string) ?? "";
      const url = (node.attrs?.url as string) ?? (node.attrs?.id as string) ?? "";
      return `![${alt}](${url})`;
    }

    case "mediaSingle":
    case "mediaGroup": {
      const url = (node.attrs?.url as string) ?? (node.attrs?.id as string) ?? "";
      return `![media](${url})\n\n`;
    }

    default:
      return renderChildren(node);
  }
}
