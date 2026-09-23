import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import * as opentype from "opentype.js";
import { cn } from "@/lib/utils";

const DEFAULT_FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/indieflower/IndieFlower-Regular.ttf";

export function HandwritingSvg({
  path: pathProp,
  text,
  fontUrl = DEFAULT_FONT_URL,
  className,
  strokeClassName,
  duration = 2.4,
  delay = 0.3,
  strokeWidth = 2.2,
  width = 500,
  height = 120,
  fontSize = 54,
  ease = "easeInOut",
}) {
  const [path, setPath] = useState(pathProp ?? null);
  const [viewBox, setViewBox] = useState(`0 0 ${width} ${height}`);
  const [loading, setLoading] = useState(!!text && !pathProp);

  useEffect(() => {
    if (!text || pathProp) {
      setPath(pathProp ?? null);
      setViewBox(`0 0 ${width} ${height}`);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(fontUrl)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        if (cancelled) {
          return;
        }
        const parseFn = opentype.parse;
        if (!parseFn) throw new Error("opentype.parse not found");
        const font = parseFn(buffer);
        const p = font.getPath(text, 0, fontSize, fontSize);
        const bbox = p.getBoundingBox();
        const pad = 6;
        const vx = Math.floor(bbox.x1) - pad;
        const vy = Math.floor(bbox.y1) - pad;
        const vw = Math.ceil(bbox.x2 - bbox.x1) + pad * 2;
        const vh = Math.ceil(bbox.y2 - bbox.y1) + pad * 2;
        setViewBox(`${vx} ${vy} ${vw} ${vh}`);
        setPath(p.toPathData(2));
      })
      .catch((err) => {
        console.warn("HandwritingSvg font parse error, fallback active:", err);
        if (!cancelled) {
          setPath(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [text, fontUrl, pathProp, fontSize, width, height]);

  if (loading) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn("text-muted-foreground animate-pulse", className)}
        aria-hidden={true}
      >
        <title>Handwriting SVG loading</title>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={16}
          fill="currentColor"
          opacity={0.35}
        >
          Rendering signature…
        </text>
      </svg>
    );
  }

  const d = path ?? "";
  if (!d) {
    return (
      <span className={cn("font-normal tracking-tight", className)}>
        {text}
      </span>
    );
  }

  const svgViewBox = pathProp ? `0 0 ${width} ${height}` : viewBox;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={svgViewBox}
      className={cn("overflow-visible", className)}
      aria-hidden={true}
    >
      <title>Handwriting SVG</title>
      <motion.path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClassName}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ 
          pathLength: { delay, duration, ease },
          opacity: { delay, duration: 0.3 }
        }}
      />
    </svg>
  );
}

export default HandwritingSvg;
