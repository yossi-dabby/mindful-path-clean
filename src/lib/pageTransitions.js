export function pageTransitionDirection(isRtl, navigationType) {
  return (isRtl ? -1 : 1) * (navigationType === 'POP' ? -1 : 1);
}

export function createPageTransitionVariants(reducedMotion) {
  if (reducedMotion) {
    const still = { x: 0, opacity: 1, transition: { duration: 0 } };
    return { initial: still, animate: still, exit: still };
  }
  const transition = { type: 'tween', ease: [0.4, 0.0, 0.2, 1], duration: 0.3 };
  return {
    initial: (direction) => ({ x: `${direction * 100}%`, opacity: 0 }),
    animate: { x: 0, opacity: 1, transition },
    exit: (direction) => ({ x: `${direction * -30}%`, opacity: 0, transition }),
  };
}
