import { useState, useCallback } from 'react';

export const useWorkflowHistory = initialState => {
  const [state, setState] = useState({
    history: [initialState],
    currentIndex: 0,
  });

  const pushState = useCallback(action => {
    setState(currentState => {
      const { history, currentIndex } = currentState;
      const newCurrentState = typeof action === 'function' ? action(history[currentIndex]) : action;

      if (JSON.stringify(newCurrentState) === JSON.stringify(history[currentIndex])) {
        return currentState;
      }

      const newHistory = history.slice(0, currentIndex + 1);
      newHistory.push(newCurrentState);

      return {
        history: newHistory,
        currentIndex: newHistory.length - 1,
      };
    });
  }, []);

  const resetState = useCallback(newState => {
    setState({
      history: [newState],
      currentIndex: 0,
    });
  }, []);

  const undo = useCallback(() => {
    setState(currentState => {
      if (currentState.currentIndex > 0) {
        return {
          ...currentState,
          currentIndex: currentState.currentIndex - 1,
        };
      }
      return currentState;
    });
  }, []);

  const redo = useCallback(() => {
    setState(currentState => {
      if (currentState.currentIndex < currentState.history.length - 1) {
        return {
          ...currentState,
          currentIndex: currentState.currentIndex + 1,
        };
      }
      return currentState;
    });
  }, []);

  return {
    state: state.history[state.currentIndex],
    setState: pushState,
    resetState,
    undo,
    redo,
    canUndo: state.currentIndex > 0,
    canRedo: state.currentIndex < state.history.length - 1,
  };
};
