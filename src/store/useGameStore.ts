import { create } from 'zustand'

import { UNITS } from '../data/units'
import { GAME_CONFIG } from '../game/config'

export type GamePhase = 'LOBBY' | 'CHARACTER_SELECT' | 'BATTLE' | 'SHOP' | 'GAMEOVER'
export type GameTheme = keyof typeof GAME_CONFIG.THEMES

interface GameState {
  phase: GamePhase
  theme: GameTheme
  wave: number
  gold: number
  selectedCharacter: string | null
  
  // 动作
  setPhase: (phase: GamePhase) => void
  setTheme: (theme: GameTheme) => void
  setSelectedCharacter: (unitId: string) => void
  nextWave: () => void
  addGold: (amount: number) => void

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

export const useGameStore = create<GameState>((set) => ({
  phase: 'LOBBY',
  theme: 'grassland',
  wave: 1,
  gold: 0,
  selectedCharacter: null,
  
  fps: 0,
  frameTime: 0,
  drawCalls: 0,
  triangles: 0,
  logicTime: 0,
  memory: { geometries: 0, textures: 0 },

  setPhase: (phase) => set({ phase }),
  setTheme: (theme) => set({ theme }),
  setSelectedCharacter: (unitId) => set({ selectedCharacter: unitId }),
  nextWave: () => set((state) => ({ wave: state.wave + 1 })),
  addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
  updateStats: (stats) => set((state) => ({ ...state, ...stats })),
}))
