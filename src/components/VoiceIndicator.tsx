import React, { useEffect, useRef } from 'react';
import { AudioStats } from '../services/audio';

interface VoiceIndicatorProps {
  stats: AudioStats | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({ 
  stats, 
  size = 'md',
  showLabel = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const sizeMap = {
    sm: { width: 40, height: 40 },
    md: { width: 60, height: 60 },
    lg: { width: 100, height: 100 },
  };

  const { width, height } = sizeMap[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 4;

      // Background circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = stats?.isSpeaking ? 'rgba(35, 165, 89, 0.1)' : 'rgba(88, 101, 242, 0.1)';
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = stats?.isSpeaking ? '#23a559' : '#5865f2';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Voice level bars
      if (stats && stats.level > 0) {
        const bars = 12;
        const barWidth = 3;
        const barSpacing = (Math.PI * 2) / bars;
        
        for (let i = 0; i < bars; i++) {
          const angle = (i * barSpacing) - Math.PI / 2;
          const barHeight = (stats.level / 100) * (radius * 0.6);
          
          const x1 = centerX + Math.cos(angle) * (radius * 0.4);
          const y1 = centerY + Math.sin(angle) * (radius * 0.4);
          const x2 = centerX + Math.cos(angle) * (radius * 0.4 + barHeight);
          const y2 = centerY + Math.sin(angle) * (radius * 0.4 + barHeight);
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = stats.isSpeaking ? '#23a559' : '#5865f2';
          ctx.lineWidth = barWidth;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      // Peak indicator
      if (stats && stats.peak > 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * (stats.peak / 100) * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = stats.isSpeaking ? 'rgba(35, 165, 89, 0.3)' : 'rgba(88, 101, 242, 0.3)';
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stats, width, height]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-full"
      />
      {showLabel && (
        <div className="text-xs text-gray-400">
          {stats?.isSpeaking ? 'Говорит' : 'Тишина'}
        </div>
      )}
    </div>
  );
};

export default VoiceIndicator;
