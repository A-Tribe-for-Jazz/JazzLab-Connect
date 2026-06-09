import React, { useState, useEffect } from 'react';
import { MousePointer, Play, SkipForward, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

interface LabPreferencesTourProps {
  isDark: boolean;
  onClose: () => void;
}

export default function LabPreferencesTour({ isDark, onClose }: LabPreferencesTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isClicking, setIsClicking] = useState(false);

  const steps: TourStep[] = [
    {
      targetId: 'tour-search',
      title: 'Quick Search & Guidelines',
      description: 'Use the search bar to locate students immediately. View choice instructions here.',
      placement: 'bottom',
    },
    {
      targetId: 'tour-student-name',
      title: 'Student Profile',
      description: 'Check the student’s name and exact Age column to ensure age eligibility for the labs.',
      placement: 'bottom',
    },
    {
      targetId: 'tour-lab-cell',
      title: 'Choose Preferences',
      description: 'Click cell options under the columns to select and rank labs from 1 (first choice) down to 10.',
      placement: 'bottom',
    },
    {
      targetId: 'tour-status-ready',
      title: 'Ready Checklist',
      description: 'Once exactly 10 labs have been ranked, the system registers a green checkmark indicating completeness.',
      placement: 'left',
    },
    {
      targetId: 'tour-clear-action',
      title: 'Reset Selection',
      description: 'Made a mistake? Click Clear to instantly wipe all selections for a student and start over.',
      placement: 'left',
    }
  ];

  useEffect(() => {
    const updatePosition = () => {
      const step = steps[currentStep];
      if (!step) return;

      let el = document.getElementById(step.targetId);
      
      if (!el) {
        if (step.targetId === 'tour-search') {
          el = document.querySelector('input[placeholder*="Search"]');
        } else if (step.targetId === 'tour-student-name') {
          el = document.querySelector('td:nth-child(2)');
        } else if (step.targetId === 'tour-lab-cell') {
          el = document.querySelector('td:nth-child(5) button') || document.querySelector('td:nth-child(5)');
        } else if (step.targetId === 'tour-status-ready') {
          el = document.querySelector('td:nth-child(4)') || document.querySelector('td:nth-child(3)');
        } else if (step.targetId === 'tour-clear-action') {
          el = document.querySelector('td:nth-child(5) button');
        }
      }

      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        });

        setCursorPos({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });

        if (step.action) {
          step.action();
        }
      } else {
        setCoords({
          x: window.innerWidth / 2 - 100,
          y: window.innerHeight / 2 - 100,
          width: 200,
          height: 200,
        });
        setCursorPos({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
      }
    };

    updatePosition();
    const timer = setTimeout(updatePosition, 150);

    // Setup recurring interval on Step 3 for clicking feedback loops
    let clickInterval: ReturnType<typeof setInterval> | null = null;
    if (currentStep === 2) {
      // Immediate click on load
      setIsClicking(true);
      const immediateTimeout = setTimeout(() => setIsClicking(false), 500);

      // Loop thereafter
      clickInterval = setInterval(() => {
        setIsClicking(true);
        setTimeout(() => setIsClicking(false), 500);
      }, 1500);
    }

    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
      if (clickInterval) clearInterval(clickInterval);
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = steps[currentStep];
  if (!step) return null;

  // Classic design indicators
  const overlayColorClass = "bg-black/60";
  const borderHighlightClass = "border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.4)]";
  const cursorColorClass = "text-sky-400";
  const radarPingClass = "border-sky-400 bg-sky-400/20";

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* Dark Overlay with cutouts */}
      <div 
        className={cn("absolute inset-0 pointer-events-auto transition-colors duration-500", overlayColorClass)} 
        onClick={onClose} 
        style={{
          clipPath: `polygon(
            0% 0%, 
            0% 100%, 
            ${coords.x}px 100%, 
            ${coords.x}px ${coords.y}px, 
            ${coords.x + coords.width}px ${coords.y}px, 
            ${coords.x + coords.width}px ${coords.y + coords.height}px, 
            ${coords.x}px ${coords.y + coords.height}px, 
            ${coords.x}px 100%, 
            100% 100%, 
            100% 0%
          )`
        }} 
      />

      {/* Target Focus Border Highlight */}
      <div 
        className={cn("absolute border-2 transition-all duration-500 ease-out", borderHighlightClass)}
        style={{
          left: coords.x - 4,
          top: coords.y - 4,
          width: coords.width + 8,
          height: coords.height + 8,
        }}
      />

      {/* Guided Virtual Cursor */}
      <div 
        className="absolute transition-all duration-500 ease-out z-50 flex flex-col items-start gap-1"
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
        }}
      >
        <MousePointer className={cn(
          "w-6 h-6 transition-transform transition-colors duration-200 duration-500",
          cursorColorClass,
          isClicking ? "scale-75" : "scale-100 rotate-[15deg]"
        )} />
        {isClicking && (
          <span className={cn("absolute -left-1 -top-1 w-8 h-8 rounded-full border-2 animate-ping pointer-events-none", radarPingClass)} />
        )}
      </div>

      {/* Guided Overlay Card Popup (Minimalist Card Design + Classic Overlays) */}
      <div 
        className={cn(
          "absolute pointer-events-auto w-80 p-5 rounded-lg border-none shadow-lg transition-all duration-500 ease-out flex flex-col gap-3",
          isDark 
            ? "bg-slate-900 text-slate-200 shadow-black/40" 
            : "bg-slate-50 text-slate-800 shadow-slate-300/40"
        )}
        style={{
          left: Math.min(Math.max(16, coords.x + coords.width / 2 - 160), window.innerWidth - 336),
          top: coords.y + coords.height + 16 > window.innerHeight - 200 
            ? coords.y - 215 
            : coords.y + coords.height + 16,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black tracking-widest text-sky-400 uppercase">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button 
            onClick={onClose}
            className={cn(
              "text-[10px] font-black uppercase tracking-wider transition-colors",
              isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Skip
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <h4 className={cn("font-extrabold text-[14px]", isDark ? "text-white" : "text-slate-900")}>
            {step.title}
          </h4>
          <p className={cn("text-[12px] leading-relaxed", isDark ? "text-slate-200" : "text-slate-800")}>
            {step.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-500/10">
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <span 
                key={idx} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  idx === currentStep 
                    ? "bg-sky-400 w-3" 
                    : isDark ? "bg-slate-800" : "bg-slate-200"
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className={cn(
                  "px-3 py-1.5 rounded text-[11px] font-bold transition-all",
                  isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                )}
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className={cn(
                "px-3.5 py-1.5 rounded text-[11px] font-black tracking-wide text-white transition-all shadow-md flex items-center gap-1",
                isDark 
                  ? "bg-sky-500 hover:bg-sky-400 shadow-sky-500/20" 
                  : "bg-sky-600 hover:bg-sky-500 shadow-sky-600/20"
              )}
            >
              {currentStep === steps.length - 1 ? (
                <>Done <CheckCircle size={12} /></>
              ) : (
                <>Next <ArrowRight size={12} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
