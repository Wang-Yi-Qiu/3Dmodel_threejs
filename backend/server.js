import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = Number(process.env.PORT || 3000)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/three_demo'

app.use(cors())
app.use(express.json())
app.use('/models', express.static(path.join(__dirname, 'public/models')))

const modelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['box', 'sphere', 'torus', 'gltf', 'cone'],
      default: 'box',
    },
    color: { type: String, default: '#4f8cff' },
    url: { type: String, default: '' },
  },
  { timestamps: true },
)

const ModelItem = mongoose.model('ModelItem', modelSchema)

const defaultModels = [
  {
    name: '蓝色立方体',
    description: '数据库还没有模型时自动创建的练习数据。',
    type: 'box',
    color: '#4f8cff',
  },
  {
    name: '绿色球体',
    description: '用 Three.js 的 SphereGeometry 生成。',
    type: 'sphere',
    color: '#30c48d',
  },
  {
    name: '橙色圆环',
    description: '用 Three.js 的 TorusGeometry 生成。',
    type: 'torus',
    color: '#f59f00',
  },
  {
    name: '紫色圆锥',
    description: '我自己新增的 3D 图形。',
    type: 'cone',
    color: '#a855f7',
  },
]

async function seedDefaultModels() {
  const legacyPurpleTorus = await ModelItem.findOne({
    name: '紫色圆环',
    type: 'torus',
    color: '#a855f7',
  })

  if (legacyPurpleTorus) {
    legacyPurpleTorus.name = '紫色圆锥'
    legacyPurpleTorus.type = 'cone'
    await legacyPurpleTorus.save()
    console.log('已把旧的紫色圆环数据更新为紫色圆锥')
  }

  let insertedCount = 0

  for (const model of defaultModels) {
    const exists = await ModelItem.exists({ name: model.name })

    if (!exists) {
      await ModelItem.create(model)
      insertedCount += 1
    }
  }

  if (insertedCount > 0) {
    console.log(`已补充 ${insertedCount} 条默认 3D 模型数据`)
  }
}

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 3000,
  })
  .then(async () => {
    console.log(`MongoDB 已连接：${MONGODB_URI}`)
    await seedDefaultModels()
  })
  .catch((error) => {
    console.error('MongoDB 连接失败，请确认数据库是否启动：', error.message)
  })

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

app.get('/api/models', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'MongoDB 还没有连接成功，请先启动 MongoDB。',
      fallback: defaultModels,
    })
  }

  const models = await ModelItem.find().sort({ createdAt: 1 })
  res.json(models)
})

app.post('/api/models', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'MongoDB 还没有连接成功，暂时不能写入数据。' })
  }

  const model = await ModelItem.create(req.body)
  res.status(201).json(model)
})

app.delete('/api/models/:id', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'MongoDB 还没有连接成功，暂时不能删除数据。' })
  }

  await ModelItem.findByIdAndDelete(req.params.id)
  res.status(204).end()
})

app.listen(PORT, () => {
  console.log(`后端服务已启动：http://localhost:${PORT}`)
})
