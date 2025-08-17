// Touch gesture utilities for mobile optimization
import React from 'react';
export class TouchGestureHandler {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      threshold: 50, // minimum distance for swipe
      velocityThreshold: 0.3, // minimum velocity for swipe
      maxTime: 300, // maximum time for swipe gesture
      restrained: 100, // maximum distance in perpendicular direction
      allowedTime: 300, // maximum time allowed to travel that distance
      ...options
    };
    
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.endX = 0;
    this.endY = 0;
    this.endTime = 0;
    
    this.isPressed = false;
    this.hasMoved = false;
    
    this.init();
  }
  
  init() {
    if (!this.element) return;
    
    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    
    // Mouse events for desktop testing
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.addEventListener('mouseup', this.handleMouseEnd.bind(this));
    this.element.addEventListener('mouseleave', this.handleMouseEnd.bind(this));
    
    // Prevent context menu on long press
    this.element.addEventListener('contextmenu', (e) => {
      if (this.hasMoved) {
        e.preventDefault();
      }
    });
  }
  
  handleTouchStart(e) {
    const touch = e.touches[0];
    this.startTouch(touch.clientX, touch.clientY);
  }
  
  handleTouchMove(e) {
    if (!this.isPressed) return;
    
    const touch = e.touches[0];
    this.moveTouch(touch.clientX, touch.clientY);
    
    // Prevent scrolling during horizontal swipes
    if (this.options.preventScroll && Math.abs(this.endX - this.startX) > 10) {
      e.preventDefault();
    }
  }
  
  handleTouchEnd(e) {
    this.endTouch();
  }
  
  handleMouseDown(e) {
    this.startTouch(e.clientX, e.clientY);
  }
  
  handleMouseMove(e) {
    if (!this.isPressed) return;
    this.moveTouch(e.clientX, e.clientY);
  }
  
  handleMouseEnd(e) {
    this.endTouch();
  }
  
  startTouch(x, y) {
    this.startX = x;
    this.startY = y;
    this.startTime = Date.now();
    this.isPressed = true;
    this.hasMoved = false;
    
    this.trigger('touchstart', {
      startX: this.startX,
      startY: this.startY,
      startTime: this.startTime
    });
  }
  
  moveTouch(x, y) {
    this.endX = x;
    this.endY = y;
    this.hasMoved = true;
    
    const deltaX = this.endX - this.startX;
    const deltaY = this.endY - this.startY;
    
    this.trigger('touchmove', {
      deltaX,
      deltaY,
      currentX: this.endX,
      currentY: this.endY
    });
  }
  
  endTouch() {
    if (!this.isPressed) return;
    
    this.endTime = Date.now();
    this.isPressed = false;
    
    const deltaX = this.endX - this.startX;
    const deltaY = this.endY - this.startY;
    const deltaTime = this.endTime - this.startTime;
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;
    
    this.trigger('touchend', {
      deltaX,
      deltaY,
      deltaTime,
      velocity,
      startX: this.startX,
      startY: this.startY,
      endX: this.endX,
      endY: this.endY
    });
    
    // Detect swipe gestures
    if (Math.abs(deltaX) >= this.options.threshold || Math.abs(deltaY) >= this.options.threshold) {
      if (deltaTime <= this.options.maxTime && velocity >= this.options.velocityThreshold) {
        this.detectSwipe(deltaX, deltaY, deltaTime, velocity);
      }
    }
    
    // Detect tap
    if (!this.hasMoved || (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10)) {
      this.trigger('tap', {
        x: this.startX,
        y: this.startY,
        deltaTime
      });
    }
    
    // Reset
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
  }
  
  detectSwipe(deltaX, deltaY, deltaTime, velocity) {
    let direction = '';
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaY) <= this.options.restrained) {
        direction = deltaX < 0 ? 'left' : 'right';
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaX) <= this.options.restrained) {
        direction = deltaY < 0 ? 'up' : 'down';
      }
    }
    
    if (direction) {
      this.trigger('swipe', {
        direction,
        deltaX,
        deltaY,
        deltaTime,
        velocity
      });
      
      this.trigger(`swipe${direction}`, {
        deltaX,
        deltaY,
        deltaTime,
        velocity
      });
    }
  }
  
  trigger(eventName, data = {}) {
    if (this.options[eventName]) {
      this.options[eventName](data);
    }
    
    // Also dispatch custom event
    const event = new CustomEvent(`gesture${eventName}`, {
      detail: data,
      bubbles: true
    });
    this.element.dispatchEvent(event);
  }
  
  destroy() {
    if (!this.element) return;
    
    // Remove touch events
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    
    // Remove mouse events
    this.element.removeEventListener('mousedown', this.handleMouseDown);
    this.element.removeEventListener('mousemove', this.handleMouseMove);
    this.element.removeEventListener('mouseup', this.handleMouseEnd);
    this.element.removeEventListener('mouseleave', this.handleMouseEnd);
  }
}

