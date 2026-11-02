/**
 * Haptic Feedback Utility for iOS WebView
 * Provides consistent tactile feedback for interactive elements
 */

/**
 * Triggers haptic feedback if available
 * @param {'light' | 'medium' | 'heavy' | 'selection'} type - Type of haptic feedback
 */
export const triggerHaptic = (type = 'light') => {
  // Check if running in iOS WebView with haptic support
  if (window.navigator && window.navigator.vibrate) {
    // Standard Vibration API (limited support)
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      selection: [5]
    };
    window.navigator.vibrate(patterns[type] || patterns.light);
  }
  
  // iOS Haptic Feedback API (if available in WKWebView)
  if (window.webkit?.messageHandlers?.haptic) {
    window.webkit.messageHandlers.haptic.postMessage({ type });
  }
};

/**
 * Adds haptic feedback to button click handler
 * @param {Function} onClick - Original click handler
 * @param {'light' | 'medium' | 'heavy' | 'selection'} hapticType - Type of haptic
 * @returns {Function} Enhanced click handler with haptic feedback
 */
export const withHaptic = (onClick, hapticType = 'light') => {
  return (event) => {
    triggerHaptic(hapticType);
    if (onClick) {
      onClick(event);
    }
  };
};

/**
 * Enhanced button props with haptic feedback and active state
 * @param {Object} props - Original button props
 * @param {'light' | 'medium' | 'heavy' | 'selection'} hapticType - Type of haptic
 * @returns {Object} Enhanced props with haptic and active state styling
 */
export const withButtonHaptic = (props = {}, hapticType = 'light') => {
  const { onClick, onTouchStart, style, className, ...rest } = props;
  
  return {
    ...rest,
    onClick: withHaptic(onClick, hapticType),
    onTouchStart: (e) => {
      triggerHaptic(hapticType);
      if (onTouchStart) onTouchStart(e);
    },
    style: {
      ...style,
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      transition: 'transform 0.1s ease, opacity 0.2s ease',
    },
    className: `${className || ''} active:scale-95 active:opacity-80`,
  };
};