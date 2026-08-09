// 极简 Markdown 渲染：只支持 #/## 标题、- 无序列表、> 引用、段落。
// 文章详情页与管理后台的「实时预览」共用同一份渲染逻辑。
export default function renderMarkdown(text) {
  const lines = (text || "").split("\n");
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const key = out.length;
    if (trimmed.startsWith("# ")) out.push(<h2 key={key}>{trimmed.slice(2)}</h2>);
    else if (trimmed.startsWith("## ")) out.push(<h3 key={key}>{trimmed.slice(3)}</h3>);
    else if (trimmed.startsWith("- ")) out.push(<li key={key}>{trimmed.slice(2)}</li>);
    else if (trimmed.startsWith("> ")) out.push(<blockquote key={key}>{trimmed.slice(2)}</blockquote>);
    else out.push(<p key={key}>{trimmed}</p>);
  }
  return out;
}
