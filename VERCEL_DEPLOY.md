# Vercel 部署指南

## 快速部署（推荐）

### 方法一：命令行部署

1. **安装 Vercel CLI**（已完成）
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```
   会自动打开浏览器，使用 GitHub、Google 或邮箱登录

3. **部署项目**
   ```bash
   cd D:/CC/weekly-report-system
   vercel
   ```

4. **按提示回答问题**
   ```
   ? Set up and deploy? [Y/n] → Y
   ? Which scope? → 选择你的账号
   ? Link to existing project? [y/N] → N  
   ? Project name? → weekly-report-system
   ? Directory? → (按Enter，使用当前目录)
   ? Override settings? [y/N] → N
   ```

5. **配置环境变量**
   
   部署时会自动检测 `.env.local` 中的环境变量，请确认添加：
   
   | 变量名 | 值 |
   |--------|-----|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://gagjnctsiyszzzlviycz.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY | 你的 anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | 你的 service role key |
   | `ADMIN_USERNAME` | `admin` |
   | `ADMIN_PASSWORD` | `admin123` |
   | `SEMESTER_START_DATE` | `2025-02-24` |
   | `WEEKLY_DEADLINE` | `Sunday 23:59` |

6. **完成！**
   
   部署成功后会显示：
   ```
   ✅ Production: https://weekly-report-system-xxx.vercel.app
   ```

### 方法二：通过 Vercel 网站部署

1. 访问 [vercel.com](https://vercel.com)
2. 登录账号
3. 点击 **"Add New"** → **"Project"**
4. 导入 GitHub 仓库（或将项目文件夹拖拽上传）
5. 配置环境变量（同上）
6. 点击 **"Deploy"**

## 部署后

### 修改域名（可选）

1. 访问 [vercel.com/dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击 **Settings** → **Domains**
4. 可以添加自定义域名或使用默认的 `.vercel.app` 域名

### 更新部署

当代码修改后，重新运行：
```bash
vercel --prod
```

### 查看部署日志

```bash
vercel logs
```

## 常见问题

### Q: 部署后页面无法访问？
A: 检查环境变量是否正确配置，特别是 Supabase 的 URL 和密钥

### Q: 登录失败？
A: 确认 Supabase 数据库表已创建，且学生数据已导入

### Q: 如何修改管理员密码？
A: 在 Vercel 项目设置中修改 `ADMIN_PASSWORD` 环境变量

### Q: 数据没有显示？
A: 
1. 确认 Supabase 项目正常运行
2. 检查 `students` 表中是否有数据（应该有80条）
3. 查看 Vercel 部署日志

## 测试账户

部署成功后，使用以下账户测试：

**管理员：**
- 地址：`https://你的域名.vercel.app/login`
- 用户名：`admin`
- 密码：`admin123`

**学生（任选）：**
- 姓名：`张唯一`
- 学号：`230030210`
