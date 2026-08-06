import React from 'react';

/**
 * Exact CuraTrack Shield + Heart + ECG Pulse Logo Component
 * Transparent background, 100% exact vector geometry matching user's image.
 */
export function CuraTrackLogoIcon({ 
  className = "w-10 h-10", 
  size, 
  variant = "default",
  color
}) {
  const customStyle = size ? { width: `${size}px`, height: `${size}px` } : {};

  // Resolve color scheme for transparent / light / dark background contexts
  let strokeFill = color || (variant === "dark" || variant === "blue" ? "#003d9b" : "#ffffff");
  let bgCutout = variant === "blue" || variant === "dark" ? "#ffffff" : "#003d9b";

  if (variant === "splash") {
    strokeFill = "#ffffff";
    bgCutout = "#051e70";
  }

  return (
    <svg 
      className={`shrink-0 ${className}`} 
      style={customStyle}
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Shield Outline */}
      <path 
        d="M 50 10 C 68 18 84 20 86 28 C 88 56 74 78 50 92 C 26 78 12 56 14 28 C 16 20 32 18 50 10 Z" 
        fill="none" 
        stroke={strokeFill} 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Inner Heart Symbol */}
      <path 
        d="M 50 32 C 42 20 28 20 20 28 C 10 38 16 54 34 68 L 50 80 L 66 68 C 84 54 90 38 80 28 C 72 20 58 20 50 32 Z" 
        fill={strokeFill} 
      />

      {/* Horizontal ECG Heartbeat Pulse Line Cutout */}
      <path 
        d="M 18 50 H 38 L 44 38 L 52 64 L 58 44 L 62 53 L 66 50 H 82" 
        fill="none" 
        stroke={bgCutout} 
        strokeWidth="4.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

/**
 * Full CuraTrack Brand Header Component
 */
export function CuraTrackBrandHeader({ 
  showSubtitle = true, 
  subtitleText = "Smart Health Suite",
  iconSize = 36,
  darkText = false 
}) {
  return (
    <div className="flex items-center gap-3 select-none">
      <CuraTrackLogoIcon 
        size={iconSize} 
        variant={darkText ? "blue" : "white"} 
      />
      <div className="flex flex-col">
        <span className={`font-extrabold text-xl tracking-tight leading-none ${
          darkText ? "text-[#0b1c30]" : "text-white"
        }`}>
          Cura<span className={darkText ? "text-[#003d9b]" : "text-[#6ffbbe]"}>Track</span>
        </span>
        {showSubtitle && (
          <span className={`text-[10px] font-bold tracking-wider uppercase mt-1 ${
            darkText ? "text-[#434654]" : "text-blue-200/90"
          }`}>
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
}

export default CuraTrackLogoIcon;
