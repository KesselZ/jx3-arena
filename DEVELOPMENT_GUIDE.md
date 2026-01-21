# 《拯救古之岚》开发规范与约定

本文档旨在统一项目结构、技术实现方案及代码风格，确保项目长期可维护性。

## 1. 目录结构公约 (Flat Structure)
项目采用**彻底扁平化**结构：
- **禁止嵌套**：`src/` 下的所有文件夹严禁再包含子文件夹（No sub-folders under src/*/）。
- **职责清晰**：所有文件必须直接存放在对应的功能一级目录下。

```text
src/
├── assets/          # 资产定义与加工逻辑 (assets.ts)
├── components/      # 复用表现组件 (Sprites.tsx)
├── entities/        # 实体工厂 (player.ts, enemy.ts)
├── game/            # 核心底座 (world.ts, config.ts)
├── systems/         # ECS 系统 (movementSystem.ts)
├── store/           # 全局状态 (useGameStore.ts)
├── views/           # 场景视图 (BattleView.tsx)
├── hooks/           # 自定义 Hooks
├── types/           # 类型定义
├── App.tsx
└── main.tsx
```

## 2. 资产管理公约 (Asset Pipeline)
- **单一事实来源**：所有精灵图行列坐标、锚点配置必须在 `src/assets/assets.ts` 的 `UNITS` 常量中声明。
- **资产即成品**：资产系统通过 `Assets.getTexture(unitId)` 输出已处理好的成品纹理（自动裁剪留白、对齐锚点）。
- **语义化调用**：禁止在业务组件中直接使用行列数字，必须通过 `unitId` 调用。
- **锚点策略**：
  - `bottom`: 角色、建筑（自动贴地）。
  - `center`: 飞行物、特效（居中对齐）。
  - `none`: UI图标、技能图标（原始切片）。

## 3. 表现与仿真分离 (View-Simulation Separation)
- **仿真层 (TS/ECS)**：负责物理计算、数值逻辑。不依赖任何 Three.js 或 React 渲染。
- **表现层 (R3F/React)**：负责将仿真层的数据可视化。通过 `useFrame` 同步实体的 `position` 到 `mesh`。

## 4. 技术架构方案 (原设计文档 5&6 提取)

### 核心技术栈
- **框架**：React 19 (使用 WOFF2 字体优化性能)
- **UI & 布局**：Tailwind CSS 3 + 像素武侠风格配置 (JX3色板)
- **渲染引擎**：
  - **React Three Fiber (R3F)**：负责 3D 场景、角色贴图、粒子效果渲染。
  - **Drei**：辅助 R3F 常用组件（相机、环境、加载管理）。
- **状态管理**：Zustand (管理角色属性、金钱、波次、场景阶段)。
- **核心逻辑**：Miniplex (ECS 实体组件系统)，处理大规模单位逻辑。

### 开发阶段规划
1. **基础环境搭建**：Vite + Tailwind + R3F 配置（已完成）。
2. **底层底座构建**：资产管理器、音效管理器、数值配置中心（进行中）。
3. **核心循环实现**：战斗场景 -> 30秒倒计时 -> 商店 -> 下一波。
4. **ECS 系统集成**：使用 Miniplex 管理玩家、敌人的实体逻辑（已开始）。
5. **资源加载**：整合 `public/assets` 图片资源至 `assets.ts`（进行中）。
6. **数值平衡与 UI 完善**。

## 5. UI 设计规范
- **字体优先级**：`Fusion Pixel` > `DotGothic16` > `Zpix`。
- **圆角约定**：像素风格微圆角 (`rounded-pixel-sm`: 2px, `rounded-pixel-md`: 4px)。
- **交互反馈**：所有交互元素需具备像素位移反馈（`hover` 向上浮动，`active` 按压位移）。