// Pull-to-refresh functionality
export class PullToRefresh {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      threshold: 60, // distance to trigger refresh
      maxDistance: 80, // maximum pull distance
      resistance: 2.5, // resistance when pulling
      refreshCallback: () => Promise.resolve(),
      ...options
    };
    
    this.startY = 0;
    this.currentY = 0;
    this.isRefreshing = false;
    this.isAtTop = true;
    
    this.refreshIndicator = null;
    this.init();
  }
  
  init() {
    this.createRefreshIndicator();
    this.setupEventListeners();
  }
  
  createRefreshIndicator() {
    this.refreshIndicator = document.createElement('div');
    this.refreshIndicator.className = 'pull-to-refresh-indicator';
    this.refreshIndicator.innerHTML = `
      <div class="refresh-spinner">
        <svg class="animate-spin h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="ml-2 text-sm text-gray-600">Pull to refresh</span>
      </div>
    `;
    
    this.refreshIndicator.style.cssText = `
      position: absolute;
      top: -60px;
      left: 0;
      right: 0;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      transition: transform 0.2s ease;
      z-index: 10;
    `;
    
    this.container.style.position = 'relative';
    this.container.insertBefore(this.refreshIndicator, this.container.firstChild);
  }
  
  setupEventListeners() {
    let touchY = 0;
    let isTracking = false;
    
    const handleStart = (y) => {
      this.isAtTop = this.container.scrollTop === 0;
      if (this.isAtTop && !this.isRefreshing) {
        this.startY = y;
        isTracking = true;
      }
    };
    
    const handleMove = (y) => {
      if (!isTracking || this.isRefreshing) return;
      
      this.currentY = y;
      const diff = this.currentY - this.startY;
      
      if (diff > 0 && this.isAtTop) {
        const distance = Math.min(diff / this.options.resistance, this.options.maxDistance);
        
        this.refreshIndicator.style.transform = `translateY(${distance}px)`;
        
        if (distance >= this.options.threshold) {
          this.refreshIndicator.querySelector('span').textContent = 'Release to refresh';
          this.refreshIndicator.classList.add('ready');
        } else {
          this.refreshIndicator.querySelector('span').textContent = 'Pull to refresh';
          this.refreshIndicator.classList.remove('ready');
        }
        
        // Prevent normal scrolling
        if (diff > 10) {
          this.container.style.overflow = 'hidden';
        }
      }
    };
    
    const handleEnd = () => {
      if (!isTracking) return;
      
      const diff = this.currentY - this.startY;
      const distance = Math.min(diff / this.options.resistance, this.options.maxDistance);
      
      isTracking = false;
      this.container.style.overflow = '';
      
      if (distance >= this.options.threshold && !this.isRefreshing) {
        this.triggerRefresh();
      } else {
        this.resetIndicator();
      }
    };
    
    // Touch events
    this.container.addEventListener('touchstart', (e) => {
      touchY = e.touches[0].clientY;
      handleStart(touchY);
    }, { passive: true });
    
    this.container.addEventListener('touchmove', (e) => {
      touchY = e.touches[0].clientY;
      handleMove(touchY);
    }, { passive: true });
    
    this.container.addEventListener('touchend', handleEnd, { passive: true });
  }
  
  async triggerRefresh() {
    this.isRefreshing = true;
    this.refreshIndicator.style.transform = `translateY(${this.options.threshold}px)`;
    this.refreshIndicator.querySelector('span').textContent = 'Refreshing...';
    
    try {
      await this.options.refreshCallback();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setTimeout(() => {
        this.isRefreshing = false;
        this.resetIndicator();
      }, 500);
    }
  }
  
  resetIndicator() {
    this.refreshIndicator.style.transform = 'translateY(0)';
    this.refreshIndicator.classList.remove('ready');
    this.refreshIndicator.querySelector('span').textContent = 'Pull to refresh';
  }
}

// Hook for React components
export function useGestureHandler(elementRef, options = {}) {
  const gestureHandlerRef = React.useRef(null);
  
  React.useEffect(() => {
    if (elementRef.current && !gestureHandlerRef.current) {
      gestureHandlerRef.current = new TouchGestureHandler(elementRef.current, options);
    }
    
    return () => {
      if (gestureHandlerRef.current) {
        gestureHandlerRef.current.destroy();
        gestureHandlerRef.current = null;
      }
    };
  }, [elementRef.current]);
  
  return gestureHandlerRef.current;
}

// Hook for pull-to-refresh
export function usePullToRefresh(containerRef, refreshCallback, options = {}) {
  const pullToRefreshRef = React.useRef(null);
  
  React.useEffect(() => {
    if (containerRef.current && refreshCallback) {
      pullToRefreshRef.current = new PullToRefresh(containerRef.current, {
        refreshCallback,
        ...options
      });
    }
    
    return () => {
      if (pullToRefreshRef.current) {
        pullToRefreshRef.current.destroy?.();
        pullToRefreshRef.current = null;
      }
    };
  }, [containerRef.current, refreshCallback]);
  
  return pullToRefreshRef.current;
}