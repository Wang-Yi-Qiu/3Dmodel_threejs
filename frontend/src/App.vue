<template>
  <main class="app-shell">
    <section class="viewer-panel">
      <canvas ref="canvasRef" class="viewer-canvas" />
      <div class="viewer-status">
        <span :class="['status-dot', health.database === 'connected' ? 'is-online' : '']" />
        <span>API: {{ health.api }}</span>
        <span>MongoDB: {{ health.database }}</span>
      </div>
    </section>

    <aside class="side-panel">
      <div>
        <p class="eyebrow">Vue + Three.js + MongoDB</p>
        <h1>3D 模型学习项目</h1>
        <p class="intro">
          左侧是真正的 WebGL 3D 画布。下面的列表来自后端接口，数据库启动后会从
          MongoDB 读取数据。
        </p>
      </div>

      <div v-if="errorMessage" class="notice">
        {{ errorMessage }}
      </div>

      <div class="model-list" aria-label="模型列表">
        <button
          v-for="model in models"
          :key="model._id || model.name"
          class="model-button"
          :class="{ active: selectedModel?.name === model.name }"
          type="button"
          @click="selectModel(model)"
        >
          <span class="model-color" :style="{ backgroundColor: model.color || '#4f8cff' }" />
          <span>
            <strong>{{ model.name }}</strong>
            <small>{{ model.description || model.type }}</small>
          </span>
        </button>
      </div>
    </aside>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const canvasRef = ref(null)
const models = ref([])
const selectedModel = ref(null)
const errorMessage = ref('')
const health = ref({
  api: 'checking',
  database: 'checking',
})

let renderer
let scene
let camera
let controls
let currentObject
let animationFrameId

const fallbackModels = [
  {
    name: '本地蓝色立方体',
    description: '后端没有连接时，前端临时显示的模型。',
    type: 'box',
    color: '#4f8cff',
  },
  {
    name: '本地绿色球体',
    description: '用来确认 Three.js 渲染正常。',
    type: 'sphere',
    color: '#30c48d',
  },
  {
    name: '本地紫色圆锥',
    description: '后端不可用时也能测试 ConeGeometry。',
    type: 'cone',
    color: '#a855f7',
  },
]

onMounted(async () => {
  createScene()
  await loadHealth()
  await loadModels()
  window.addEventListener('resize', resizeRenderer)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeRenderer)
  cancelAnimationFrame(animationFrameId)
  controls?.dispose()
  renderer?.dispose()
})

async function loadHealth() {
  try {
    const response = await fetch('/api/health')
    const data = await response.json()
    health.value = {
      api: data.ok ? 'online' : 'offline',
      database: data.database,
    }
  } catch (error) {
    health.value = {
      api: 'offline',
      database: 'unknown',
    }
  }
}

async function loadModels() {
  try {
    const response = await fetch('/api/models')
    const data = await response.json()

    if (!response.ok) {
      if (Array.isArray(data.fallback) && data.fallback.length > 0) {
        errorMessage.value = `${data.message} 现在先使用后端备用模型。`
        models.value = data.fallback
        selectModel(data.fallback[0])
        return
      }

      throw new Error(data.message || '模型接口请求失败')
    }

    models.value = data
    selectModel(data[0])
  } catch (error) {
    errorMessage.value = `${error.message} 现在先使用前端备用模型。`
    models.value = fallbackModels
    selectModel(fallbackModels[0])
  }
}

function createScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#111827')

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(3, 2.2, 4)

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  //鼠标控制
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  //环境光和方向光
  const ambientLight = new THREE.AmbientLight('#ffffff', 1.7)
  const directionalLight = new THREE.DirectionalLight('#ffffff', 2.5)
  directionalLight.position.set(4, 5, 3)

  const grid = new THREE.GridHelper(8, 8, '#4b5563', '#293241')
  scene.add(ambientLight, directionalLight, grid)

  resizeRenderer()
  animate()
}
//选择模型，加载 gltf 模型或创建基本几何体
function selectModel(model) {
  if (!model) return

  selectedModel.value = model
  removeCurrentObject()

  if (model.type === 'gltf' && model.url) {
    loadGltfModel(model)
    return
  }
  // 没有 url 或 type 不是 gltf，就创建基本几何体
  currentObject = createPrimitive(model)
  scene.add(currentObject)
}
//根据模型类型创建基本几何体
function createPrimitive(model) {
  const material = new THREE.MeshStandardMaterial({
    color: model.color || '#4f8cff',
    metalness: 0.25,
    roughness: 0.45,
  })

  if (model.type === 'sphere') {
    return new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 32), material)
  }

  if (model.type === 'torus') {
    return new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.25, 48, 96), material)
  }
  if (model.type === 'cone') {
    return new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 48), material)
  }

  return new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), material)
}

function loadGltfModel(model) {
  const loader = new GLTFLoader()

  loader.load(
    model.url,
    (gltf) => {
      currentObject = gltf.scene
      currentObject.scale.setScalar(1)
      scene.add(currentObject)
    },
    undefined,
    () => {
      errorMessage.value = `${model.name} 文件加载失败，请检查 url 是否正确。`
      currentObject = createPrimitive({ ...model, type: 'box' })
      scene.add(currentObject)
    },
  )
}

function removeCurrentObject() {
  if (!currentObject) return

  scene.remove(currentObject)
  currentObject.traverse?.((child) => {
    child.geometry?.dispose?.()
    child.material?.dispose?.()
  })
  currentObject = null
}

function resizeRenderer() {
  const canvas = canvasRef.value
  const width = canvas.clientWidth
  const height = canvas.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
}
//动画循环，旋转当前模型并渲染场景
function animate() {
  animationFrameId = requestAnimationFrame(animate)

  if (currentObject) {
    currentObject.rotation.y += 0.005
  }

  controls.update()//更新鼠标控制
  renderer.render(scene, camera)//把场景和相机传给渲染器进行渲染
}
</script>
