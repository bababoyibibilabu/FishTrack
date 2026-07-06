# 钓点私人手帐与熟人分享 - 系统设计方案

本设计方案旨在构建一个移动端优先的 PWA（渐进式Web应用）——“钓点私人手帐与熟人分享”。系统支持离线访问、GPS 照片解析、拖拽地图精准选址，并通过 Supabase 保证个人钓点的私密隔离，同时提供点对点只读分享与克隆存储机制。

---

## 1. 架构设计与技术栈

### 前端技术栈
* **核心框架**：Vue 3 (组合式 API, SFC) + Vite
* **UI 样式**：Tailwind CSS (响应式布局，完美适配 iOS/Android 各种手机屏幕)
* **路由管理**：Vue Router (采用 HTML5 History 模式)
* **地图渲染**：Leaflet.js + 高德卫星地图 XYZ 瓦片（免开发者 Key 方案）
* **依赖库**：
  * `leaflet`：轻量级地图引擎。
  * `exif-js`：前端解析照片 GPS 元数据。
  * `coordtransform`：WGS-84（GPS 坐标）、GCJ-02（火星坐标）、BD-09（百度坐标）互转。
  * `@supabase/supabase-js`：直连 Supabase SDK，负责用户身份校验与数据同步。

### 部署与托管
* **托管平台**：Cloudflare Pages
* **路由配置**：在 `public/` 目录下输出 `_redirects` 文件，写入 `/* /index.html 200` 以支持 SPA 路由重定向。

### 后端与数据库
* **数据库/认证/存储**：Supabase
* **安全策略**：行级安全 (RLS, Row Level Security)

---

## 2. 数据库设计 (Supabase Schema)

### 2.1 数据表 `fishing_spots`

在 Supabase SQL Editor 中执行以下脚本创建数据表：

```sql
-- 创建钓点表
create table public.fishing_spots (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  lat double precision not null, -- 存储 GCJ-02 坐标
  lng double precision not null, -- 存储 GCJ-02 坐标
  image_url text,                -- 照片在 Supabase Storage 中的公共 URL
  is_shared boolean default false not null -- 是否开启分享
);

-- 为 user_id 创建索引以加快查询
create index idx_fishing_spots_user_id on public.fishing_spots(user_id);
```

### 2.2 行级安全策略 (RLS)

启用并设置 `fishing_spots` 表的安全策略：

```sql
-- 启用行级安全
alter table public.fishing_spots enable row level security;

-- 1. INSERT 策略：允许已登录用户创建属于自己的数据
create policy "Allow auth users to insert their own spots" 
on public.fishing_spots 
for insert 
with check (auth.uid() = user_id);

-- 2. UPDATE / DELETE 策略：仅允许创建者修改或删除自己的数据
create policy "Allow creator to update/delete their own spots" 
on public.fishing_spots 
for all 
using (auth.uid() = user_id);

-- 3. SELECT 策略：允许用户查看自己的数据，或已开启分享且已登录用户查看
create policy "Allow read own or shared spots" 
on public.fishing_spots 
for select 
using (
  (auth.uid() = user_id) 
  or 
  (is_shared = true and auth.uid() is not null)
);
```

### 2.3 存储桶与安全策略 (`fishing-photos`)

在 Supabase 控制台创建名为 `fishing-photos` 的公开存储桶 (Public Bucket)，并设置以下存储安全策略：

```sql
-- 1. SELECT 策略：公开访问，任何人都可以读取照片（为分享功能服务）
-- 对应 Supabase 控制台可以直接创建 public bucket。

-- 2. INSERT 策略：允许任何已登录用户上传，限制上传目录以防越权
create policy "Allow authenticated users to upload photos"
on storage.objects
for insert
with check (
  bucket_id = 'fishing-photos' 
  and auth.role() = 'authenticated'
);

-- 3. DELETE 策略：仅允许上传者本人删除自己的照片
create policy "Allow owners to delete their photos"
on storage.objects
for delete
using (
  bucket_id = 'fishing-photos' 
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 3. 核心功能实现逻辑

### 3.1 坐标系转换逻辑
从浏览器 Geolocation API 或照片 EXIF 读取到的原始经纬度是 **WGS-84**（地球坐标系）。
* 高德卫星图要求 **GCJ-02**。
* 百度地图导航要求 **BD-09**。

```javascript
import coordtransform from 'coordtransform';

