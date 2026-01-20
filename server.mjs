import path from 'path';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// AI 聊天功能所需的辅助函数
function analyzeIntent(message, context) {
  const lowerMessage = message.toLowerCase();
  
  // 时效性关键词 - 需要最新信息的问题
  const timeKeywords = [
    '最新', '今年', '2024', '2025', '即将', '上映', '新出',
    '什么时候', '何时', '几时', '播出', '更新', '下一季',
    '第二季', '第三季', '续集', '下季', '下部'
  ];
  const hasTimeKeyword = timeKeywords.some((k) => message.includes(k));
  
  // 推荐类关键词
  const recommendKeywords = ['推荐', '有什么', '好看', '值得', '介绍'];
  const isRecommendation = recommendKeywords.some((k) => message.includes(k));
  
  // 演员/导演关键词
  const personKeywords = ['演员', '导演', '主演', '出演', '作品'];
  const isPerson = personKeywords.some((k) => message.includes(k));
  
  // 剧情相关关键词
  const plotKeywords = ['讲什么', '剧情', '故事', '内容', '讲的是'];
  const isPlotQuery = plotKeywords.some((k) => message.includes(k));
  
  // 媒体类型判断
  let mediaType;
  if (message.includes('电影')) mediaType = 'movie';
  else if (message.includes('电视剧') || message.includes('剧集'))
    mediaType = 'tv';
  else if (message.includes('综艺')) mediaType = 'variety';
  else if (message.includes('动漫') || message.includes('动画'))
    mediaType = 'anime';
  else if (context?.type) mediaType = context.type;
  
  // 类型判断
  let type = 'general';
  if (isRecommendation) type = 'recommendation';
  else if (context?.title && (isPlotQuery || lowerMessage.includes('这部')))
    type = 'detail';
  else if (isPerson || hasTimeKeyword) type = 'query';
  
  // 决定是否需要各个数据源
  const needWebSearch = 
    hasTimeKeyword ||
    isPerson ||
    message.includes('新闻') ||
    (isRecommendation && hasTimeKeyword) || // 推荐+时效性
    type === 'query';
  const needDouban = 
    isRecommendation ||
    type === 'detail' ||
    (context?.douban_id !== undefined && context.douban_id > 0);
  const needTMDB = 
    type === 'detail' ||
    (context?.tmdb_id !== undefined && context.tmdb_id > 0);
  
  return {
    type,
    mediaType,
    needWebSearch,
    needDouban,
    needTMDB,
    keywords: timeKeywords.filter((k) => message.includes(k)),
    entities: extractEntities(message),
  };
}

function extractEntities(message) {
  const entities = [];
  
  // 简单的人名匹配（中文2-4字）
  const personPattern = /([一-龥]{2,4})(的|是|演|导)/g;
  let match;
  while ((match = personPattern.exec(message)) !== null) {
    entities.push({ type: 'person', value: match[1] });
  }
  
  return entities;
}

// 格式化搜索结果
function formatSearchResults(results, provider) {
  if (!results) return '';
  
  try {
    if (provider === 'tavily' && results.results) {
      return results.results
        .map(
          (r) => `
标题: ${r.title}
内容: ${r.content}
来源: ${r.url}
`
        )
        .join('\n');
    } else if (provider === 'serper' && results.organic) {
      return results.organic
        .map(
          (r) => `
标题: ${r.title}
摘要: ${r.snippet}
来源: ${r.link}
`
        )
        .join('\n');
    }
  } catch (error) {
    console.error('Format search results error:', error);
  }
  
  return '';
}

// 获取豆瓣数据
async function fetchDoubanData(params) {
  try {
    // 通过 ID 获取详情
    if (params.id) {
      const url = `https://m.douban.com/rexxar/api/v2/subject/${params.id}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response.data;
    }
    
    // 通过搜索查询
    if (params.query) {
      const kind = params.kind || 'movie';
      const url = `https://movie.douban.com/j/search_subjects?type=${kind}&tag=${encodeURIComponent(params.query)}&sort=recommend&page_limit=20&page_start=0`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response.data;
    }
  } catch (error) {
    console.error('获取豆瓣数据失败:', error);
    return null;
  }
}

