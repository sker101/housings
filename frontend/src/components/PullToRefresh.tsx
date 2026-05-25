import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RotateCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
}

export default function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const activeTouch = useRef<boolean>(false);
  
  const threshold = 70; // px pull distance required to trigger refresh
  const maxPull = 120;  // px maximum pull distance allowed (with resistance)
  
  // Calculate resistance dampening (log-like behavior)
  const calculateDistance = (dy: number) => {
    const k = 0.4; // resistance constant
    return Math.min(maxPull, dy * k);
  };
  
  // Helper to check if event target is inside an excluded element (like a map or modal)
  const shouldExcludeTarget = (target: HTMLElement | null): boolean => {
    if (!target) return false;
    // Exclude maps, sliders, search modal, and explicit skip class
    if (
      target.closest('.mapboxgl-map') || 
      target.closest('.mapboxgl-canvas') ||
      target.closest('.mobile-search-modal') ||
      target.closest('.no-pull-refresh') ||
      target.closest('.slider') ||
      target.closest('input[type="range"]')
    ) {
      return true;
    }
    return false;
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing) return;
    
    // Only trigger if scroll position is at the very top
    if (window.scrollY === 0) {
      const target = e.target as HTMLElement | null;
      if (shouldExcludeTarget(target)) return;
      
      // Also ignore if the body overflow is locked (e.g. search modal open)
      const bodyStyle = window.getComputedStyle(document.body);
      if (bodyStyle.overflow === 'hidden' || bodyStyle.touchAction === 'none') {
        return;
      }

      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      activeTouch.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!activeTouch.current || startY.current === null || startX.current === null) return;
    
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const dy = currentY - startY.current;
    const dx = currentX - startX.current;
    
    // Determine if user is pulling down vertically (more vertical than horizontal movement)
    if (dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      const distance = calculateDistance(dy);
      if (distance > 0) {
        setIsPulling(true);
        setPullDistance(distance);
        
        // Prevent default native overscroll/bounce and native pull-to-refresh
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    } else if (dy <= 0 && isPulling) {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (!activeTouch.current) return;
    activeTouch.current = false;
    
    if (isPulling) {
      setIsPulling(false);
      if (pullDistance >= threshold) {
        triggerRefresh();
      } else {
        animateBack();
      }
    }
    
    startY.current = null;
    startX.current = null;
  }, [isPulling, pullDistance]);
  
  // Mouse events for desktop simulation and testing
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (isRefreshing) return;
    if (window.scrollY === 0) {
      const target = e.target as HTMLElement | null;
      if (shouldExcludeTarget(target)) return;
      
      const bodyStyle = window.getComputedStyle(document.body);
      if (bodyStyle.overflow === 'hidden') return;

      startY.current = e.clientY;
      startX.current = e.clientX;
      activeTouch.current = true;
    }
  }, [isRefreshing]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!activeTouch.current || startY.current === null || startX.current === null) return;
    
    const dy = e.clientY - startY.current;
    const dx = e.clientX - startX.current;
    
    if (dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      const distance = calculateDistance(dy);
      if (distance > 0) {
        setIsPulling(true);
        setPullDistance(distance);
        
        // Prevent text selection while dragging
        e.preventDefault();
      }
    } else if (dy <= 0 && isPulling) {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [isPulling]);

  const handleMouseUp = useCallback(() => {
    if (!activeTouch.current) return;
    activeTouch.current = false;
    
    if (isPulling) {
      setIsPulling(false);
      if (pullDistance >= threshold) {
        triggerRefresh();
      } else {
        animateBack();
      }
    }
    
    startY.current = null;
    startX.current = null;
  }, [isPulling, pullDistance]);

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    setPullDistance(threshold); // Lock the spinner in place at the threshold
    
    let resolved = false;
    const promise = new Promise<void>((resolve) => {
      const handleDone = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      if (onRefresh) {
        Promise.resolve(onRefresh()).then(handleDone).catch(handleDone);
      } else {
        // Create cancelable custom event with completion callback in details
        const event = new CustomEvent('app-refresh', {
          detail: { complete: handleDone },
          cancelable: true
        });

        // Dispatch event to window
        const isPrevented = !window.dispatchEvent(event);

        if (!isPrevented) {
          // Fallback: Perform standard reload if no page is listening or handling dynamically
          window.location.reload();
          resolve();
        } else {
          // Dynamic handler is in charge. Set safety timeout of 3.5s to avoid permanent freeze
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          }, 3500);
        }
      }
    });

    await promise;
    setIsRefreshing(false);
    animateBack();
  };

  const animateBack = () => {
    setPullDistance(0);
  };

  useEffect(() => {
    // Add touch event listeners to window (passive: false for touchmove to enable preventDefault)
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Add mouse event listeners to window for desktop testing
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp]);

  const progress = Math.min(1, pullDistance / threshold);
  const rotation = progress * 360;
  const showIndicator = pullDistance > 0 || isRefreshing;

  return (
    <div className="pull-to-refresh-container">
      {showIndicator && (
        <div 
          className={`pull-to-refresh-indicator ${isRefreshing ? 'is-refreshing' : ''} ${pullDistance >= threshold ? 'ready' : ''}`}
          style={{
            transform: `translate3d(-50%, ${pullDistance}px, 0)`,
            opacity: showIndicator ? Math.min(1, pullDistance / 20) : 0,
            transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s'
          }}
        >
          <div className="pull-to-refresh-circle">
            {isRefreshing ? (
              <RotateCw className="spinner-icon spinning" size={20} />
            ) : (
              <ArrowDown 
                className="arrow-icon" 
                style={{ 
                  transform: `rotate(${rotation}deg)`,
                  transition: isPulling ? 'none' : 'transform 0.3s'
                }} 
                size={20} 
              />
            )}
          </div>
        </div>
      )}
      <div 
        className="pull-to-refresh-content"
        style={{
          transform: `translate3d(0, ${isRefreshing ? threshold : pullDistance}px, 0)`,
          transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {children}
      </div>
    </div>
  );
}
