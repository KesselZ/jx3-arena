import { create } from 'zustand'

import { UNITS } from '../assets/assets'
import { GAME_CONFIG } from '../game/config'

export type GamePhase = 'LOBBY' | 'CHARACTER_SELECT' | 'BATTLE' | 'SHOP' | 'GAMEOVER'
export type GameTheme = keyof typeof GAME_CONFIG.THEMES

interface GameState {
  phase: GamePhase
  theme: GameTheme
  wave: number
  gold: number
  selectedCharacter: keyof typeof UNITS | null
  
  // 动作
  setPhase: (phase: GamePhase) => void
  setTheme: (theme: GameTheme) => void
  setSelectedCharacter: (unitId: keyof typeof UNITS) => void
  nextWave: () => void
  addGold: (amount: number) => void

  // 性能监测数据
  fps: number
  frameTime: number
  updateStats: (fps: number, frameTime: number) => void
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'LOBBY',
  theme: 'grassland',
  wave: 1,
  gold: 0,
  selectedCharacter: null,
  
  fps: 0,
  frameTime: 0,

  setPhase: (phase) => set({ phase }),
  setTheme: (theme) => set({ theme }),
  setSelectedCharacter: (unitId) => set({ selectedCharacter: unitId }),
  nextWave: () => set((state) => ({ wave: state.wave + 1 })),
  addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
  updateStats: (fps, frameTime) => set({ fps, frameTime }),
}))