// AI 聊天功能主函数
async function handleAIChat(message, context) {
  // 分析用户意图
  const intent = analyzeIntent(message, context);
  console.log('AI 意图分析结果:', intent);
  
  // 构建系统提示词
  let systemPrompt = `你是 LibreTV 的 AI 影视助手，专门帮助用户发现和了解影视内容。

## 你的能力
- 提供影视推荐
- 回答影视相关问题（剧情、演员、评分等）
- 搜索最新影视资讯

## 回复要求
1. 语言风格：友好、专业、简洁
2. 信息来源：优先使用提供的数据，诚实告知数据不足
3. 推荐理由：说明为什么值得看，包括评分、类型、特色等
4. 格式清晰：使用分段、列表等让内容易读

`;
  
  // 获取豆瓣数据
  if (intent.needDouban) {
    let doubanData;
    if (context?.douban_id) {
      doubanData = await fetchDoubanData({ id: context.douban_id });
    } else {
      doubanData = await fetchDoubanData({ query: message });
    }
    
    if (doubanData) {
      systemPrompt += `\n## 【豆瓣数据】\n`;
      if (doubanData.list || doubanData.subjects) {
        const items = doubanData.list || doubanData.subjects;
        systemPrompt += `推荐列表（${items.length}部）:\n${JSON.stringify(
          items.slice(0, 5).map((item) => ({
            title: item.title || item.subject?.title,
            rating: item.rating?.value || item.subject?.rating?.value,
            year: item.year || item.subject?.year,
            genres: item.genres || item.subject?.genres,
          })),
          null,
          2
        )}\n`;
      } else {
        systemPrompt += JSON.stringify(
          {
            title: doubanData.title,
            rating: doubanData.rating,
            year: doubanData.year,
            genres: doubanData.genres,
            directors: doubanData.directors,
            actors: doubanData.actors,
            intro: doubanData.intro,
          },
          null,
          2
        );
        systemPrompt += '\n';
      }
    }
  }
  
  // 调用外部 AI 服务
  const aiApiKey = process.env.AI_API_KEY || '';
  const aiBaseURL = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const aiModel = process.env.AI_MODEL || 'gpt-3.5-turbo';
  
  if (!aiApiKey) {
    return {
      text: 'AI 服务未配置，请联系管理员设置 AI_API_KEY 环境变量。\n\n你可以尝试直接搜索你想看的内容。'
    };
  }
  
  try {
    const response = await axios.post(`${aiBaseURL}/chat/completions`, {
      model: aiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`
      }
    });
    
    return {
      text: response.data.choices[0].message.content
    };
  } catch (error) {
    console.error('AI 聊天请求失败:', error);
    return {
      text: 'AI 服务暂时不可用，请稍后重试或直接搜索你想看的内容。'
    };
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  port: process.env.PORT || 8080,
  password: process.env.PASSWORD || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  timeout: parseInt(process.env.REQUEST_TIMEOUT || '5000'),
  maxRetries: parseInt(process.env.MAX_RETRIES || '2'),
  cacheMaxAge: process.env.CACHE_MAX_AGE || '1d',
  userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  debug: process.env.DEBUG === 'true'
};

const log = (...args) => {
  if (config.debug) {
    console.log('[DEBUG]', ...args);
  }
};

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

function sha256Hash(input) {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha256');
    hash.update(input);
    resolve(hash.digest('hex'));
  });
}

async function renderPage(filePath, password) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (password !== '') {
    const sha256 = await sha256Hash(password);
    content = content.replace('{{PASSWORD}}', sha256);
  } else {
    content = content.replace('{{PASSWORD}}', '');
  }
  return content;
}

app.get(['/', '/index.html', '/player.html'], async (req, res) => {
  try {
    let filePath;
    switch (req.path) {
      case '/player.html':
        filePath = path.join(__dirname, 'player.html');
        break;
      default: // '/' 和 '/index.html'
        filePath = path.join(__dirname, 'index.html');
        break;
    }
    
    const content = await renderPage(filePath, config.password);
    res.send(content);
  } catch (error) {
    console.error('页面渲染错误:', error);
    res.status(500).send('读取静态页面失败');
  }
});

app.get('/s=:keyword', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'index.html');
    const content = await renderPage(filePath, config.password);
    res.send(content);
  } catch (error) {
    console.error('搜索页面渲染错误:', error);
    res.status(500).send('读取静态页面失败');
  }
});

function isValidUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    const allowedProtocols = ['http:', 'https:'];
    
    // 从环境变量获取阻止的主机名列表
    const blockedHostnames = (process.env.BLOCKED_HOSTS || 'localhost,127.0.0.1,0.0.0.0,::1').split(',');
    
    // 从环境变量获取阻止的 IP 前缀
    const blockedPrefixes = (process.env.BLOCKED_IP_PREFIXES || '192.168.,10.,172.').split(',');
    
    if (!allowedProtocols.includes(parsed.protocol)) return false;
    if (blockedHostnames.includes(parsed.hostname)) return false;
    
    for (const prefix of blockedPrefixes) {
      if (parsed.hostname.startsWith(prefix)) return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// 验证代理请求的鉴权
function validateProxyAuth(req) {
  const authHash = req.query.auth;
  const timestamp = req.query.t;
  
  // 获取服务器端密码哈希
  const serverPassword = config.password;
  if (!serverPassword) {
    console.error('服务器未设置 PASSWORD 环境变量，代理访问被拒绝');
    return false;
  }
  
  // 使用 crypto 模块计算 SHA-256 哈希
  const serverPasswordHash = crypto.createHash('sha256').update(serverPassword).digest('hex');
  
  if (!authHash || authHash !== serverPasswordHash) {
    console.warn('代理请求鉴权失败：密码哈希不匹配');
    console.warn(`期望: ${serverPasswordHash}, 收到: ${authHash}`);
    return false;
  }
  
  // 验证时间戳（10分钟有效期）
  if (timestamp) {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10分钟
    if (now - parseInt(timestamp) > maxAge) {
      console.warn('代理请求鉴权失败：时间戳过期');
      return false;
    }
  }
  
  return true;
}

app.get('/proxy/:encodedUrl', async (req, res) => {
  try {
    // 验证鉴权
    if (!validateProxyAuth(req)) {
      return res.status(401).json({
        success: false,
        error: '代理访问未授权：请检查密码配置或鉴权参数'
      });
    }

    const encodedUrl = req.params.encodedUrl;
    const targetUrl = decodeURIComponent(encodedUrl);

    // 安全验证
    if (!isValidUrl(targetUrl)) {
      return res.status(400).send('无效的 URL');
    }

    log(`代理请求: ${targetUrl}`);

    // 添加请求超时和重试逻辑
    const maxRetries = config.maxRetries;
    let retries = 0;
    
    const makeRequest = async () => {
      try {
        return await axios({
          method: 'get',
          url: targetUrl,
          responseType: 'stream',
          timeout: config.timeout,
          headers: {
            'User-Agent': config.userAgent
          }
        });
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          log(`重试请求 (${retries}/${maxRetries}): ${targetUrl}`);
          return makeRequest();
        }
        throw error;
      }
    };

    const response = await makeRequest();

    // 转发响应头（过滤敏感头）
    const headers = { ...response.headers };
    const sensitiveHeaders = (
      process.env.FILTERED_HEADERS || 
      'content-security-policy,cookie,set-cookie,x-frame-options,access-control-allow-origin'
    ).split(',');
    
    sensitiveHeaders.forEach(header => delete headers[header]);
    res.set(headers);

    // 管道传输响应流
    response.data.pipe(res);
  } catch (error) {
    console.error('代理请求错误:', error.message);
    if (error.response) {
      res.status(error.response.status || 500);
      error.response.data.pipe(res);
    } else {
      res.status(500).send(`请求失败: ${error.message}`);
    }
  }
});

// AI 聊天 API
app.post('/api/ai/chat', async (req, res) => {
  try {
    // 解析请求体
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const { message, context = {} } = JSON.parse(body);
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '消息不能为空' });
    }
    
    // 调用 AI 聊天处理函数
    const result = await handleAIChat(message, context);
    
    res.json(result);
  } catch (error) {
    console.error('AI 聊天请求错误:', error);
    res.status(500).json({ error: 'AI 聊天请求失败', details: error.message });
  }
});

// AI 聊天 GET 端点（兼容某些客户端）
app.get('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.query;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '消息不能为空' });
    }
    
    // 调用 AI 聊天处理函数
    const result = await handleAIChat(message, {});
    
    res.json(result);
  } catch (error) {
    console.error('AI 聊天请求错误:', error);
    res.status(500).json({ error: 'AI 聊天请求失败', details: error.message });
  }
});

app.use(express.static(path.join(__dirname), {
  maxAge: config.cacheMaxAge
}));

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).send('服务器内部错误');
});

app.use((req, res) => {
  res.status(404).send('页面未找到');
});

// 启动服务器
app.listen(config.port, () => {
  console.log(`服务器运行在 http://localhost:${config.port}`);
  if (config.password !== '') {
    console.log('用户登录密码已设置');
  } else {
    console.log('警告: 未设置 PASSWORD 环境变量，用户将被要求设置密码');
  }
  if (config.debug) {
    console.log('调试模式已启用');
    console.log('配置:', { ...config, password: config.password ? '******' : '' });
  }
});
