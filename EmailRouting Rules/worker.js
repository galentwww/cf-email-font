export default {
    // 修改 corsHeaders 函数，添加 env 参数
    corsHeaders(origin, env) {
      // 从环境变量获取允许的域名列表
      console.log('Current origin:', origin);
      console.log('Env ALLOWED_ORIGINS:', env.ALLOWED_ORIGINS);
      
      const allowedOrigins = env.ALLOWED_ORIGINS || ['http://localhost:3000'];
      console.log('Parsed allowed origins:', allowedOrigins);
  
      // 验证来源是否在允许列表中
      const isAllowedOrigin = allowedOrigins.includes(origin) ? origin : null;
  
      return {
        'Access-Control-Allow-Origin': isAllowedOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400', // 24小时
        // 安全相关的响应头
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      };
    },
  
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const method = request.method;
      const origin = request.headers.get('Origin') || '';
  
      // 处理 OPTIONS 预检请求
      if (method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: this.corsHeaders(origin, env)  // 传入 env
        });
      }
  
      // 如果是获取所有验证码的请求
      if (method === 'GET' && url.pathname === '/codes') {
        try {
          // 验证 Authorization header
          const authHeader = request.headers.get('Authorization');
          if (!authHeader || !this.validateAuth(authHeader, env)) {
            return new Response('Unauthorized', {
              status: 401,
              headers: {
                ...this.corsHeaders(origin, env),  // 传入 env
                'WWW-Authenticate': 'Bearer realm="Access to codes"'
              }
            });
          }
  
          const codes = await this.listAllCodes(env);
          return new Response(JSON.stringify(codes), {
            status: 200,
            headers: {
              ...this.corsHeaders(origin, env),  // 传入 env
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
              ...this.corsHeaders(origin, env),  // 传入 env
              'Content-Type': 'application/json'
            }
          });
        }
      }
  
      // 默认返回
      return new Response("Email Worker is running", {
        status: 200,
        headers: {
          ...this.corsHeaders(origin, env),  // 传入 env
          'Content-Type': 'text/plain;charset=UTF-8'
        }
      });
    },
  
    // 验证 Authorization header
    validateAuth(authHeader, env) {
      // 检查 Authorization header 格式
      if (!authHeader.startsWith('Bearer ')) {
        return false;
      }
  
      const token = authHeader.split(' ')[1];
      // 验证 token 是否与环境变量中的 API_KEY 匹配
      return token === env.API_KEY;
    },
  
    async saveToKV(key, value, expirationTtl, env) {
      try {
        await env.EMAIL_CODES.put(key, value, { expirationTtl });
      } catch (error) {
        console.error('KV存储错误:', error);
        throw error;
      }
    },
  
    async listAllCodes(env) {
      try {
        const list = await env.EMAIL_CODES.list({ prefix: 'verification:' });
        const results = [];
  
        // 获取所有键的值
        for (const key of list.keys) {
          const value = await env.EMAIL_CODES.get(key.name);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              // 添加键名（去掉'verification:'前缀）
              parsed.key = key.name.replace('verification:', '');
              results.push(parsed);
            } catch (e) {
              console.error('JSON解析错误:', e);
            }
          }
        }
  
        return results;
      } catch (error) {
        console.error('获取验证码列表错误:', error);
        throw error;
      }
    },
  
    async email(message, env, ctx) {
      try {
        // 获取邮件基本信息
        const from = message.from;
        const subject = decodeURIComponent(message.headers.get("subject") || "新邮件");
        const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
        const date = new Date(message.headers.get("date")).toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai'
        });
  
        // 读取并解析邮件内容
        const rawContent = await readEmailContent(message.raw);
        const emailContent = await parseEmailContent(rawContent, message.headers);
  
        // 提取验证码或验证链接
        const verification = extractVerificationCode(emailContent);
  
        // 构建邮件内容
        const emailBody = verification 
          ? `来自：${from}`
          : `📨 ${subject}\n📅 ${date}\n�� ${from}\n\n${emailContent.text || emailContent.html}`;
  
        // 如果有验证码或验证链接，保存到KV
        if (verification) {
          try {
            // 提取邮箱地址
            const emailMatch = from.match(/([^@]+)@([^>]+)/);
            if (!emailMatch) {
              throw new Error('Invalid email format');
            }
  
            const senderName = emailMatch[1].trim(); // 邮箱@前面的部分
            const senderEmail = `${emailMatch[1]}@${emailMatch[2].replace(/[>]/g, '')}`.trim(); // 完整邮箱
  
            const kvData = {
              code: verification.code,
              type: verification.type,
              sender_name: senderName,
              sender_email: senderEmail,
              received_time: date
            };
  
            await this.saveToKV(
                `verification:${verification.code}`,
                JSON.stringify(kvData),
                3600, // 1小时过期
                env
            );
          } catch (kvError) {
            console.error('KV存储失败:', kvError);
          }
        }
  
        // 发送到 Bark
        const pushData = {
          title: verification 
            ? verification.type === 'link' 
              ? `📨 验证链接已保存` 
              : `📨 验证码：${verification.code}`
            : `📨 ${subject}`,
          body: emailBody,
          badge: 1,
          sound: "minuet.caf",
          group: "Email",
          icon: "https://www.google.com/gmail/about/static/images/logo-gmail.png",
          isArchive: 1,
          level: "active",
          url: verification?.type === 'link' ? verification.code : `mailto:${from}`
        };
  
        const response = await fetch(env.BARK_SERVER, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json'
          },
          body: JSON.stringify(pushData)
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bark 服务响应错误: ${response.status} ${response.statusText}\n${errorText}`);
        }
  
        return new Response("邮件已成功处理", { status: 200 });
  
      } catch (error) {
        console.error('邮件处理失败:', error);
        return new Response(`处理失败: ${error.message}`, { status: 500 });
      }
    }
  };
  
  // 辅助函数：读取邮件内容
  async function readEmailContent(stream) {
    const reader = stream.getReader();
    const chunks = [];
  
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
  
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const concatenated = new Uint8Array(totalLength);
  
      let position = 0;
      for (const chunk of chunks) {
        concatenated.set(chunk, position);
        position += chunk.length;
      }
  
      return new TextDecoder('utf-8').decode(concatenated);
    } finally {
      reader.releaseLock();
    }
  }
  
  // 辅助函数：解析邮件内容
  async function parseEmailContent(rawContent, headers) {
    const contentType = headers.get("content-type") || "";
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;
  
    if (!boundary) return rawContent;
  
    const parts = rawContent.split(`--${boundary}`).filter(part => part.trim());
    let textContent = '';
    let htmlContent = '';
  
    for (const part of parts) {
      // 处理纯文本部分
      if (part.includes('text/plain')) {
        const matches = part.match(/Content-Transfer-Encoding: base64.*?(?:\r\n|\n|\r){2}([\s\S]+?)(?:\r\n|\n|\r)*$/i);
        if (matches && matches[1]) {
          try {
            textContent = atob(matches[1].trim());
          } catch (e) {
            console.error('Base64 解码失败:', e);
          }
        }
      }
      // 处理HTML部分
      if (part.includes('text/html')) {
        const matches = part.match(/Content-Transfer-Encoding: base64.*?(?:\r\n|\n|\r){2}([\s\S]+?)(?:\r\n|\n|\r)*$/i);
        if (matches && matches[1]) {
          try {
            htmlContent = atob(matches[1].trim());
          } catch (e) {
            console.error('HTML Base64 解码失败:', e);
          }
        }
      }
    }
  
    return {
      text: textContent,
      html: htmlContent
    };
  }
  
  // 辅助函数：提取验证码或验证链接
  function extractVerificationCode(content) {
    if (typeof content === 'object') {
      const textContent = content.text;
      const htmlContent = content.html;
      
      // 先尝试从文本内容中提取数字验证码
      const numberCode = extractNumberCode(textContent);
      if (numberCode) return { code: numberCode, type: 'number' };
      
      // 如果没有数字验证码，尝试提取验证链接
      if (htmlContent) {
        const verificationLink = extractVerificationLink(htmlContent);
        if (verificationLink) return { code: verificationLink, type: 'link' };
      }
      
      return null;
    }
    
    return extractNumberCode(content);
  }
  
  // 提取数字验证码的函数
  function extractNumberCode(content) {
    if (!content) return null;
    
    const patterns = [
      /(?:验证码|码号|校验码|代码|code|Code)\D{0,10}?([0-9]{4,8})(?!\d)/i,
      /(?:验证码|码号|校验码|代码|code|Code)\D{0,10}?([A-Za-z0-9]{4,8})(?![A-Za-z0-9])/i,
      /[""']([A-Za-z0-9]{4,8})[""']/,
      /^[\s》】\]]*([0-9]{4,8})[\s《【\[]*$/m,
      /^[\s》】\]]*([A-Za-z0-9]{4,8})[\s《【\[]*$/m
    ];
  
    const keywords = [
      '验证码', '验证', 'code', 'Code', 'CODE',
      '校验码', '动态码', '动态密码', '短信码'
    ];
  
    if (keywords.some(keyword => content.includes(keyword))) {
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) return match[1];
      }
    }
  
    return null;
  }
  
  // 修改提取验证链接的函数
  function extractVerificationLink(htmlContent) {
    if (!htmlContent) return null;
  
    const patterns = [
      // 现有的模式
      /<a[^>]*href=["']([^"']*(?:verify|confirm|activate|validation|auth)[^"']*)["'][^>]*>/i,
      /<a[^>]*href=["']([^"']*(?:token|reset|password)[^"']*)["'][^>]*>/i,
      /<a[^>]*href=["']([^"']*(?:login|signin|signup)[^"']*)["'][^>]*>/i,
      
      // 新增 magic link 相关模式
      /<a[^>]*href=["']([^"']*(?:magic[-]?link|passwordless|no[-]?password)[^"']*)["'][^>]*>/i,
      /<a[^>]*href=["']([^"']*(?:one[-]?time[-]?link|secure[-]?login)[^"']*)["'][^>]*>/i,
      
      // 备用模式：直接匹配完整URL中的相关参数
      /href=["']([^"']*[\?&](?:token|code|magic)=[^"'&]+)["']/i
    ];
  
    // 先检查链接文本中是否包含相关关键词
    const linkTextPattern = /<a[^>]*>([^<]*(?:magic\s*link|一键登录|安全登录|无密码登录)[^<]*)<\/a>/i;
    const linkTextMatch = htmlContent.match(linkTextPattern);
    if (linkTextMatch) {
      // 如果找到匹配的链接文本，提取对应的href
      const fullLinkPattern = new RegExp(`<a[^>]*href=["']([^"']*)["'][^>]*>${linkTextMatch[1]}</a>`, 'i');
      const fullMatch = htmlContent.match(fullLinkPattern);
      if (fullMatch && fullMatch[1]) {
        return fullMatch[1];
      }
    }
  
    // 如果通过链接文本没找到，则使用URL模式匹配
    for (const pattern of patterns) {
      const match = htmlContent.match(pattern);
      if (match && match[1]) {
        // 验证URL的有效性
        try {
          new URL(match[1]); // 尝试解析URL
          return match[1];
        } catch (e) {
          // 如果URL不完整，可能是相对路径，此时需要进一步处理
          if (match[1].startsWith('/')) {
            // 尝试从HTML中提取基础域名
            const baseMatch = htmlContent.match(/<base[^>]*href=["']([^"']*)["']/i);
            if (baseMatch && baseMatch[1]) {
              return new URL(match[1], baseMatch[1]).href;
            }
          }
        }
        return match[1];
      }
    }
  
    return null;
  }