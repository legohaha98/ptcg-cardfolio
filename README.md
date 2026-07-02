# Cardfolio

一个为手机设计的简中 PTCG 查价与收藏估值 PWA。

## 本地运行

```bash
npm install
npm run dev
```

## 发布到 GitHub Pages

1. 将此目录上传到 GitHub 仓库，默认分支设为 `main`。
2. 打开仓库的 **Settings → Pages**。
3. 在 **Build and deployment** 中选择 **GitHub Actions**。
4. 推送到 `main` 后，内置工作流会自动构建并发布。

发布后，在 iPhone Safari 中打开页面，点击分享按钮，再选择“添加到主屏幕”。

## 数据说明

- 卡牌目录和市场价格来自 Kyo Cards 的公开网页数据接口。
- 面向用户的价格只读取 `jihuansheMarketPrice` 人民币字段。
- 收藏保存在当前设备的浏览器本地存储中，不会上传。
- 建议后续增加 JSON 导入导出，作为本地收藏的备份方式。
