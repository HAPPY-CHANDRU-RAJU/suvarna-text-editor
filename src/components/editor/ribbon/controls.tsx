import { useState, type ElementType, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function RibbonGroup({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('ribbon-group', className)}>
      <div className="flex flex-1 items-center gap-0.5 px-1">{children}</div>
      <div className="ribbon-group-label">{label}</div>
    </div>
  );
}

/** Two stacked rows of small controls inside a group, like Word's Font group. */
export function RibbonRows({ children }: { children: ReactNode }) {
  return <div className="flex flex-col justify-center gap-1">{children}</div>;
}

export function RibbonRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

interface ButtonProps {
  icon: ElementType;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  /** Large buttons show the label under the icon. */
  size?: 'large' | 'small';
  showLabel?: boolean;
  className?: string;
}

export function RibbonButton({ icon: Icon, label, onClick, active, disabled, shortcut, size = 'small', showLabel, className }: ButtonProps) {
  const button = (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the editor selection when clicking ribbon buttons.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(size === 'large' ? 'ribbon-btn-large' : 'ribbon-btn', active && 'is-active', className)}
    >
      <Icon className={size === 'large' ? 'h-6 w-6' : 'h-4 w-4'} strokeWidth={1.75} />
      {(size === 'large' || showLabel) && <span className={size === 'large' ? 'ribbon-btn-large-label' : 'text-xs'}>{label}</span>}
    </button>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
        {shortcut && <span className="ml-2 text-muted-foreground">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

/** Button that opens a popover (menus, galleries, pickers). */
export function RibbonDropdown({
  icon: Icon,
  label,
  children,
  size = 'small',
  showLabel,
  active,
  contentClassName,
  open,
  onOpenChange,
}: {
  icon: ElementType;
  label: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  size?: 'large' | 'small';
  showLabel?: boolean;
  active?: boolean;
  contentClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={label}
              onMouseDown={(e) => e.preventDefault()}
              className={cn(size === 'large' ? 'ribbon-btn-large' : 'ribbon-btn gap-0.5', active && 'is-active')}
            >
              <Icon className={size === 'large' ? 'h-6 w-6' : 'h-4 w-4'} strokeWidth={1.75} />
              {size === 'large' ? (
                <span className="ribbon-btn-large-label">
                  {label} <ChevronDown className="inline h-3 w-3" />
                </span>
              ) : (
                <>
                  {showLabel && <span className="text-xs">{label}</span>}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </>
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        className={cn('w-auto p-1', contentClassName)}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {typeof children === 'function' ? children(() => setOpen(false)) : children}
      </PopoverContent>
    </Popover>
  );
}

export function MenuItem({
  icon: Icon,
  children,
  onSelect,
  active,
  hint,
}: {
  icon?: ElementType;
  children: ReactNode;
  onSelect: () => void;
  active?: boolean;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={cn('menu-item', active && 'bg-accent/15 font-medium')}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-70" /> : <span className="w-4" />}
      <span className="flex-1 text-left">{children}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}

const THEME_COLORS = [
  ['#000000', '#FFFFFF', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#7B3F00'],
  ['#7F7F7F', '#F2F2F2', '#D6DCE4', '#D9E2F3', '#FBE5D5', '#EDEDED', '#FFF2CC', '#DEEBF6', '#E2EFD9', '#F4E1C1'],
  ['#595959', '#D8D8D8', '#ADB9CA', '#B4C6E7', '#F7CBAC', '#DBDBDB', '#FEE599', '#BDD7EE', '#C5E0B3', '#E3C08D'],
  ['#3F3F3F', '#BFBFBF', '#8496B0', '#8EAADB', '#F4B183', '#C9C9C9', '#FFD965', '#9CC3E5', '#A8D08D', '#C9963F'],
  ['#262626', '#A5A5A5', '#323F4F', '#2F5496', '#C55A11', '#7B7B7B', '#BF9000', '#2E75B5', '#538135', '#8A5A12'],
];
const STANDARD_COLORS = ['#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'];
export const HIGHLIGHT_COLORS = [
  '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#0000FF', '#FF0000', '#000080', '#008080',
  '#008000', '#800080', '#800000', '#808000', '#808080', '#C0C0C0', '#FDE68A', '#FBCFE8',
];

export function ColorGrid({
  colors,
  onPick,
  noneLabel,
  onNone,
}: {
  colors: 'text' | 'highlight';
  onPick: (color: string) => void;
  noneLabel: string;
  onNone: () => void;
}) {
  const swatch = (c: string) => (
    <button
      key={c}
      type="button"
      title={c}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPick(c)}
      className="h-5 w-5 rounded-sm border border-black/10 transition-transform hover:scale-110 hover:ring-2 hover:ring-primary"
      style={{ backgroundColor: c }}
    />
  );
  return (
    <div className="w-[240px] p-1.5">
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onNone} className="menu-item mb-1">
        <span className="h-4 w-4 rounded-sm border border-dashed border-muted-foreground" />
        <span>{noneLabel}</span>
      </button>
      {colors === 'text' ? (
        <>
          <div className="grid grid-cols-10 gap-1">{THEME_COLORS.flat().map(swatch)}</div>
          <div className="mt-2 grid grid-cols-10 gap-1">{STANDARD_COLORS.map(swatch)}</div>
        </>
      ) : (
        <div className="grid grid-cols-8 gap-1">{HIGHLIGHT_COLORS.map(swatch)}</div>
      )}
    </div>
  );
}

/** Word-style split button: the face re-applies the last color, the arrow opens the palette. */
export function ColorSplitButton({
  icon: Icon,
  label,
  color,
  palette,
  noneLabel,
  onApply,
  onClear,
}: {
  icon: ElementType;
  label: string;
  color: string;
  palette: 'text' | 'highlight';
  noneLabel: string;
  onApply: (color: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-stretch">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onApply(color)}
            className="ribbon-btn flex-col !gap-0 !px-1"
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="mt-0.5 h-1 w-4 rounded-sm" style={{ backgroundColor: color }} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
      </Tooltip>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label={label} onMouseDown={(e) => e.preventDefault()} className="ribbon-btn !w-3.5 !px-0">
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
          <ColorGrid
            colors={palette}
            noneLabel={noneLabel}
            onNone={() => {
              onClear();
              setOpen(false);
            }}
            onPick={(c) => {
              onApply(c);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function RibbonSeparator() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}
