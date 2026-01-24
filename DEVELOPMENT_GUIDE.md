# 《拯救古之岚》开发规范与约定

本文档旨在统一项目结构、技术实现方案及代码风格，确保项目长期可维护性。

## 1. 目录结构公约 (Modular Structure)
项目采用**模块化功能分层**结构，src 目录下按职责划分为核心引擎、业务逻辑、UI 表现等模块：

```text
src/
├── assets/          # 资产定义与静态数据映射 (assets.ts)
├── data/            # 游戏数值配置与基础信息 (units.ts, config.ts)
├── engine/          # 核心底层引擎 (ECS 调度、物理、空间索引、相机控制)
│   └── camera/      # 相机系统实现
├── entities/        # 实体工厂与逻辑定义 (player.ts, npc.ts)
├── systems/         # ECS 逻辑系统 (AI、碰撞、战斗、移动、弹道等)
├── scenes/          # R3F 场景组织 (BattleWorld.tsx, Stage.tsx)
├── ui/              # React UI 组件 (HUD、菜单、角色选择)
├── vfx/             # 视觉特效管理 (VFXLibrary, VFXManager)
├── store/           # 全局状态管理 (Zustand)
├── hooks/           # 通用 React Hooks
├── styles/          # 全局样式与光标定义
├── App.tsx          # 顶层入口
└── main.tsx         # 渲染挂载点
```

## 2. 资产管理公约 (Asset Pipeline)
- **单一事实来源**：所有精灵图行列坐标、锚点配置必须在 `src/data/units.ts` 的 `UNITS` 常量中声明。
- **资产即成品**：资产系统通过 `Assets.getTexture(unitId)` 输出已处理好的成品纹理（自动裁剪留白、对齐锚点）。
- **语义化调用**：禁止在业务组件中直接使用行列数字，必须通过 `unitId` 调用。
- **锚点策略**：
  - `bottom`: 角色、建筑（自动贴地）。
  - `center`: 飞行物、特效（居中对齐）。
  - `none`: UI图标、技能图标（原始切片）。

## 3. 仿真与表现分离 (Simulation-View Separation)
- **仿真层 (ECS/TS)**：位于 `src/engine` 和 `src/systems`。负责物理计算、数值逻辑、AI 决策。不依赖 R3F 渲染，运行在 `useBattleSystems` 的主循环中。
- **表现层 (R3F/React)**：位于 `src/scenes` 和 `src/vfx`。负责将仿真层的数据可视化。通过 `useFrame` 或组件生命周期同步实体的 `position` 到 `mesh` 或 `sprite`。

## 4. 技术架构方案

### 核心技术栈
- **框架**：React 19 (使用 WOFF2 字体优化性能)
- **UI & 布局**：Tailwind CSS 3 + 像素武侠风格配置 (JX3色板)
- **渲染引擎**：
  - **React Three Fiber (R3F)**：负责 3D 环境、2D 精灵贴图、粒子效果渲染。
  - **Drei**：辅助 R3F 常用组件（相机、环境、加载管理）。
- **状态管理**：Zustand (管理角色属性、金钱、波次、场景阶段)。
- **核心逻辑**：Miniplex (ECS 实体组件系统)，处理大规模单位逻辑。
- **空间索引**：Spatial Hash (用于高性能碰撞检测与目标搜索)。

### ECS 核心公约
- **实体定义**：统一在 `src/engine/ecs.ts` 中定义 `Entity` 类型及组件属性。
- **系统职责**：每个系统（System）应专注于单一逻辑（如 `movementSystem` 只处理位移），通过 `queries` 过滤目标实体。
- **性能优化**：使用 `entityMap` 进行 O(1) 查找，避免在循环中使用 `find`。

## 5. UI 与视觉规范
- **字体优先级**：`Fusion Pixel` > `DotGothic16` > `Zpix`。
- **交互反馈**：所有交互元素需具备像素位移反馈（`hover` 向上浮动，`active` 按压位移）。
- **特效管理**：通过 `VFXManager` 统一调度 `VFXLibrary` 中的预设效果，避免在业务代码中散乱创建 Mesh。
