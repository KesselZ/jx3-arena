import { create } from 'zustand'

import { UNITS } from '../data/units'
import { GAME_CONFIG } from '../data/config'

export type GamePhase = 'LOBBY' | 'CHARACTER_SELECT' | 'CUTSCENE' | 'BATTLE' | 'SHOP' | 'GAMEOVER'

export interface DialogueLine {
  speaker: string;
  content: string;
  avatar?: string;
}

interface GameState {
  phase: GamePhase
  theme: GameTheme
  wave: number
  gold: number
  selectedCharacter: string | null
  
  // 对话系统状态
  dialogueLines: DialogueLine[]
  currentDialogueIndex: number
  
  // 动作
  setPhase: (phase: GamePhase) => void
  setTheme: (theme: GameTheme) => void
  setSelectedCharacter: (unitId: string) => void
  nextWave: () => void
  addGold: (amount: number) => void

  // 对话动作
  startDialogue: (lines: DialogueLine[]) => void
  nextDialogue: () => void
  endDialogue: () => void
  
  // 声明式触发：根据触发点自动加载对话
  triggerDialogue: (triggerId: string) => void

  // 性能监测数据
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  logicTime: number
  memory: {
    geometries: number
    textures: number
  }
  perfMetrics?: {
    input: number,
    spawn: number,
    hash: number,
    ai: number,
    combat: number,
    projectile: number,
    movement: number,
    collision: number,
    vfx: number,
    total: number
  }
  // 观众席位坐标 (由视觉层 Stage 填充)
  arenaSeats: { x: number, y: number, z: number }[]
  setArenaSeats: (seats: { x: number, y: number, z: number }[]) => void
  updateStats: (stats: { 
    fps: number, 
    frameTime: number, 
    drawCalls: number, 
    triangles: number, 
    logicTime: number,
    memory: { geometries: number, textures: number },
    perfMetrics?: any
  }) => void
}

import { DIALOGUES } from '../data/dialogues'

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'LOBBY',
  theme: 'grassland',
  wave: 1,
  gold: 0,
  selectedCharacter: null,
  
  dialogueLines: [],
  currentDialogueIndex: 0,
  
  fps: 0,
  frameTime: 0,
  drawCalls: 0,
  triangles: 0,
  logicTime: 0,
  memory: { geometries: 0, textures: 0 },
  arenaSeats: [],

  setPhase: (phase) => set({ phase }),
  setTheme: (theme) => set({ theme }),
  setSelectedCharacter: (unitId) => set({ selectedCharacter: unitId }),
  nextWave: () => set((state) => ({ wave: state.wave + 1 })),
  addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
  setArenaSeats: (seats) => set({ arenaSeats: seats }),

  startDialogue: (lines) => set({ 
    phase: 'CUTSCENE', 
    dialogueLines: lines, 
    currentDialogueIndex: 0 
  }),
  
  nextDialogue: () => set((state) => {
    if (state.currentDialogueIndex < state.dialogueLines.length - 1) {
      return { currentDialogueIndex: state.currentDialogueIndex + 1 };
    } else {
      return { phase: 'BATTLE', dialogueLines: [], currentDialogueIndex: 0 };
    }
  }),

  endDialogue: () => set({ phase: 'BATTLE', dialogueLines: [], currentDialogueIndex: 0 }),

  triggerDialogue: (triggerId) => set((state) => {
    // 目前 triggerId 主要是角色 ID，未来可以扩展为 'WAVE_10' 等
    const lines = DIALOGUES[triggerId] || DIALOGUES.ARENA_START;
    return {
      phase: 'CUTSCENE',
      dialogueLines: lines,
      currentDialogueIndex: 0
    };
  }),

  updateStats: (stats) => set((state) => ({ ...state, ...stats })),
}))
