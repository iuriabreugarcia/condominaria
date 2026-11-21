type ErrorLike = {
  message?: unknown;
  status?: unknown;
  payload?: unknown;
  response?: unknown;
  erro?: unknown;
  error?: unknown;
};

function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (!error || typeof error !== 'object') {
    return '';
  }

  const data = error as ErrorLike;

  if (typeof data.message === 'string') {
    return data.message;
  }

  if (typeof data.erro === 'string') {
    return data.erro;
  }

  if (typeof data.error === 'string') {
    return data.error;
  }

  if (data.payload && typeof data.payload === 'object') {
    const payload = data.payload as ErrorLike;

    if (typeof payload.message === 'string') {
      return payload.message;
    }

    if (typeof payload.erro === 'string') {
      return payload.erro;
    }

    if (typeof payload.error === 'string') {
      return payload.error;
    }
  }

  return '';
}

function extractStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const status = (error as ErrorLike).status;
  const numero = Number(status);

  return Number.isFinite(numero) ? numero : null;
}

export function friendlyErrorMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a solicitação.',
) {
  const cleanMessage = extractMessage(error).trim();
  const normalized = cleanMessage.toLowerCase();
  const status = extractStatus(error);

  if (status === 401) {
    return 'Sua sessão expirou. Faça login novamente para continuar.';
  }

  if (status === 403) {
    return 'Você não tem permissão para acessar esta informação.';
  }

  if (status === 404) {
    return 'As informações solicitadas não foram encontradas.';
  }

  if (status && status >= 500) {
    return 'Não foi possível concluir a operação agora. Se estiver enviando um arquivo, verifique o tamanho e tente novamente.';
  }

  if (!cleanMessage) {
    return fallback;
  }

  if (
    normalized.includes('internal server error') ||
    normalized.includes('prismaclientknownrequesterror') ||
    normalized.includes('p2022') ||
    normalized.includes('unknown column') ||
    normalized.includes('cannot read properties') ||
    normalized.includes('is not defined') ||
    normalized.includes('unexpected token')
  ) {
    return 'Não foi possível concluir a operação agora. Se estiver enviando um arquivo, verifique o tamanho e tente novamente.';
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }

  if (normalized.includes('unauthorized') || normalized.includes('401')) {
    return 'Sua sessão expirou. Faça login novamente para continuar.';
  }

  if (normalized.includes('forbidden') || normalized.includes('403')) {
    return 'Você não tem permissão para acessar esta informação.';
  }

  if (normalized.includes('not found') || normalized.includes('404')) {
    return 'As informações solicitadas não foram encontradas.';
  }

  return cleanMessage;
}
