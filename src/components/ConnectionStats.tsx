import React, { useState, useEffect } from 'react';

interface ConnectionStatsProps {
  peerConnection?: RTCPeerConnection | null;
  isVisible: boolean;
}

interface Stats {
  bitrate: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  audioLevel: number;
  codec: string;
}

const ConnectionStats: React.FC<ConnectionStatsProps> = ({ peerConnection, isVisible }) => {
  const [stats, setStats] = useState<Stats>({
    bitrate: 0,
    packetsLost: 0,
    jitter: 0,
    roundTripTime: 0,
    audioLevel: 0,
    codec: 'Opus',
  });

  useEffect(() => {
    if (!peerConnection || !isVisible) return;

    const interval = setInterval(async () => {
      try {
        const report = await peerConnection.getStats();
        
        report.forEach((stat) => {
          if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
            setStats(prev => ({
              ...prev,
              bitrate: stat.bytesReceived ? Math.round((stat.bytesReceived * 8) / 1000) : 0,
              packetsLost: stat.packetsLost || 0,
              jitter: stat.jitter ? Math.round(stat.jitter * 1000) : 0,
              audioLevel: stat.audioLevel ? Math.round(stat.audioLevel * 100) : 0,
            }));
          }
          
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
            setStats(prev => ({
              ...prev,
              roundTripTime: stat.currentRoundTripTime ? Math.round(stat.currentRoundTripTime * 1000) : 0,
            }));
          }

          if (stat.type === 'codec' && stat.mimeType?.includes('opus')) {
            setStats(prev => ({
              ...prev,
              codec: 'Opus',
            }));
          }
        });
      } catch (err) {
        console.error('[Stats] Failed to get stats:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [peerConnection, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="bg-[#1e1f22] rounded-lg p-4 border border-[#3f4147]">
      <h3 className="text-white font-medium mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Статистика соединения
      </h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#949ba4]">Кодек:</span>
          <span className="text-white font-mono">{stats.codec}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-[#949ba4]">Битрейт:</span>
          <span className="text-white font-mono">{stats.bitrate} kbps</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-[#949ba4]">Задержка:</span>
          <span className={`font-mono ${stats.roundTripTime > 200 ? 'text-[#ed4245]' : stats.roundTripTime > 100 ? 'text-[#f0b232]' : 'text-[#23a559]'}`}>
            {stats.roundTripTime} ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-[#949ba4]">Потери пакетов:</span>
          <span className={`font-mono ${stats.packetsLost > 0 ? 'text-[#ed4245]' : 'text-[#23a559]'}`}>
            {stats.packetsLost}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-[#949ba4]">Джиттер:</span>
          <span className={`font-mono ${stats.jitter > 30 ? 'text-[#ed4245]' : stats.jitter > 15 ? 'text-[#f0b232]' : 'text-[#23a559]'}`}>
            {stats.jitter} ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-[#949ba4]">Уровень сигнала:</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-[#3f4147] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#23a559] transition-all"
                style={{ width: `${stats.audioLevel}%` }}
              />
            </div>
            <span className="text-white font-mono text-xs">{stats.audioLevel}%</span>
          </div>
        </div>
      </div>
      
      {/* Connection quality indicator */}
      <div className="mt-3 pt-3 border-t border-[#3f4147]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#949ba4]">Качество:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all ${
                  i <= getQualityScore(stats) 
                    ? getQualityScore(stats) >= 4 
                      ? 'bg-[#23a559]' 
                      : getQualityScore(stats) >= 3 
                        ? 'bg-[#f0b232]' 
                        : 'bg-[#ed4245]'
                    : 'bg-[#3f4147]'
                }`}
                style={{ height: `${8 + i * 3}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function getQualityScore(stats: Stats): number {
  let score = 5;
  
  if (stats.roundTripTime > 200) score -= 2;
  else if (stats.roundTripTime > 100) score -= 1;
  
  if (stats.packetsLost > 10) score -= 2;
  else if (stats.packetsLost > 5) score -= 1;
  
  if (stats.jitter > 30) score -= 1;
  
  return Math.max(1, Math.min(5, score));
}

export default ConnectionStats;
