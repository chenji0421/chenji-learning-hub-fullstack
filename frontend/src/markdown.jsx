// 轻量 Markdown 渲染：不引入第三方库，只支持常见基础语法。
// 块级：#/##/### 标题、- 无序列表、1. 有序列表、> 引用、``` 代码块、段落
// 行内：**加粗**、*斜体*、`行内代码`、[链接](url)
// 输出 React 元素，不渲染原始 HTML，天然防 XSS。
// 文章详情页与管理后台的「实时预览」共用同一份渲染逻辑。

// 行内语法正则：行内代码、加粗、斜体、链接（按优先级排列）
const INLINE_RE =
  /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/;

function parseInline(text, keyOffset = 0) {
  const m = String(text).match(INLINE_RE);
  if (!m) return [text];
  const idx = m.index;
  const parts = [];
  if (idx > 0) parts.push(text.slice(0, idx));
  const token = m[0];
  const k = keyOffset;
  if (token.startsWith("`")) {
    parts.push(
      <code key={k}>{token.slice(1, -1)}</code>
    );
  } else if (token.startsWith("**")) {
    parts.push(
      <strong key={k}>{parseInline(token.slice(2, -2), k + 100)}</strong>
    );
  } else if (token.startsWith("*")) {
    parts.push(
      <em key={k}>{parseInline(token.slice(1, -1), k + 100)}</em>
    );
  } else {
    parts.push(
      <a key={k} href={m[3]} target="_blank" rel="noopener noreferrer">
        {m[2]}
      </a>
    );
  }
  parts.push(...parseInline(text.slice(idx + token.length), k + 1));
  return parts;
}

function renderBlocks(text) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let i = 0;
  let inCode = false;
  let codeBuf = [];

  const push = (node) => blocks.push(node);

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 代码块：``` 开头 / 结尾
    if (trimmed.startsWith("```")) {
      if (inCode) {
        push(
          <pre key={blocks.length}>
            <code>{codeBuf.join("\n")}</code>
          </pre>
        );
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    if (!trimmed) {
      i++;
      continue;
    }

    // 标题：1~3 个 #（原版 #→h2、##→h3 的映射保持一致）
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      push(<Tag key={blocks.length}>{parseInline(heading[2])}</Tag>);
      i++;
      continue;
    }

    // 无序列表：合并连续行
    if (trimmed.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(
          <li key={items.length}>{parseInline(lines[i].trim().slice(2))}</li>
        );
        i++;
      }
      push(<ul key={blocks.length}>{items}</ul>);
      continue;
    }

    // 有序列表：合并连续行
    if (/^\d+\.\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(
          <li key={items.length}>
            {parseInline(lines[i].trim().replace(/^\d+\.\s/, ""))}
          </li>
        );
        i++;
      }
      push(<ol key={blocks.length}>{items}</ol>);
      continue;
    }

    // 引用
    if (trimmed.startsWith("> ")) {
      push(
        <blockquote key={blocks.length}>{parseInline(trimmed.slice(2))}</blockquote>
      );
      i++;
      continue;
    }

    // 段落
    push(<p key={blocks.length}>{parseInline(trimmed)}</p>);
    i++;
  }

  // 未闭合的代码块也渲染出来，避免内容丢失
  if (inCode) {
    push(
      <pre key={blocks.length}>
        <code>{codeBuf.join("\n")}</code>
      </pre>
    );
  }
  return blocks;
}

export default function renderMarkdown(text) {
  return renderBlocks(text);
}
