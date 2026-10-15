# 留影 · 照片作品工坊

在手机或电脑上读取照片 EXIF，生成带艺术边框的摄影作品。照片在当前设备内处理，无需登录。

## 功能

- 点击预览即可选择或更换照片；单张制作与批量处理，单批最多 50 张；支持追加、移除和逐张预览。
- 美术馆、摄影画册、胶片记忆与照片内透明水印四种模板；18 种配色、逐张自动匹配主色和照片边缘取色的雾面玻璃效果。
- 自动读取每张照片的相机、镜头、焦距、光圈、快门、ISO 和拍摄时间，可分别修改，每项可独立控制是否显示。
- 支持透明品牌字标或纯文字；每张照片独立保存模板、配色、磨砂强度、水印透明度、参数开关、署名和品牌显示方式。点击缩略图即可单独编辑，也可主动将当前样式应用到全部；作品名、品牌和拍摄参数保持各自设置，留空标题不添加默认文字。边框与水印位于预览下方，选项采用圆角。透明水印无底板，保留照片比例，支持明暗自适应和不透明度调节。
- JPEG 导出、多图分享与 ZIP 下载，支持进度显示和中途停止。
- 可添加到主屏幕；首次联网完成离线缓存后，可以离线制作与导出。

## 直接使用

发布到 GitHub Pages 后，访问：

https://dqtb.github.io/liuying-photo-atelier/

iPhone 建议通过 Safari 打开，在分享菜单中选择“添加到主屏幕”。先等待应用说明中的“离线已就绪”，再断网使用。系统清理缓存后需要联网打开一次。

## 本地预览

项目是静态 HTML、CSS 和 JavaScript，不需要安装前端依赖。

```sh
python3 -m http.server 8765 --directory .
```

打开 http://localhost:8765。离线缓存需要 HTTPS 或 localhost。

## GitHub Pages 发布

在仓库 **Settings → Pages** 中选择：

- Source：Deploy from a branch
- Branch：main
- Folder：/ (root)

以后更新 网站文件 并提交到 main，即可触发发布。无需前端构建。

## 检查

使用 Node.js 18 或更新版本：

```sh
node sw-navigation.cjs
node per-photo-style.cjs
```

该检查覆盖首页重定向、旧重定向缓存、离线重开，以及缓存不可用时的在线降级。Service Worker 将缓存的重定向文档转换成正常文档响应，避免导航时出现 `ERR_FAILED`。

## 隐私与格式

照片不上传到服务器。模板、配色、参数显示开关和署名仅保存在浏览器本地；离开页面后需重新选择照片。导出为普通 JPEG，不携带原片 EXIF/GPS，不保留 RAW、HDR 或 Live Photo 动态效果。HEIC 读取取决于浏览器支持；无法打开时可选择 JPEG。多图分享取决于系统和浏览器，可使用 ZIP 下载作为替代。

## 第三方资源

- EXIF 读取：exifr，许可证位于 `LICENSE-exifr`。
- ZIP 打包：fflate，许可证位于 `LICENSE-fflate`。
- 品牌字标的来源和派生说明见 [BRAND-SOURCES.json](BRAND-SOURCES.json)。字标用于标识拍摄设备，相关商标属于各自权利人。

## 反馈

微信号：**bdq102**
