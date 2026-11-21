import { useCallback, useEffect, useState } from 'react';
import { friendlyErrorMessage } from '../lib/friendlyErrorMessage';

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type UseAsyncStateOptions = {
  immediate?: boolean;
  fallbackError?: string;
};

export function useAsyncState<T>(
  loader: () => Promise<T>,
  options: UseAsyncStateOptions = {},
) {
  const {
    immediate = true,
    fallbackError = 'Não foi possível carregar as informações.',
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const data = await loader();

      setState({
        data,
        loading: false,
        error: null,
      });

      return data;
    } catch (error) {
      const message = friendlyErrorMessage(error, fallbackError);

      setState((current) => ({
        ...current,
        loading: false,
        error: message,
      }));

      throw error;
    }
  }, [fallbackError, loader]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    if (immediate) {
      void execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
    reload: execute,
    reset,
  };
}
