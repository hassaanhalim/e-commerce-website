import React from "react";

interface FormattedMessageContentProps {
  content: string;
}

/**
 * Parse inline markdown formatting:
 * - **bold**
 * - *italic*
 * - `code`
 * - ~~strikethrough~~
 */
function renderInlineContent(text: string): React.ReactNode[] {
  // Regex to match **bold**, *italic*, `code`, and ~~strikethrough~~
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|~~.*?~~)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-[#1A1D20]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic text-[#4A5568]">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="rounded bg-[#EAE6DE] px-1 py-0.5 text-xs font-mono text-[#2D3748]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return (
        <span key={index} className="line-through text-[#98A2B3]">
          {part.slice(2, -2)}
        </span>
      );
    }
    return part;
  });
}

/**
 * Check if a line looks like a markdown table row (e.g. | col1 | col2 |)
 */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");
}

/**
 * Check if a line is a markdown table separator (e.g. |---|---|)
 */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("|") &&
    trimmed.endsWith("|") &&
    /^\|(\s*:?-+:?\s*\|)+$/.test(trimmed)
  );
}

/**
 * Parse a markdown table row into cells
 */
function parseRowCells(row: string): string[] {
  const trimmed = row.trim();
  // Remove leading and trailing pipes
  const content = trimmed.slice(1, -1);
  return content.split("|").map((c) => c.trim());
}

interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}

interface ListBlock {
  type: "bullet-list" | "ordered-list";
  items: string[];
}

interface ParagraphBlock {
  type: "paragraph";
  text: string;
}

type ContentBlock = TableBlock | ListBlock | ParagraphBlock;

/**
 * Parse full markdown message into structural blocks
 */
function parseMessageBlocks(content: string): ContentBlock[] {
  const lines = content.split("\n");
  const blocks: ContentBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Table Detection
    if (isTableRow(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseRowCells(trimmed);
      i += 2; // Skip header and separator
      const rows: string[][] = [];

      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseRowCells(lines[i]));
        i++;
      }

      blocks.push({
        type: "table",
        headers,
        rows,
      });
      continue;
    }

    // 2. Bullet List Detection (- item, * item, • item)
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i++;
      }
      blocks.push({
        type: "bullet-list",
        items,
      });
      continue;
    }

    // 3. Ordered List Detection (1. item, 2. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({
        type: "ordered-list",
        items,
      });
      continue;
    }

    // 4. Regular Paragraph (gather consecutive non-empty non-list lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isTableRow(lines[i].trim()) &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({
        type: "paragraph",
        text: paraLines.join("\n"),
      });
    }
  }

  return blocks;
}

export function FormattedMessageContent({ content }: FormattedMessageContentProps) {
  if (!content) return null;

  const blocks = parseMessageBlocks(content);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-[#20252B]">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "paragraph": {
            return (
              <p key={idx} className="break-words">
                {renderInlineContent(block.text)}
              </p>
            );
          }

          case "bullet-list": {
            return (
              <ul key={idx} className="my-1.5 space-y-1.5 pl-0.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#748779]"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 break-words">
                      {renderInlineContent(item)}
                    </span>
                  </li>
                ))}
              </ul>
            );
          }

          case "ordered-list": {
            return (
              <ol key={idx} className="my-1.5 space-y-1.5 pl-4 list-decimal text-xs sm:text-sm">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="pl-1 break-words">
                    {renderInlineContent(item)}
                  </li>
                ))}
              </ol>
            );
          }

          case "table": {
            return (
              <div
                key={idx}
                className="my-2.5 w-full overflow-hidden rounded-xl border border-[#E7E3DC] bg-white shadow-2xs"
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-[#E7E3DC] text-left text-xs">
                    <thead className="bg-[#F4F1EB] font-bold text-[#20252B]">
                      <tr>
                        {block.headers.map((h, hIdx) => (
                          <th
                            key={hIdx}
                            scope="col"
                            className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#353F38] whitespace-nowrap"
                          >
                            {renderInlineContent(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EDE6] bg-white">
                      {block.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={rIdx % 2 === 0 ? "bg-white" : "bg-[#FAF8F5]"}
                        >
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className="px-3 py-2 text-xs text-[#20252B] whitespace-normal break-words"
                            >
                              {renderInlineContent(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}

export default FormattedMessageContent;
