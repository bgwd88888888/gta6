# 部署规划

## 首版部署

当前项目可以静态部署，不需要持续运行 Node.js 服务。建议先用 Vercel 发布试玩，正式发布时根据目标用户地区实测选择托管和 CDN。

| 配置 | 值 |
| --- | --- |
| 框架预设 | Vite |
| Node.js | 24.x |
| 安装命令 | npm ci |
| 构建命令 | npm run build |
| 输出目录 | dist |
| 环境变量 | 首版无需配置 |

代码上传 Git 仓库后，在托管平台导入仓库并设置上述字段，先检查预览链接，再发布生产版本并绑定域名。本轮仅准备工程和部署说明，没有创建远程仓库或发布公网网站。

Vercel 支持 Vite，不要求使用 Next.js。也可以将 `dist/` 发布到其他静态托管平台或自己的 Nginx 服务。不要用 `vite dev` 或 `vite preview` 作为生产服务器。

## 发布前检查

1. `npm ci`、`npm test`、`npm run build` 成功。
2. 本地 `npm run preview` 检查构建版本，不能只看开发服务器。
3. 确认模型/纹理/WASM/脚本请求成功，加载界面能进入游戏。
4. 实测首次加载、页面刷新、键盘操作、暂停、任务送达和存档恢复。
5. 使用 HTTPS；检查桌面 Chrome/Edge，后续补充其他浏览器。
6. 将预览与生产区分开，保留上一版本以便回滚。

当前应用只有首页，无客户端路由。如果未来加入路径路由，再配置对应静态回退。子目录部署需配置 Vite `base` 并检查资源路径。

## 资源与费用

原型的程序化场景可以随代码一起发布。未来的 GLB、纹理和音效增大后，可拆到对象存储与 CDN，按用户地区实测下载速度和可用性，再选供应商。

托管限制和计费以发布时官方规则为准。比如 Cloudflare Pages 当前单文件上限为 25 MiB，更大资源可放在 R2 等存储上。重点观察首次下载大小、缓存命中率、请求次数和出站流量，不能仅按网页数量估算成本。

## 后续服务

- 账号与云存档：加入身份认证、受保护 API 和数据库，游戏客户端保持独立。
- 排行榜：加入服务端校验；不能直接信任本地存档或客户端提交的奖励。
- Next.js：需要官网、账号中心或同仓库服务端接口时再评估。云存档本身不强制要求它。
- 多人联机：需要专门的实时游戏服务器，不能直接依赖静态托管或普通请求式接口。

## 官方参考

- [Vite 静态部署](https://vite.dev/guide/static-deploy)
- [Vercel 部署 Vite](https://vercel.com/docs/frameworks/frontend/vite)
- [Cloudflare Pages 限制](https://developers.cloudflare.com/pages/platform/limits/)
- [Next.js 部署方式](https://nextjs.org/docs/app/getting-started/deploying)
