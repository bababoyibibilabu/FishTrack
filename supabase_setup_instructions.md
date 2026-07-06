# Supabase 数据库与存储桶配置指南

由于 README.md 中原引用的配置文件路径属于其他环境，我们已为您在项目根目录下生成了此本地配置指南。请按照以下步骤在您的 Supabase 项目中配置数据库与存储。

---

## 1. 创建数据库表 `fishing_spots`

在您的 Supabase 控制台的 **SQL Editor** 中运行以下 SQL 脚本来创建数据表并设置索引：

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

---

## 2. 启用并设置行级安全策略 (RLS)

在 **SQL Editor** 中运行以下 SQL 脚本以启用 RLS 并为 `fishing_spots` 数据表配置安全访问策略：

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

---

## 3. 存储桶 (Storage Bucket) 配置

本应用需要使用云端存储保存钓友上传的钓点照片。请在 Supabase 的 **Storage** 控制台进行如下设置：

### 3.1 创建公开存储桶
1. 进入 Supabase Dashboard 的 **Storage** 页面。
2. 点击 **New Bucket**。
3. 将存储桶命名为：`fishing-photos`。
4. **务必勾选** `Public bucket` 选项（公开访问，使得分享钓点时其他人可以读取照片）。
5. 点击 **Save** 保存。

### 3.2 配置存储桶策略
在 **SQL Editor** 中运行以下 SQL 脚本来配置存储桶的安全控制策略（允许登录用户上传照片，以及仅允许照片的所有者删除自己上传的照片）：

```sql
-- 1. INSERT 策略：允许任何已登录用户上传照片到该存储桶
create policy "Allow authenticated users to upload photos"
on storage.objects
for insert
with check (
  bucket_id = 'fishing-photos' 
  and auth.role() = 'authenticated'
);

-- 2. DELETE 策略：仅允许上传者本人删除自己的照片
create policy "Allow owners to delete their photos"
on storage.objects
for delete
using (
  bucket_id = 'fishing-photos' 
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 4. 环境变量配置

在您的本地项目根目录下创建一个 `.env` 文件，并填入您的 Supabase 凭证（可以从 Supabase 的 Project Settings -> API 页面获取）：

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
