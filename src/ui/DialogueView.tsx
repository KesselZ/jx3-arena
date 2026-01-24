import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { AudioAssets } from '../assets/audioAssets';

/**
 * 简单的富文本解析函数
 * 支持格式: {文本|颜色类名} 
 * 例如: "欢迎来到{大唐竞技场|text-jx3-gold}"
 */
const parseRichText = (text: string, visibleCount: number) => {
  const parts = [];
  let currentCount = 0;
  
  // 正则匹配 {text|color} 格式
  const regex = /\{([^|]+)\|([^}]+)\}|([^{]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (currentCount >= visibleCount) break;

    if (match[3]) { // 普通文本
      const content = match[3];
      const remaining = visibleCount - currentCount;
      parts.push(<span key={parts.length}>{content.slice(0, remaining)}</span>);
      currentCount += Math.min(content.length, remaining);
    } else { // 带颜色的文本
      const content = match[1];
      const colorClass = match[2];
      const remaining = visibleCount - currentCount;
      parts.push(
        <span key={parts.length} className={colorClass}>
          {content.slice(0, remaining)}
        </span>
      );
      currentCount += Math.min(content.length, remaining);
    }
  }
  return parts;
};

// 获取纯文本长度（用于打字机计算）
const getPlainTextLength = (text: string) => {
  return text.replace(/\{([^|]+)\|[^}]+\}/g, '$1').length;
};

export const DialogueView: React.FC = () => {
  const { dialogueLines, currentDialogueIndex, nextDialogue } = useGameStore();
  const currentLine = dialogueLines[currentDialogueIndex];

  const [visibleChars, setVisibleChars] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<any>(null);
  
  const rawText = currentLine?.content || '';
  const plainTextLength = getPlainTextLength(rawText);

  useEffect(() => {
    if (!currentLine) return;

    setVisibleChars(0);
    setIsTyping(true);
    let count = 0;

    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    typingTimerRef.current = setInterval(() => {
      if (count < plainTextLength) {
        count++;
        setVisibleChars(count);
        AudioAssets.play2D('TYPEWRITER', 0.4);
      } else {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setIsTyping(false);
      }
    }, 40);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [currentLine, plainTextLength]);

  if (!currentLine) return null;

  const hasSpeakerPic = !!currentLine.speakerPic;

  const handleBoxClick = () => {
    if (isTyping) {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setVisibleChars(plainTextLength);
      setIsTyping(false);
    } else {
      nextDialogue();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center pb-16 px-8 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

      <div className="relative w-full max-w-7xl flex items-end pointer-events-auto">
        {hasSpeakerPic && (
          <div className="absolute left-0 bottom-0 z-30 w-[32%] h-[720px] pointer-events-none animate-in fade-in slide-in-from-left-12 duration-700 ease-out">
            <img src={currentLine.speakerPic} alt={currentLine.speaker} className="w-full h-full object-contain object-bottom drop-shadow-[20px_0_40px_rgba(0,0,0,0.6)]" />
          </div>
        )}

        <div onClick={handleBoxClick} className="relative z-10 w-full bg-[#0a0a0a]/90 border-[2px] border-[#e6b31e]/20 backdrop-blur-2xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-visible cursor-pointer group/box transition-all duration-300 hover:border-[#e6b31e]/40">
          <div className="absolute inset-0 bg-[#e6b31e]/5 opacity-0 group-hover/box:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e6b31e]/20 to-transparent" />
          
          <div className="absolute -top-[2px] -left-[2px] w-10 h-10 border-t-[3px] border-l-[3px] border-[#e6b31e]/50" />
          <div className="absolute -top-[2px] -right-[2px] w-10 h-10 border-t-[3px] border-r-[3px] border-[#e6b31e]/50" />
          <div className="absolute -bottom-[2px] -left-[2px] w-10 h-10 border-b-[3px] border-l-[3px] border-[#e6b31e]/50" />
          <div className="absolute -bottom-[2px] -right-[2px] w-10 h-10 border-b-[3px] border-r-[3px] border-[#e6b31e]/50" />

          <div className={`absolute -top-8 ${hasSpeakerPic ? 'left-[32%]' : 'left-12'} transition-all duration-500 z-40`}>
            <div className="relative">
              <div className="absolute inset-0 bg-black/60 skew-x-[-15deg] translate-x-1 translate-y-1 blur-sm" />
              <div className="relative bg-[#e6b31e] px-10 py-2 skew-x-[-15deg] border-[2px] border-black/30 shadow-xl">
                <span className="text-black font-black text-xl tracking-[0.2em] skew-x-[15deg] block">{currentLine.speaker}</span>
              </div>
            </div>
          </div>

          <div className="flex min-h-[200px] w-full">
            {hasSpeakerPic && <div className="w-[32%] flex-shrink-0" />}
            <div className={`flex flex-col justify-center w-full py-10 pr-16 ${hasSpeakerPic ? 'pl-6' : 'pl-16'}`}>
              <div className="text-jx3-paper/90 text-2xl font-medium leading-[1.8] tracking-wide min-h-[3em] max-w-4xl">
                <div className="drop-shadow-md">
                  {parseRichText(rawText, visibleChars)}
                  {isTyping && <span className="inline-block w-1 h-6 ml-1 bg-[#e6b31e] animate-pulse align-middle" />}
                </div>
              </div>

              <div className="absolute bottom-6 right-8 flex items-center gap-3">
                {!isTyping && (
                  <>
                    <span className="text-[#e6b31e]/40 text-[10px] font-bold tracking-[0.4em] uppercase opacity-0 group-hover/box:opacity-100 transition-opacity duration-500">Click to continue</span>
                    <div className="w-3 h-3 bg-[#e6b31e] rotate-45 animate-pulse shadow-[0_0_10px_rgba(230,179,30,0.5)]" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
