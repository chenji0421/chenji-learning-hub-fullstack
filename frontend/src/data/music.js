// 站内音乐库：登记 frontend/public/music/ 下的真实音频文件。
// 原则：
// - 只登记真实存在的文件：没有文件就不登记，音乐页显示空状态，不放假歌曲
// - 只用自己有权的音乐（原创 / 已授权 / 免费可商用），不放版权歌曲
//
// 字段说明：
// - id：唯一标识，不能重复
// - title：歌名
// - artist：作者 / 歌手
// - src：音频地址，public 目录下的文件直接用 /music/文件名
// - cover：封面图地址（可选，可留空字符串）
// - description：一句话说明
//
// 添加方法：把音频文件放到 frontend/public/music/，然后照下面示例加一条。
// 没有真实文件时，保持这个数组为空（[]），页面会显示「暂未添加音乐」空状态。
//
// 示例（有真实文件后才能加进来，不要渲染假歌曲）：
// { id: "example", title: "示例音乐", artist: "沉积", src: "/music/example.mp3", cover: "", description: "测试音频" }
export const musicLibrary = [
  {
    id: "heroism-in-nihility",
    title: "英雄主义 - 在虚无中永存",
    artist: "沉积收藏",
    src: "/music/heroism-in-nihility.flac",
    cover: "",
    description: "放在沉积 Learning Hub 音乐页中的第一首真实音乐。",
  },
];
