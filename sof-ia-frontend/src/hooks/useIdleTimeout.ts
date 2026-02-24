import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIdleTimeoutOptions {
  timeout?: number; // tiempo total en milisegundos (default: 20 minutos)
  warningTime?: number; // tiempo de advertencia en milisegundos (default: 1 minuto)
  onTimeout: () => void;
  onWarning?: () => void;
}

export const useIdleTimeout = ({
  timeout = 20 * 60 * 1000, // 20 minutos
  warningTime = 60 * 1000, // 1 minuto
  onTimeout,
  onWarning,
}: UseIdleTimeoutOptions) => {
  const [isIdle, setIsIdle] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeout);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setIsIdle(false);
    setShowWarning(false);
    setRemainingTime(timeout);
    lastActivityRef.current = Date.now();

    // Timer para advertencia
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      if (onWarning) {
        onWarning();
      }
      
      // Iniciar countdown
      let tiempoRestante = timeout - warningTime;
      countdownRef.current = setInterval(() => {
        tiempoRestante -= 1000;
        setRemainingTime(tiempoRestante);
        
        if (tiempoRestante <= 0) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
        }
      }, 1000);
    }, timeout - warningTime);

    // Timer para timeout total
    timeoutRef.current = setTimeout(() => {
      clearAllTimers();
      setIsIdle(true);
      onTimeout();
    }, timeout);
  }, [timeout, warningTime, onTimeout, onWarning, clearAllTimers]);

  useEffect(() => {
    const events = [
      'mousemove',
      'mousedown',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      const now = Date.now();
      // Solo resetear si ha pasado suficiente tiempo desde la última actividad
      // para evitar resets excesivos
      if (now - lastActivityRef.current > 1000) {
        resetTimer();
      }
    };

    // Agregar event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Iniciar el timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [resetTimer, clearAllTimers]);

  return {
    isIdle,
    showWarning,
    remainingTime,
    resetTimer,
  };
};

export default useIdleTimeout;
