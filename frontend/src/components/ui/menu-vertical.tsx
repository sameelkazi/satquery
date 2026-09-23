"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Info } from "lucide-react";

export type MenuItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  purpose?: string;
  active?: boolean;
};

export interface MenuVerticalProps {
  menuItems: MenuItem[];
  color?: string;
  skew?: number;
  className?: string;
  onItemClick?: (item: MenuItem) => void;
}

const MotionA = motion.create("a");
const MotionButton = motion.create("button");

export const MenuVertical = ({
  menuItems = [],
  color = "#06b6d4",
  skew = -4,
  className = "",
  onItemClick,
}: MenuVerticalProps) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleTooltip = (label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItem((prev) => (prev === label ? null : label));
  };

  return (
    <div className={`flex w-full flex-col gap-1.5 px-1 sm:px-2 ${className}`}>
      {menuItems.map((item, index) => {
        const isButton = Boolean(item.onClick || onItemClick);
        const Component = isButton ? MotionButton : MotionA;
        const isExpanded = expandedItem === item.label;

        return (
          <div key={`${item.label}-${index}`} className="w-full flex flex-col">
            <motion.div
              className={`group/nav flex items-center justify-between w-full cursor-pointer select-none transition-all py-2 px-2.5 rounded-xl ${
                item.active
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold"
                  : "text-slate-800 dark:text-white/90 hover:bg-slate-100/80 dark:hover:bg-white/5 hover:text-cyan-600 dark:hover:text-cyan-400"
              }`}
              initial="initial"
              whileHover="hover"
              onClick={() => {
                if (item.onClick) item.onClick();
                if (onItemClick) onItemClick(item);
              }}
            >
              {/* Left: Arrow + Navigation Label */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <motion.div
                  variants={{
                    initial: { x: "-100%", color: "inherit", opacity: 0 },
                    hover: { x: 0, color, opacity: 1 },
                  }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="z-0 flex-shrink-0"
                >
                  <ArrowRight strokeWidth={2.5} className="w-4 h-4 text-cyan-500" />
                </motion.div>

                <Component
                  {...(!isButton && item.href ? { href: item.href } : { type: "button" })}
                  variants={{
                    initial: { x: -16, color: "inherit" },
                    hover: { x: 0, color, skewX: skew },
                  }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="font-bold text-base sm:text-lg tracking-tight no-underline text-left bg-transparent border-none cursor-pointer p-0 truncate"
                >
                  <span className="leading-snug">{item.label}</span>
                </Component>
              </div>

              {/* Right: Info / Feature Purpose Button */}
              {item.purpose && (
                <button
                  type="button"
                  onClick={(e) => toggleTooltip(item.label, e)}
                  className={`p-1.5 rounded-lg transition-all flex-shrink-0 cursor-pointer ${
                    isExpanded
                      ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 shadow-xs"
                      : "text-slate-400 hover:text-cyan-600 dark:text-white/40 dark:hover:text-cyan-400 hover:bg-slate-200/60 dark:hover:bg-white/10"
                  }`}
                  title="Learn about this feature"
                  aria-label={`About ${item.label}`}
                >
                  <Info className="w-4 h-4" />
                </button>
              )}
            </motion.div>

            {/* Inline Explanatory Card */}
            <AnimatePresence>
              {isExpanded && item.purpose && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 text-xs text-slate-700 dark:text-white/85 mx-1 shadow-sm">
                    <p className="leading-relaxed text-[11.5px] text-slate-800 dark:text-white/90">
                      {item.purpose}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default MenuVertical;
