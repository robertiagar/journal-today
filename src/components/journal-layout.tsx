import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type MotionStyle,
} from "framer-motion";
import { useEffect, useRef } from "react";

export function JournalHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const scrollProgress = useMotionValue(0);
  const animatedProgress = useSpring(scrollProgress, {
    stiffness: 260,
    damping: 32,
  });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const header = headerRef.current;
    const workspace = header?.closest<HTMLElement>(".desktop-workspace");
    if (!header || !workspace) return;

    const updateScroll = () =>
      scrollProgress.set(Math.min(1, Math.max(0, workspace.scrollTop / 96)));
    const updateHeight = () => {
      workspace.style.setProperty(
        "--journal-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };
    const resize = new ResizeObserver(updateHeight);
    resize.observe(header, { box: "border-box" });
    workspace.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();
    updateHeight();

    return () => {
      resize.disconnect();
      workspace.removeEventListener("scroll", updateScroll);
      workspace.style.removeProperty("--journal-header-height");
    };
  }, [scrollProgress]);

  return (
    <motion.header
      ref={headerRef}
      aria-label="Journal header"
      className="journal-header flex items-center justify-between gap-6 border-b border-line"
      style={
        {
          "--header-collapse": reduceMotion ? scrollProgress : animatedProgress,
        } as MotionStyle
      }
    >
      <div
        className="flex shrink-0 items-center gap-2.5 text-sm font-medium tracking-tight"
        aria-label="Journal today home"
      >
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
        journal<span className="-ml-2 text-muted">/ today</span>
      </div>
      <div className="flex flex-col items-end">
        <h1 className="text-right text-sm font-bold tracking-tight">
          make room for today
        </h1>
        <h2 className="text-right text-sm font-medium tracking-tight text-muted">
          let it all out, one day at a time
        </h2>
      </div>
    </motion.header>
  );
}

export function JournalFooter() {
  return (
    <footer className="flex items-center justify-between gap-4 border-t border-line py-6 text-[10px] tracking-wide text-muted">
      <span>One day at a time.</span>
      <span className="flex flex-col items-end gap-1 text-right">
        <span>No perfect words needed.</span>
        <span aria-label="App version">v{import.meta.env.VITE_APP_VERSION}</span>
      </span>
    </footer>
  );
}
