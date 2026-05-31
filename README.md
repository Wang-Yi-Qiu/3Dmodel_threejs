# 3D 前端学习项目

这个项目现在是一个最小可运行的全栈练习：

- `frontend`：Vue + Vite + Three.js，负责在浏览器里渲染 3D 场景。
- `backend`：Node.js + Express + Mongoose，负责提供模型数据接口。
- `MongoDB`：保存模型列表。数据库没启动时，页面不会白屏，会显示备用模型和提示。

## 1. 先安装依赖

分别进入前端和后端目录安装依赖：

```bash
cd backend
pnpm install
```

这条命令的意思：

- `cd backend`：进入后端文件夹。
- `pnpm install`：读取 `backend/package.json`，把后端需要的库安装到 `node_modules`。

```bash
cd ../frontend
pnpm install
```

这条命令的意思：

- `cd ../frontend`：从 `backend` 回到上一级，再进入 `frontend`。
- `pnpm install`：读取 `frontend/package.json`，安装 Vue、Vite、Three.js 等前端库。

## 2. 启动 MongoDB

如果你的电脑还没有安装 MongoDB，可以参考 MongoDB 官方 macOS 安装文档：

https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-os-x/

常见 Homebrew 安装方式是：

```bash
brew tap mongodb/brew
brew install mongodb-community@8.0
brew services start mongodb-community@8.0
```

这几条命令的意思：

- `brew tap mongodb/brew`：告诉 Homebrew 去哪里找 MongoDB 官方维护的软件源。
- `brew install mongodb-community@8.0`：安装 MongoDB 8.0 社区版。
- `brew services start mongodb-community@8.0`：把 MongoDB 作为后台服务启动，这样后端才能连接数据库。

如果你已经安装过 MongoDB，只需要执行：

```bash
brew services start mongodb-community@8.0
```

## 3. 启动后端

打开一个终端窗口：

```bash
cd /Users/wangyiqiu/Desktop/programe/3D/backend
pnpm start
```

这条命令的意思：

- `cd .../backend`：进入后端目录。
- `pnpm start`：执行 `package.json` 里的 `"start": "node server.js"`。
- `node server.js`：让 Node.js 运行后端服务文件。

后端默认地址是：

```text
http://localhost:3000
```

可以检查接口：

```bash
curl http://localhost:3000/api/health
```

这条命令的意思：

- `curl`：在终端里请求一个网址。
- `/api/health`：后端健康检查接口，用来确认 API 和数据库状态。

## 4. 启动前端

再打开一个新的终端窗口：

```bash
cd /Users/wangyiqiu/Desktop/programe/3D/frontend
pnpm dev
```

这条命令的意思：

- `cd .../frontend`：进入前端目录。
- `pnpm dev`：执行 `package.json` 里的 `"dev": "vite"`。
- `vite`：启动前端开发服务器，支持保存代码后自动刷新页面。

浏览器打开：

```text
http://localhost:5173
```

## 5. 当前代码怎样工作

前端启动后会请求：

```text
/api/models
```

Vite 会根据 `frontend/vite.config.js` 里的代理配置，把这个请求转发到：

```text
http://localhost:3000/api/models
```

这样前端就不需要写死完整后端地址，也能避免开发时常见的跨域问题。

后端的模型数据结构在 `backend/server.js` 里：

```js
{
  name: String,
  description: String,
  type: 'box' | 'sphere' | 'torus' | 'cone' | 'gltf',
  color: String,
  url: String
}
```

你现在可以先学习 `box`、`sphere`、`torus`、`cone` 这种基础几何体。等基础跑通后，再把 `.glb` 或 `.gltf` 文件放进：

```text
backend/public/models
```

然后往数据库里保存一条：

```bash
curl -X POST http://localhost:3000/api/models \
  -H "Content-Type: application/json" \
  -d '{"name":"我的 GLB 模型","description":"从后端静态目录加载","type":"gltf","url":"http://localhost:3000/models/your-model.glb"}'
```

这条命令的意思：

- `curl -X POST`：用 POST 方法向后端新增一条数据。
- `-H "Content-Type: application/json"`：告诉后端，我发送的是 JSON 数据。
- `-d '...'`：真正发送给后端的数据内容。

发送的数据长这样：

```json
{
  "name": "我的 GLB 模型",
  "description": "从后端静态目录加载",
  "type": "gltf",
  "url": "http://localhost:3000/models/your-model.glb"
}
```

前端会用 Three.js 的 `GLTFLoader` 加载它。

## 6. 你接下来最适合学什么

建议学习顺序：

1. HTML、CSS、JavaScript 基础。
2. Vue 的组件、响应式数据、生命周期。
3. Three.js 的场景、相机、灯光、几何体、材质。
4. Express 的路由，也就是 `/api/models` 这种接口。
5. MongoDB 的集合、文档、增删改查。

先别急着做很复杂的模型编辑器。你现在的第一阶段目标是：能从 MongoDB 读出模型列表，点击列表后让前端切换不同的 3D 模型。
