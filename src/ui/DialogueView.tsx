import React from 'react';
import { useGameStore } from '../store/useGameStore';

export const DialogueView: React.FC = () => {
  const { dialogueLines, currentDialogueIndex, nextDialogue } = useGameStore();
  const currentLine = dialogueLines[currentDialogueIndex];

  if (!currentLine) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 h-64 z-[1000] flex justify-center items-end pb-12 px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
      {/* 底部大背景遮罩 - 增加沉浸感 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* 对话框主体 */}
      <div className="relative w-full max-w-5xl bg-[#1a1a1a]/90 border-t-4 border-b-4 border-[#e6b31e]/50 backdrop-blur-md p-8 shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
        {/* 装饰性像素边角 */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#e6b31e]" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#e6b31e]" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#e6b31e]" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#e6b31e]" />

        {/* 角色名称标签 - 悬浮式 */}
        <div className="absolute -top-10 left-8">
          <div className="bg-[#e6b31e] px-8 py-2 skew-x-[-12deg] border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
            <span className="text-black font-black text-xl tracking-tighter skew-x-[12deg] block">
              {currentLine.speaker}
            </span>
          </div>
        </div>

        {/* 对话内容区 */}
        <div className="flex flex-col h-full justify-between gap-4">
          <div className="text-jx3-paper/90 text-2xl font-medium leading-relaxed tracking-wide h-24 overflow-y-auto custom-scrollbar pr-4">
            {currentLine.content}
          </div>

          {/* 下一步按钮 - 更加醒目 */}
          <div className="flex justify-end">
            <button
              onClick={nextDialogue}
              className="group relative px-10 py-3 bg-[#e6b31e] hover:bg-white transition-all border-2 border-black shadow-[6px_6px_0_0_rgba(0,0,0,0.8)] active:translate-y-1 active:shadow-none"
            >
              <span className="text-black font-black text-lg tracking-widest uppercase">
                {currentDialogueIndex === dialogueLines.length - 1 ? '开启征程' : '继续对话'}
              </span>
              <span className="inline-block ml-3 animate-bounce">▼</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
