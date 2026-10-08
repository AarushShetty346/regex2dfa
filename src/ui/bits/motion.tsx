/*
 * Motion components adapted from React Bits (https://github.com/DavidHDev/react-bits,
 * MIT + Commons Clause, by David Haz):
 *   - Reveal       ← Animations/AnimatedContent (GSAP + ScrollTrigger)
 *   - SplitHeading ← TextAnimations/SplitText (GSAP SplitText)
 * Changes: trimmed to the options this app uses, reduced-motion support, and end states
 * cleared with clearProps so content can never be left hidden if a trigger does not fire.
 */
import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Distance in px the content rises from. */
  distance?: number;
  delay?: number;
  /** Animate direct children one after another instead of the block as a whole. */
  stagger?: number;
}

/** Fades content up the first time it scrolls into view. */
export function Reveal({ children, as: Tag = 'div', className, distance = 24, delay = 0, stagger }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    const targets = stagger ? Array.from(el.children) : el;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { y: distance, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay,
          stagger,
          ease: 'power3.out',
          clearProps: 'opacity,transform',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, [distance, delay, stagger]);
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

interface SplitHeadingProps {
  text: string;
  className?: string;
  /** Seconds between words. */
  stagger?: number;
}

/** An h1 whose words rise in on load. Screen readers get the whole sentence (SplitText aria: auto). */
export function SplitHeading({ text, className, stagger = 0.06 }: SplitHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    const split = SplitText.create(el, { type: 'words', wordsClass: 'split-word', aria: 'auto' });
    const tween = gsap.fromTo(
      split.words,
      { opacity: 0, yPercent: 60, rotate: 2 },
      { opacity: 1, yPercent: 0, rotate: 0, duration: 0.9, ease: 'expo.out', stagger, clearProps: 'opacity,transform' },
    );
    return () => {
      tween.kill();
      split.revert();
    };
  }, [text, stagger]);
  return (
    <h1 ref={ref} className={className} tabIndex={-1}>
      {text}
    </h1>
  );
}