// WGS-84 -> GCJ-02 (展示与存入 Supabase)
function convertWgs84ToGcj02(lng, lat) {
  const result = coordtransform.wgs84togcj02(lng, lat);
  return { lng: result[0], lat: result[1] };
}

// GCJ-02 -> BD-09 (百度导航)
function convertGcj02ToBd09(lng, lat) {
  const result = coordtransform.gcj02tobd09(lng, lat);
  return { lng: result[0], lat: result[1] };
}
```

### 3.2 照片 GPS 解析逻辑
使用 `exif-js` 解析上传图片的 GPS 元数据：

```javascript
import EXIF from 'exif-js';

function getLatLngFromImage(file) {
  return new Promise((resolve, reject) => {
    EXIF.getData(file, function() {
      const latData = EXIF.getTag(this, 'GPSLatitude');
      const lonData = EXIF.getTag(this, 'GPSLongitude');
      const latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N';
      const lonRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'E';

      if (latData && lonData) {
        // 转换度分秒到十进制
        let lat = latData[0] + latData[1] / 60 + latData[2] / 3600;
        let lon = lonData[0] + lonData[1] / 60 + lonData[2] / 3600;

        if (latRef === 'S') lat = -lat;
        if (lonRef === 'W') lon = -lon;

        resolve({ lng: lon, lat: lat }); // 返回原始 WGS-84 坐标
      } else {
        resolve(null);
      }
    });
  });
}
```

### 3.3 本地导航唤起链接

#### 3.3.1 高德地图
* 坐标系：GCJ-02 (火星坐标)
* 调起 Scheme:
  `amapuri://navigation?sourceApplication=FishApp&poiname=${encodeURIComponent(name)}&lat=${lat}&lon=${lng}&dev=1&style=2`
  *(注意：`dev=1` 声明使用的是 GCJ-02 坐标)*

#### 3.3.2 百度地图
* 坐标系：BD-09 (百度坐标)
* 步骤：
  1. 调用 `convertGcj02ToBd09(lng, lat)`。
  2. 调起 Scheme:
     `baidumap://map/direction?destination=latlng:${bd_lat},${bd_lng}|name:${encodeURIComponent(name)}&mode=driving`

### 3.4 钓点分享与克隆逻辑
* **分享生成**：详情页点击分享按钮，复制 `window.location.origin + '/share?id=' + spot.id` 至剪贴板。
* **克隆保存**：
  在 `/share` 只读页面下，已登录用户（且非创建者）点击“存入我的手帐”，前端发起 Insert 请求：
  ```javascript
  const newSpot = {
    name: originalSpot.name,
    description: originalSpot.description,
    lat: originalSpot.lat,
    lng: originalSpot.lng,
    image_url: originalSpot.image_url,
    user_id: currentUser.id,
    is_shared: false // 克隆后默认为私有
  };
  await supabase.from('fishing_spots').insert([newSpot]);
  ```

---

## 4. 路由与页面映射

* `/login`：邮箱验证码（OTP/Magic Link）免密登录。
* `/`：我的钓点列表（My Spots，卡片展示，支持搜索，包含退出登录按钮）。
* `/spot/new`：新建钓点（自动定位 -> 支持传图提取 GPS -> Leaflet 地图拖拽 Marker 微调 -> 输入名称描述并保存）。
* `/spot/edit/:id`：编辑钓点。
* `/spot/:id`：钓点详情（卫星底图展示，唤起本地导航，提供分享开关和分享链接生成）。
* `/share`：只读分享页（通过 URL Query `id` 加载。提供直接存入当前登录用户手帐的功能）。

---

## 5. PWA 特性清单

* **manifest.json**：定义图标、启动色（Theme Color）和 `standalone` 全屏模式。
* **Vite PWA Plugin**：使用 `generateSW` 自动缓存 `index.html`、JS、CSS、Leaflet 资源文件，支持基本离线启动。
* **高德卫星瓦片离线降级**：若处于无网环境，Leaflet 无法加载新瓦片，但本地已定位数据和表单逻辑依然可以通过 PWA 缓存运行，重新联网后可进行同步或上传。
