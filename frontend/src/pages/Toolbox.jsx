import { TOOLBOX_GROUPS } from "../data.js";

// 工具卡片：统一三段说明 + 明确的按钮文字
// - 有 url 的：外链卡片或站内 hash 链接
// - 有 detail 的：可展开的说明卡（不跳转，展开看步骤）
function ToolCard({ card }) {
  const body = (
    <>
      <span className="tool-card-head">
        <span className="tool-name">{card.name}</span>
        {card.action && <span className="tool-card-action">{card.action}</span>}
      </span>
      <span className="tool-card-desc">
        <span className="tool-card-row">
          <b>是什么：</b>
          {card.what}
        </span>
        <span className="tool-card-row">
          <b>什么时候用：</b>
          {card.when}
        </span>
        {card.detail && <span className="tool-card-detail">{card.detail}</span>}
      </span>
    </>
  );

  // 有跳转链接的卡片：外链新标签页打开，站内链接在同一个标签页切换
  if (card.url) {
    return (
      <a
        className="tool-card"
        href={card.url}
        target={card.internal ? undefined : "_blank"}
        rel={card.internal ? undefined : "noopener noreferrer"}
      >
        {body}
      </a>
    );
  }

  // 无链接的说明卡：点击展开详细步骤
  return (
    <details className="tool-card tool-card-note">
      <summary>{body}</summary>
    </details>
  );
}

// 命令块：标题 + 代码 + 中文解释
function CommandBlock({ cmd }) {
  return (
    <div className="tool-command">
      <div className="tool-command-title">{cmd.title}</div>
      <pre className="tool-command-code">
        <code>{cmd.lines.join("\n")}</code>
      </pre>
      <div className="tool-command-note">{cmd.note}</div>
    </div>
  );
}

export default function Toolbox() {
  return (
    <div className="toolbox">
      <h1 className="page-title">工具箱</h1>
      <p className="page-sub">
        沉积自己的学习与维护工具箱——只放真正用得上手的东西。
      </p>

      {TOOLBOX_GROUPS.map((group) => (
        <section key={group.title} className="toolbox-group">
          <h2>
            <span className="toolbox-group-icon">{group.icon}</span>
            {group.title}
          </h2>
          {group.desc && <p className="toolbox-group-desc">{group.desc}</p>}

          {group.commands ? (
            <div className="tool-command-grid">
              {group.commands.map((cmd) => (
                <CommandBlock key={cmd.title} cmd={cmd} />
              ))}
            </div>
          ) : (
            <div className="tool-grid">
              {group.cards.map((card) => (
                <ToolCard key={card.name} card={card} />
              ))}
            </div>
          )}
        </section>
      ))}

      <p className="muted toolbox-note">
        想自己添加工具？打开 frontend/src/data.js，在对应分组的 cards 数组里照样子加一条即可。
      </p>
    </div>
  );
}
