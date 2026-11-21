import { friendlyErrorMessage } from './friendlyErrorMessage';

type ApiRequestOptions = RequestInit & {
  json?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
};

type ApiErrorPayload = {
  message?: string;
  erro?: string;
  error?: string;
  detalhes?: unknown;
  [key: string]: unknown;
};

const env = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const API_BASE_URL = env?.VITE_API_URL ?? env?.VITE_API_BASE_URL ?? '';

function buildQuery(query?: ApiRequestOptions['query']) {
  if (!query) return '';

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    params.set(key, String(value));
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : '';
}

function buildUrl(path: string, query?: ApiRequestOptions['query']) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const queryString = buildQuery(query);

  if (isAbsolute) {
    return `${path}${queryString}`;
  }

  const base = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${base}${cleanPath}${queryString}`;
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function resolveErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const data = payload as ApiErrorPayload;

    return friendlyErrorMessage(
      data.message ?? data.erro ?? data.error ?? fallback,
      fallback,
    );
  }

  return friendlyErrorMessage(payload, fallback);
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { json, query, headers, ...requestOptions } = options;

  const finalHeaders = new Headers(headers);

  let body = requestOptions.body;

  if (json !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const response = await fetch(buildUrl(path, query), {
    credentials: 'include',
    ...requestOptions,
    headers: finalHeaders,
    body,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      resolveErrorMessage(payload, 'Não foi possível concluir a solicitação.'),
      payload,
    );
  }

  return payload as T;
}

export const api = {
  get<T>(path: string, query?: ApiRequestOptions['query']) {
    return apiRequest<T>(path, {
      method: 'GET',
      query,
    });
  },

  post<T>(path: string, json?: unknown) {
    return apiRequest<T>(path, {
      method: 'POST',
      json,
    });
  },

  put<T>(path: string, json?: unknown) {
    return apiRequest<T>(path, {
      method: 'PUT',
      json,
    });
  },

  patch<T>(path: string, json?: unknown) {
    return apiRequest<T>(path, {
      method: 'PATCH',
      json,
    });
  },

  delete<T>(path: string, json?: unknown) {
    return apiRequest<T>(path, {
      method: 'DELETE',
      json,
    });
  },
};
