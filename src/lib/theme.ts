export type BgFlavor = 'slate' | 'zinc' | 'classic';

export interface ThemeStyles {
  bg: string;
  headerBg: string;
  border: string;
  borderLight: string;
  cardBg: string;
  cardHeaderBg: string;
  cardBorder: string;
  textMuted: string;
  textTitle: string;
  accentText: string;
  tableHeadBg: string;
  rowHover: string;
  rowOdd: string;
  inputBg: string;
  dropdownBg: string;
}

export function getThemeClasses(isDark: boolean, flavor: BgFlavor = 'slate'): ThemeStyles {
  if (isDark) {
    switch (flavor) {
      case 'zinc':
        return {
          bg: 'bg-[#09090b] text-zinc-100',
          headerBg: 'bg-[#18181b]/90 border-zinc-800/80',
          border: 'border-zinc-800',
          borderLight: 'border-zinc-900',
          cardBg: 'bg-[#18181b]',
          cardHeaderBg: 'bg-[#27272a]/40',
          cardBorder: 'border-zinc-800/80',
          textMuted: 'text-zinc-400',
          textTitle: 'text-white',
          accentText: 'text-amber-400',
          tableHeadBg: 'bg-zinc-900 text-zinc-200 border-zinc-800 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]',
          rowHover: 'hover:bg-zinc-900/40',
          rowOdd: 'bg-zinc-900/10',
          inputBg: 'bg-zinc-900/30 border-zinc-850 text-white focus:border-zinc-700',
          dropdownBg: 'bg-zinc-950/95 border-zinc-800/60 text-zinc-100',
        };
      case 'classic':
        return {
          bg: 'bg-black text-neutral-100',
          headerBg: 'bg-black border-neutral-900',
          border: 'border-neutral-900',
          borderLight: 'border-neutral-900/50',
          cardBg: 'bg-[#020617]',
          cardHeaderBg: 'bg-slate-950/50',
          cardBorder: 'border-neutral-800/60',
          textMuted: 'text-neutral-400',
          textTitle: 'text-white',
          accentText: 'text-amber-400',
          tableHeadBg: 'bg-slate-950 text-neutral-200 border-neutral-900 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]',
          rowHover: 'hover:bg-neutral-900/30',
          rowOdd: 'bg-neutral-900/10',
          inputBg: 'bg-neutral-950/30 border-neutral-900 text-white focus:border-neutral-800',
          dropdownBg: 'bg-black/95 border-neutral-900 text-neutral-100',
        };
      case 'slate':
      default:
        return {
          bg: 'bg-[#090d16] text-slate-100',
          headerBg: 'bg-[#0f1524]/90 border-slate-800/60',
          border: 'border-slate-800',
          borderLight: 'border-slate-900',
          cardBg: 'bg-[#090d16]',
          cardHeaderBg: 'bg-[#131a2c]/50',
          cardBorder: 'border-white/10',
          textMuted: 'text-slate-400',
          textTitle: 'text-white',
          accentText: 'text-amber-400',
          tableHeadBg: 'bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]',
          rowHover: 'hover:bg-white/[0.02]',
          rowOdd: 'bg-white/[0.015]',
          inputBg: 'bg-sky-400/[0.03] border-white/10 text-white focus:border-sky-400/50',
          dropdownBg: 'bg-slate-950/90 border-white/10 text-white',
        };
    }
  } else {
    // Light Mode
    switch (flavor) {
      case 'zinc':
        return {
          bg: 'bg-zinc-50/50 text-zinc-900',
          headerBg: 'bg-white/95 border-zinc-200/60',
          border: 'border-zinc-200',
          borderLight: 'border-zinc-100',
          cardBg: 'bg-white',
          cardHeaderBg: 'bg-zinc-50/50',
          cardBorder: 'border-zinc-200',
          textMuted: 'text-zinc-500',
          textTitle: 'text-zinc-900',
          accentText: 'text-amber-600',
          tableHeadBg: 'bg-zinc-100 text-zinc-800 border-zinc-300 shadow-[inset_0_-1px_0_0_#d4d4d8]',
          rowHover: 'hover:bg-zinc-50/50',
          rowOdd: 'bg-zinc-50/30',
          inputBg: 'bg-zinc-50/20 border-zinc-200 text-zinc-900 focus:border-zinc-300',
          dropdownBg: 'bg-white/95 border-zinc-100 text-zinc-900',
        };
      case 'classic':
        return {
          bg: 'bg-white text-slate-900',
          headerBg: 'bg-white border-slate-200/60',
          border: 'border-slate-200',
          borderLight: 'border-slate-100',
          cardBg: 'bg-white',
          cardHeaderBg: 'bg-slate-50/30',
          cardBorder: 'border-slate-200',
          textMuted: 'text-slate-500',
          textTitle: 'text-slate-900',
          accentText: 'text-amber-600',
          tableHeadBg: 'bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]',
          rowHover: 'hover:bg-slate-50/50',
          rowOdd: 'bg-slate-50/40',
          inputBg: 'bg-slate-50/20 border-slate-200 text-slate-900 focus:border-slate-300',
          dropdownBg: 'bg-white/95 border-slate-100 text-slate-900',
        };
      case 'slate':
      default:
        return {
          bg: 'bg-slate-50/50 text-slate-900',
          headerBg: 'bg-white/95 border-slate-200/60',
          border: 'border-slate-200',
          borderLight: 'border-slate-150',
          cardBg: 'bg-white',
          cardHeaderBg: 'bg-slate-50/30',
          cardBorder: 'border-slate-200',
          textMuted: 'text-slate-500',
          textTitle: 'text-slate-900',
          accentText: 'text-amber-600',
          tableHeadBg: 'bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]',
          rowHover: 'hover:bg-slate-50/50',
          rowOdd: 'bg-slate-50/40',
          inputBg: 'bg-sky-50/20 border-slate-200 text-slate-900 focus:border-sky-500/30',
          dropdownBg: 'bg-white/95 border-slate-100 text-slate-900',
        };
    }
  }
}
