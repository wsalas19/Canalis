import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  align?: "left" | "right";
}

const MARGIN = 8;
const MAX_MENU_HEIGHT = 240;
const MIN_MENU_HEIGHT = 80;

export function Dropdown({ value, options, onChange, placeholder, align = "right" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden", minWidth: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position the menu relative to the trigger whenever it opens.
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;

      // Vertical: prefer below, flip above when there is not enough room.
      const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
      const spaceAbove = rect.top - MARGIN;
      const below = spaceBelow >= Math.min(menuHeight, MAX_MENU_HEIGHT) || spaceBelow >= spaceAbove;
      const availHeight = Math.max(below ? spaceBelow : spaceAbove, MIN_MENU_HEIGHT);
      const maxHeight = Math.min(MAX_MENU_HEIGHT, availHeight);

      let top = below ? rect.bottom + 6 : rect.top - 6 - Math.min(menuHeight, maxHeight);
      // Clamp within the viewport.
      top = Math.max(MARGIN, Math.min(top, window.innerHeight - MARGIN - Math.min(menuHeight, maxHeight)));

      // Horizontal: align edges, then clamp.
      let left = align === "right" ? rect.right - menuWidth : rect.left;
      left = Math.max(MARGIN, Math.min(left, window.innerWidth - MARGIN - menuWidth));

      setStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        right: "auto",
        bottom: "auto",
        minWidth: `${rect.width}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 10000,
        visibility: "visible",
      });
    };
    // Measure hidden first (two-pass) to avoid a visible jump on first open.
    position();
    const raf = requestAnimationFrame(position);
    return () => cancelAnimationFrame(raf);
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleScroll = (e: Event) => {
      // Ignore scrolling that happens inside the menu itself.
      const target = e.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleScroll);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const menu = (
    <div
      ref={menuRef}
      className={`dropdown-menu dropdown-menu--${align}`}
      style={style}
    >
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          className={`dropdown-item ${opt.value === value ? "selected" : ""}`}
          onClick={() => {
            onChange(opt.value);
            setOpen(false);
          }}
        >
          <span>{opt.label}</span>
          {opt.value === value && <Check size={12} strokeWidth={2.5} />}
        </button>
      ))}
    </div>
  );

  return (
    <div className="dropdown">
      <button
        ref={triggerRef}
        type="button"
        className={`dropdown-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dropdown-trigger-label">{selected?.label ?? placeholder ?? value}</span>
        <ChevronDown size={12} strokeWidth={2.5} className="dropdown-chevron" />
      </button>
      {open && createPortal(menu, document.body)}
    </div>
  );
}
