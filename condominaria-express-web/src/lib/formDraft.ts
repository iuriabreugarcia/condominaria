export function carregarRascunho<T>(
  chave: string,
  valorInicial: T,
): T {
  try {
    const bruto = window.localStorage.getItem(chave);

    if (!bruto) {
      return valorInicial;
    }

    const parsed = JSON.parse(bruto) as Partial<T>;

    return {
      ...valorInicial,
      ...parsed,
    };
  } catch {
    return valorInicial;
  }
}

export function salvarRascunho<T>(
  chave: string,
  valor: T,
) {
  try {
    window.localStorage.setItem(
      chave,
      JSON.stringify(valor),
    );
  } catch {
    // Ignora falhas de storage.
  }
}

export function limparRascunho(chave: string) {
  try {
    window.localStorage.removeItem(chave);
  } catch {
    // Ignora falhas de storage.
  }
}
