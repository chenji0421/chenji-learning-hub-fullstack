import { TOOLBOX_GROUPS } from "../data.js";

export default function Toolbox() {
  return (
    <div className="toolbox">
      <h1 className="page-title">工具箱</h1>
      <p className="page-sub">
        常用的学习与开发资源入口。点击卡片在新标签页打开对应站点。
      </p>

      {TOOLBOX_GROUPS.map((group) => (
        <section key={group.title} className="toolbox-group">
          <h2>
            <span className="toolbox-group-icon">{group.icon}</span>
            {group.title}
          </h2>
          <div className="tool-grid">
            {group.items.map((item) => (
              <a
                key={item.name}
                className="tool-card"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="tool-name">{item.name}</span>
                <span className="tool-desc">{item.desc}</span>
                <span className="tool-open">打开 ↗</span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <p className="muted toolbox-note">
        当前为内置的静态工具入口。后续可以让管理员在后台自定义工具链接，并保存到数据库。
      </p>
    </div>
  );
}
