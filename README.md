# 《贵族学校的特招生》酒馆角色卡版

这是《贵族学校的特招生》的 SillyTavern 酒馆助手发布仓库。仓库根目录直接作为 GitHub Pages 发布目录。

## 玩家下载

从 [v1.0.0 Release](https://github.com/sarah707/TAO/releases/tag/v1.0.0) 下载 `Noble-School-Special-Student-v1.0.0.json` 并导入酒馆。仓库根目录也保留了中文文件名的正式角色卡。需要安装并启用酒馆助手。

角色卡固定引用下面的 CDN 启动器：

```text
https://testingcf.jsdelivr.net/gh/sarah707/TAO@v1.0.0/bootstrap.js
```

启动器每次打开会读取：

```text
https://sarah707.github.io/TAO/version.json
```

然后加载清单指定的版本标签。游戏代码、界面、提示词和事件更新后，玩家刷新酒馆即可取得新版；角色卡本体、卡内正则或启动器地址改变时才需要重新下载角色卡。

## 目录结构

```text
TAO/
├─ .nojekyll                 # 允许发布以点开头的课程配置文件
├─ bootstrap.js              # 角色卡固定引用的稳定启动器
├─ version.json              # 当前版本及版本化 loader 地址
├─ loader.js                 # 浮窗入口
├─ bridge/                   # 酒馆、生图和世界书桥接
├─ game/                     # 游戏页面、脚本、课程配置和素材
├─ 贵族学校的特招生.json       # 正式角色卡
└─ README.md
```

## 发布新版本

1. 在源工程提升 `package.json` 的版本号，例如从 `1.0.0` 改为 `1.0.1`。
2. 运行测试和构建：

   ```powershell
   npm test
   npm run check
   npm run build
   ```

3. 把 `dist` 中除“本地测试”角色卡外的内容同步到本仓库根目录。
4. 提交并推送 `main`。
5. 为同一个提交创建与清单一致的标签，例如 `v1.0.1`，并推送标签。
6. 等待 GitHub Pages 更新后检查 `version.json`，再刷新酒馆测试。

已经发布的版本标签必须保持不变。`bootstrap.js` 的首发 `v1.0.0` 地址是旧角色卡的长期入口，后续更新通过 `version.json` 切换到新标签。
