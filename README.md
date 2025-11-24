
# 🍎 Fruit Link Saga (连连看 Online)

![Version](https://img.shields.io/badge/version-2.3.0-green.svg)
![Deploy](https://img.shields.io/badge/deploy-Tencent%20Cloud-blue)

一个基于 React + TypeScript 构建的现代化连连看游戏。支持本地单机游玩，也可以部署到腾讯云。

---

## ☁️ 腾讯云部署指南 (GitHub Actions)

本项目已配置自动化部署流程。

### 1. 准备腾讯云 COS
1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/cos)。
2. 创建一个 **存储桶 (Bucket)** (例如: `fruit-game-1250000000`)。
3. 进入存储桶 -> **基础配置** -> **静态网站** -> 开启静态网站 (索引文档填 `index.html`)。
4. 获取你的 **SecretId** 和 **SecretKey** (在“访问管理”中)。

### 2. 配置 GitHub Secrets
在你的 GitHub 仓库中，点击 **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**，添加以下 4 个变量：

| Secret Name | 值示例 | 说明 |
| :--- | :--- | :--- |
| `TENCENT_SECRET_ID` | `AKIDxxxxxxxxxxxx` | 你的腾讯云 SecretId |
| `TENCENT_SECRET_KEY` | `xxxxxxxxxxxxxxxx` | 你的腾讯云 SecretKey |
| `TENCENT_BUCKET` | `fruit-game-1250000000` | 存储桶名称-AppId |
| `TENCENT_REGION` | `ap-shanghai` | 存储桶地域 (如 ap-guangzhou) |

### 3. 开始部署
1. 将代码 `git push` 到 `main` 分支。
2. 点击 GitHub 仓库的 **Actions** 标签，查看部署进度。
3. 部署成功后，访问腾讯云 COS 提供的 **静态网站访问节点** 链接即可游玩！

---

## 🛠️ 本地开发

```bash
npm install
npm start
```
本地运行时，默认开启 Express 后端 (端口 3001)。

**注意**：部署到腾讯云静态托管后，游戏将默认运行在**单机模式** (数据保存在浏览器缓存)，因为静态网站无法运行 Node.js 后端。
