import { clearToken, getToken } from './auth';
import { friendlyErrorMessage } from './friendlyErrorMessage';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = RequestInit & {
  auth?: boolean;
};

async function parsePayload(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  return response.text();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    auth = true,
    headers,
    ...rest
  } = options;

  const finalHeaders = new Headers(headers);

  if (!finalHeaders.has('Content-Type') && rest.body) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getToken();

    if (token) {
      finalHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  const payload = await parsePayload(response);

  if (!response.ok) {
    if (response.status === 413) {
    throw new ApiError(
      'O arquivo enviado é muito grande. Envie um comprovante menor ou em PDF/imagem otimizada.',
      response.status,
      null,
    );
  }

  if (response.status === 401) {
      clearToken();
    }

    const rawMessage =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload
        ? String((payload as { message: unknown }).message)
        : payload;

    const message = friendlyErrorMessage(
      {
        message: rawMessage,
        status: response.status,
        payload,
      },
      'Erro ao comunicar com a API.',
    );

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}
