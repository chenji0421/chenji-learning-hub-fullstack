# 音乐文件目录

把你有权使用的音频文件（mp3 / wav / ogg / flac）放在这个目录里，然后在
`frontend/src/data/music.js` 里登记，音乐页就会显示并播放。

## 怎么添加一首歌

1. **放文件**：把音频文件放进本目录，例如 `frontend/public/music/example.mp3`
2. **登记**：打开 `frontend/src/data/music.js`，在 `musicLibrary` 数组里照示例加一条：

```js
{
  id: "example",             // 唯一标识，不能重复
  title: "示例音乐",         // 歌名
  artist: "沉积",            // 作者 / 歌手
  src: "/music/example.mp3", // public 路径，直接写 /music/文件名
  cover: "",                 // 封面图地址（可选，可留空）
  description: "测试音频",   // 一句话说明
}
```

3. **检查构建**：在 `frontend` 目录运行 `npm run build`，确认没有报错
4. **部署**：commit + push 后，GitHub Actions 会自动重新部署，刷新线上就能听了

## 支持的推荐格式

- **mp3**：兼容性最好
- **wav**：文件较大
- **ogg**：部分浏览器支持
- **flac**：音质好，但浏览器兼容性不如 mp3

> flac 在部分浏览器（尤其是旧版 Safari / Edge）里播放不了。如果页面提示「当前浏览器不支持 flac」，
> 建议把音频转成 mp3 后再放进来，兼容性最佳。

## 注意

- **只用自己有权的音乐**：原创、已获授权、或明确免费可商用的音频。不要放版权歌曲。
- **不要生成假音乐**：没有真实文件就不要在数据文件里登记。页面在没有真实音频时保持空状态。
- 音频文件通常较大，提交前注意不要把大型文件塞进 Git 历史（本仓库已忽略 `*.pdf` 等大文件，音频请自行斟酌是否纳入版本控制）。
