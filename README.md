# 鱼迹 (FishTrack) - 钓点私人手帐与熟人分享 PWA

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-emerald.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-sky.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg)](https://supabase.com/)

**鱼迹 (FishTrack)** 是一款专为户外钓友设计的**移动端优先、渐进式 Web 应用 (PWA)**。它允许钓友记录专属的私密钓点、上传现场实况照片，并在需要时通过点对点分享将钓点以只读链接形式分享给熟人，支持一键“克隆转存”以及调起第三方地图导航。

---

## 🌟 核心特色与功能

1. **移动端优先与 PWA 支持**
   - 适配全面屏手势与 iOS/Android 凹口屏遮挡（Safe Area）。
   - 支持“添加到主屏幕”全屏独立运行，完美还原原生 App 交互体验，支持离线缓存与后台自动更新。
2. **免密邮箱 OTP 登录**
   - 接入 Supabase Go-True 服务，用户只需输入邮箱即可发送 6 位验证码安全登录，避免在户外输入复杂密码的烦恼。
3. **户外定位与照片 EXIF 解析**
   - 自动获取当前物理 GPS 坐标并转换为火星坐标系（GCJ-02）。
   - 上传带位置元数据的照片时，系统将使用 `exif-js` 自动提取其中的 WGS-84 原始 GPS 信息，并实时转换覆盖当前定位。
4. **火星坐标系 (GCJ-02) 卫星地图集成**
   - 基于标准 Leaflet.js 构建，底图直连高德卫星图和标注图层，规避了大厂 Web SDK Key 的限制。
   - 标记支持拖拽微调以实现户外找点的极致精度。
5. **本地手机地图导航唤起**
   - 支持在详情页一键调起手机本地安装的**高德地图**或**百度地图** App 进行路线规划。
   - **坐标精准对齐**：高德导航采用 `dev=0` 直传 GCJ-02 坐标，百度导航调用 `coordtransform` 在前端高精度转化为 BD-09 坐标后再行传输，彻底杜绝 300~500 米偏移。
6. **熟人点对点克隆分享 (无数据依赖冲突)**
   - 钓点默认私密。开启分享后，生成唯一的 `/share?id=xxx` 链接，方便发送给熟人。
   - 收到链接的钓友登录系统后，可点击“存入我的手帐”进行克隆。
   - **独立数据复制**：克隆时，系统会自动在 Supabase Storage 中复制一份照片到克隆者的个人独立文件夹中，以保证数据独立性。原拥有者删除该钓点不会导致克隆者的图片链接失效。

---

## 🛠️ 技术栈清单

- **前台框架**：Vue 3 (Composition API / Setup) + Vue Router
- **构建工具**：Vite 5
- **样式系统**：Tailwind CSS 3 (Vanilla CSS 混合，支持 notch 及安全区域适配)
- **数据库/认证**：Supabase JS SDK
- **地图内核**：Leaflet.js + 高德 XYZ 卫星影像 & 标注图层
- **工具库**：
  - `exif-js`（前端解析照片 GPS）
  - `coordtransform`（GCJ-02 / BD-09 / WGS-84 坐标高精度互转）
- **测试框架**：Vitest

---

## 🚀 快速开始

### 1. 克隆本项目并安装依赖

```bash
git clone https://github.com/bababoyibibilabu/FishTrack.git
cd FishTrack
npm install
```

### 2. 配置环境变量

在项目根目录下创建 `.env` 文件，填入您的 Supabase 凭证：

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. 本地运行与生产打包

```bash
# 本地热更新调试
npm run dev

# 运行单元测试
npm run test

# 生产环境编译打包 (生成 dist 目录，自动配置 PWA Service Worker)
npm run build
```

---

## 🗄️ 后端 Supabase 数据库与存储设置

本项目的行级安全（RLS）和文件存储防冲突规则十分严密。为了确保项目的正常运行，请在 Supabase SQL 窗口和存储设置中导入相关的 SQL。

详细的数据库建表与存储 Bucket 配置脚本已整理在 **[supabase_setup_instructions.md](file:///C:/Users/dell/.gemini/antigravity-cli/brain/6d7096ad-7cd7-468f-9892-8b3ec28776de/supabase_setup_instructions.md)** 引导文档中（该文件位于会话的 Artifact 归档中，请打开该文件拷贝完整的 SQL 策略到 Supabase 运行）。

---

## 📄 开源许可证

本项目基于 **[MIT License](LICENSE)** 协议开源。欢迎在此基础上扩展和二次开发！
