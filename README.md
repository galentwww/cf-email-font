# CF Email Code Extractor

一个基于 Cloudflare Email Routing、Workers 和 KV 的验证码提取解决方案。本项目可以自动从邮件中提取验证码，并通过 Web 界面安全地展示。

## 功能特点

- 支持 Catch-All 邮件规则，可处理任意前缀的邮箱
- 自动提取多种格式的验证码：
    - 纯数字验证码
    - 英文数字混合验证码
    - 登录按钮链接
    - Magic Links
- 通过 KV 存储验证码信息
- 标准 OIDC 验证保护
- 支持 Bark 通知推送
- 可部署在 Vercel 平台

## 部署步骤

### 1. Cloudflare 配置

#### 创建 KV 命名空间
```bash
# 使用 wrangler 创建 KV 命名空间
wrangler kv:namespace create EMAIL_CODES
wrangler kv:namespace create EMAIL_CODES --preview
```

将生成的 id 和 preview_id 添加到 `wrangler.toml` 文件中。

#### 配置 Email Routing

1. 在 Cloudflare 控制台中启用 Email Routing
2. 创建 Catch-All 规则
3. 将目标设置为您的 Worker

### 2. Worker 部署

1. 复制 `worker.js` 到您的 Workers 项目
2. 配置 `wrangler.toml`：
    - 设置项目名称
    - 添加 KV 绑定

### 3. CORS 和 API 配置

1. 设置 CORS 跨域白名单
2. 配置 API 访问权限

### 4. Vercel 部署

1. Fork 本仓库
2. 在 Vercel 中导入项目
3. 配置环境变量：

```env
# Casdoor 配置
CASDOOR_ID=          # Casdoor 应用 ID
CASDOOR_SECRET=      # Casdoor 应用密钥
CASDOOR_URL=         # Casdoor 服务器地址

# NextAuth 配置
NEXTAUTH_SECRET=     # NextAuth 密钥，用于加密会话
NEXTAUTH_URL=        # 您的应用 URL，例如 https://your-domain.com

# API 配置
NEXT_PUBLIC_API_ENDPOINT=  # API 端点地址
NEXT_PUBLIC_API_TOKEN=     # API 访问令牌
```

4. 部署

## 使用方法

1. 配置邮箱转发规则到您的 Worker
2. 邮件到达时会自动：
    - 提取验证码
    - 存储到 KV
3. 通过 Web 界面查看验证码

## API 说明

### 获取验证码
```
GET /api/codes
```

响应格式：
```json
{
  "code": "123456",
  "sender_name": "Service Name",
  "sender_email": "noreply@example.com",
  "received_time": "2024-01-21 10:00:00"
}
```

## 安全说明

- 使用 OIDC 认证保护验证码信息
- KV 中的验证码数据设置 1 小时过期时间
- 限制 API 访问频率和 IP 白名单
