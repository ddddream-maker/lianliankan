

import React, { useEffect, useState, useRef } from 'react';
import { TileData, Position } from '../types';
import { Tile } from './Tile';

interface GameBoardProps {
  board: TileData[][];
  selectedPos: Position | null;
  hintPair: [Position, Position] | null;
  onTileClick: (pos: Position) => void;
  connectionPath: Position[] | null;
  isPaused: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  selectedPos,
  hintPair,
  onTileClick,
  connectionPath,
  isPaused
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
        if(containerRef.current) {
            setContainerSize({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }
    }
    
    // Resize observer + window resize listener for safety
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateSize);

    updateSize(); // Initial

    return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateSize);
    };
  }, []);

  if (!board || board.length === 0) return null;

  const totalRows = board.length;
  const totalCols = board[0].length;
  
  // Mobile Adaptation Logic
  const isMobile = window.innerWidth < 600;
  
  // Padding around the grid
  const PADDING = isMobile ? 4 : 20;
  const GAP = isMobile ? 2 : 4;

  // 1. Calculate ideal size to fit container
  // IMPORTANT: Ensure we never exceed window width on mobile
  const availableWidth = Math.max(0, (isMobile ? window.innerWidth : containerSize.width) - PADDING * 2);
  const availableHeight = Math.max(0, containerSize.height - PADDING * 2);

  const totalGapsWidth = Math.max(0, (totalCols - 1) * GAP);
  const totalGapsHeight = Math.max(0, (totalRows - 1) * GAP);

  const fitTileWidth = (availableWidth - totalGapsWidth) / totalCols;
  const fitTileHeight = (availableHeight - totalGapsHeight) / totalRows;
  
  // 2. Determine final size
  let tileSize = Math.floor(Math.min(fitTileWidth, fitTileHeight));
  
  // Cap max size for desktop
  tileSize = Math.min(tileSize, 100);

  // We DO NOT set a minimum tile size that forces scroll anymore.
  // Instead, the `constants.tsx` logic ensures `totalCols` is low enough on mobile 
  // so that `fitTileWidth` stays reasonable (e.g. >30px).
  // If screen is extremely tiny, tiles just get tiny.
  
  // Calculate total grid dimensions based on final tile size
  const gridWidth = (tileSize * totalCols) + ((totalCols - 1) * GAP);
  const gridHeight = (tileSize * totalRows) + ((totalRows - 1) * GAP);

  // Grid style
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${totalCols}, ${tileSize}px)`,
    gridTemplateRows: `repeat(${totalRows}, ${tileSize}px)`,
    gap: `${GAP}px`,
    margin: 'auto', // Centering
    width: `${gridWidth}px`,
    height: `${gridHeight}px`,
  };

  const isPos = (p: Position | null, x: number, y: number) => p?.x === x && p?.y === y;
  
  const isHinted = (x: number, y: number) => {
    if (!hintPair) return false;
    return (hintPair[0].x === x && hintPair[0].y === y) || (hintPair[1].x === x && hintPair[1].y === y);
  };

  const isPopping = (x: number, y: number) => {
    if (!connectionPath || connectionPath.length < 2) return false;
    const start = connectionPath[0];
    const end = connectionPath[connectionPath.length - 1];
    return (start.x === x && start.y === y) || (end.x === x && end.y === y);
  };

  const renderConnectionLine = () => {
    if (!connectionPath || connectionPath.length < 2) return null;

    const points = connectionPath.map(p => {
        const cx = p.x * (tileSize + GAP) + (tileSize / 2);
        const cy = p.y * (tileSize + GAP) + (tileSize / 2);
        return `${cx},${cy}`;
    }).join(' ');

    return (
      <svg className="absolute top-0 left-0 pointer-events-none z-20" style={{
        width: gridWidth,
        height: gridHeight,
      }}>
        <polyline 
            points={points} 
            fill="none" 
            stroke="#ef4444"
            strokeWidth={Math.max(3, tileSize / 6)} 
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-md animate-pulse"
        />
      </svg>
    );
  };

  const renderExplosion = (type: string) => {
    const particles = Array.from({ length: 8 });
    const colors = ['bg-red-400', 'bg-yellow-400', 'bg-orange-400', 'bg-green-400'];
    
    return (
      <div className="absolute inset-0 overflow-visible pointer-events-none z-50">
        {particles.map((_, i) => {
          const distance = tileSize * 1.2;
          const tx = (Math.random() - 0.5) * distance * 2;
          const ty = (Math.random() - 0.5) * distance * 2;
          const rot = Math.random() * 360;
          const color = colors[Math.floor(Math.random() * colors.length)];
          
          return (
            <div
              key={i}
              className={`absolute left-1/2 top-1/2 rounded-sm ${color} animate-shatter`}
              style={{
                width: Math.max(3, tileSize / 6),
                height: Math.max(3, tileSize / 6),
                '--tx': `${tx}px`,
                '--ty': `${ty}px`,
                '--rot': `${rot}deg`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div 
        ref={containerRef} 
        className="flex-1 w-full h-full relative overflow-hidden" 
        style={{ padding: PADDING }}
    >
        {/* Wrapper to center content */}
        <div className="w-full h-full flex items-center justify-center">
            <div style={{ position: 'relative', width: gridWidth, height: gridHeight }}>
                {renderConnectionLine()}

                <div style={gridStyle}>
                    {board.flatMap((row, y) => 
                    row.map((tile, x) => (
                        <div key={`${x}-${y}`} className="w-full h-full flex items-center justify-center relative">
                            {isPopping(x, y) ? (
                                renderExplosion(tile.type)
                            ) : (
                                <Tile
                                    type={tile.type}
                                    isEmpty={tile.isEmpty}
                                    isSelected={!isPaused && isPos(selectedPos, x, y)}
                                    isHinted={!isPaused && isHinted(x, y)}
                                    onClick={() => !isPaused && onTileClick({x, y})}
                                    sizeClass={`w-full h-full`}
                                    fontSize={tileSize * 0.65} 
                                    compact={tileSize < 45}
                                />
                            )}
                        </div>
                    ))
                    )}
                </div>
            </div>
        </div>
        
        {isPaused && (
            <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-30">
                <span className="text-2xl font-bold text-gray-500">PAUSED</span>
            </div>
        )}
    </div>
  );
};
