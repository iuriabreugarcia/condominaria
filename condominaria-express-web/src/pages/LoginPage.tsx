import {
  ArrowRight,
CloudOff,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePageTitle } from '../hooks/usePageTitle';
import { ApiError, apiRequest } from '../lib/api';
import { setToken } from '../lib/auth';
import type { LoginResponse } from '../types/api';
import { DemoLoginProfiles } from '../components/DemoLoginProfiles';

function mensagemErroLogin(error: unknown) {
  if (error instanceof ApiError) {
    const mensagem = String(error.message ?? '').trim();

    if (!mensagem) {
      return 'Não foi possível realizar o login. Confira seus dados e tente novamente.';
    }

    const normalizada = mensagem.toLowerCase();

    if (
      normalizada.includes('internal server error') ||
      normalizada.includes('prisma') ||
      normalizada.includes('unknown column') ||
      normalizada.includes('cannot read')
    ) {
      return 'Não foi possível acessar agora. Tente novamente em instantes ou acione a administração.';
    }

    if (
      normalizada.includes('unauthorized') ||
      normalizada.includes('credenciais') ||
      normalizada.includes('senha') ||
      normalizada.includes('401')
    ) {
      return 'E-mail ou senha inválidos. Confira os dados e tente novamente.';
    }

    if (
      normalizada.includes('forbidden') ||
      normalizada.includes('403') ||
      normalizada.includes('permiss')
    ) {
      return 'Seu usuário não tem permissão para acessar este portal.';
    }

    return mensagem;
  }

  if (error instanceof Error && error.message.trim()) {
    const mensagem = error.message.trim();

    if (
      mensagem.toLowerCase().includes('failed to fetch') ||
      mensagem.toLowerCase().includes('network')
    ) {
      return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
    }

    return mensagem;
  }

  return 'Não foi possível realizar o login. Confira seus dados e tente novamente.';
}

export function LoginPage() {
  // Ajuste visual do login comercial.
  // data-login-ajuste-botao-comercial="true"

  usePageTitle('Login');
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [capsLockAtivo, setCapsLockAtivo] = useState(false);
  const [emailTocado, setEmailTocado] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const senhaRef = useRef<HTMLInputElement | null>(null);
  const erroRef = useRef<HTMLDivElement | null>(null);

  const emailFormatoValido =
    email.trim().length === 0 ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const mostrarErroEmail =
    emailTocado &&
    email.trim().length > 0 &&
    !emailFormatoValido;

  const formularioValido =
    email.trim().length > 0 &&
    senha.trim().length > 0 &&
    emailFormatoValido;

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    function sincronizarAutofillLogin() {
      const emailAutopreenchido = emailRef.current?.value ?? '';
      const senhaAutopreenchida = senhaRef.current?.value ?? '';

      if (emailAutopreenchido && emailAutopreenchido !== email) {
        setEmail(emailAutopreenchido.trim().toLowerCase());
      }

      if (senhaAutopreenchida && senhaAutopreenchida !== senha) {
        setSenha(senhaAutopreenchida);
      }
    }

    const timerInicial = window.setTimeout(
      sincronizarAutofillLogin,
      250,
    );

    const timerTardio = window.setTimeout(
      sincronizarAutofillLogin,
      900,
    );
    return () => {
      window.clearTimeout(timerInicial);
      window.clearTimeout(timerTardio);
    };
  }, [email, senha]);

  useEffect(() => {
    if (!erro) {
      return;
    }

    erroRef.current?.focus({
      preventScroll: true,
    });
  }, [erro]);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (enviando) {
      return;
    }

    if (!online) {
      setErro(
        'Sem conexão com a internet. Verifique sua rede e tente novamente.',
      );
      return;
    }

    if (
      email.trim().length === 0 ||
      senha.trim().length === 0
    ) {
      setEmailTocado(true);
      setErro('Preencha e-mail e senha.');
      return;
    }

    if (!emailFormatoValido) {
      setEmailTocado(true);
      setErro('Informe um e-mail válido.');
      return;
    }

    const emailNormalizado = email.trim().toLowerCase();

    setEmail(emailNormalizado);
    setErro('');
    setEnviando(true);

    try {
      const resposta = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          email: emailNormalizado,
          senha,
        }),
      });

      setToken(resposta.access_token);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErro(mensagemErroLogin(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login-page-compact flex h-[100svh] min-h-[100svh] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-white to-slate-100 px-3 py-3 sm:px-4">
      <div className="login-shell-compact w-full max-w-6xl overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl shadow-orange-100/70">
                {/* Coluna institucional removida para evitar corte em desktop. */}


        <section className="login-content-compact flex items-center justify-center p-4 sm:p-5 lg:p-6">
          <div className="w-full max-w-6xl" data-login-sem-coluna-institucional="true">
            <div className="login-mobile-brand lg:hidden">
              <div className="login-mobile-brand__row">
                <img
                  src="/portal/favicon.svg?v=7"
                  alt="Condominaria Express"
                  className="login-mobile-brand__icon"
                />
                <div className="min-w-0">
                  <p className="login-mobile-brand__name">Condominaria Express</p>
                  <p className="login-mobile-brand__portal">Portal do Morador</p>
                </div>
              </div>
              <p className="login-mobile-brand__intro">
                Entre para acompanhar informações e serviços do condomínio.
              </p>
            </div>

            <div className="mb-7 hidden lg:block">
            <div className="login-brand-compact login-brand-compact--topo mb-3" data-login-brand-topo="true">
              <img
                src="/portal/favicon.svg?v=7"
                alt="Condominaria Express"
                className="login-brand-compact__icon"
              />

              <div className="min-w-0">
                <p className="login-brand-compact__name">
                  Condominaria Express
                </p>

                <p className="login-brand-compact__portal">
                  Portal do Morador
                </p>
              </div>
            </div>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">
                Acesso
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Entrar no Portal
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Informe suas credenciais para continuar.
              </p>
            </div>

            {!online ? (
              <div
                role="status"
                aria-live="polite"
                className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-red-700 shadow-sm">
                  <CloudOff className="h-4 w-4" />
                </span>

                <div>
                  <p className="text-sm font-bold">
                    Sem conexão com a internet
                  </p>

                  <p className="mt-1 text-xs font-bold leading-5">
                    Verifique sua rede para acessar o Portal do Morador.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="login-demo-layout" data-login-demo-layout="true">
            <aside className="login-demo-layout__profiles" aria-label="Perfis demo de acesso">
              <DemoLoginProfiles
                          onSelectProfile={(emailDemo, senhaDemo) => {
                            setEmail(emailDemo);
                            setSenha(senhaDemo);
                          }}
                        />
            </aside>

            <div className="login-demo-layout__form">

            <div
              className="login-commercial-inline-row"
              data-login-commercial-row="true"
            >
              <a
                href="/portal/comercial/"
                className="login-commercial-link"
                data-login-commercial-link="true"
              >
                Ver apresentação comercial
              </a>
            </div>
<form
              noValidate
              onSubmit={entrar}
              aria-busy={enviando}
              className="grid gap-5"
            >
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  E-mail
                </span>

                <div className="flex h-14 items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white pl-4 pr-0 shadow-sm transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                  <Mail className="h-5 w-5 shrink-0 text-slate-400" />

                  <input
                    ref={emailRef}
                    type="email"
                    name="email"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    enterKeyHint="next"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);

                      if (erro) {
                        setErro('');
                      }
                    }}
                    onBlur={(event) => {
                      setEmailTocado(true);
                      setEmail(event.target.value.trim().toLowerCase());
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        senha.trim().length === 0
                      ) {
                        event.preventDefault();
                        senhaRef.current?.focus();
                      }
                    }}
                    disabled={enviando}
                    aria-invalid={Boolean(erro) || mostrarErroEmail}
                    aria-describedby={
                      erro && mostrarErroEmail
                        ? 'erro-login email-formato-login'
                        : erro
                          ? 'erro-login'
                          : mostrarErroEmail
                            ? 'email-formato-login'
                            : undefined
                    }
                    className="h-full w-full border-0 bg-transparent pl-[15px] pr-4 text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                    placeholder="voce@exemplo.com"
                    required
                  />
                </div>

                {mostrarErroEmail ? (
                  <p
                    id="email-formato-login"
                    className="text-xs font-bold text-amber-700"
                  >
                    Informe um e-mail válido.
                  </p>
                ) : null}
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Senha
                </span>

                <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                  <LockKeyhole className="h-5 w-5 shrink-0 text-slate-400" />

                  <input
                    ref={senhaRef}
                    type={mostrarSenha ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    enterKeyHint="go"
                    value={senha}
                    onChange={(event) => {
                      setSenha(event.target.value);

                      if (erro) {
                        setErro('');
                      }
                    }}
                    onKeyDown={(event) =>
                      setCapsLockAtivo(event.getModifierState('CapsLock'))
                    }
                    onKeyUp={(event) =>
                      setCapsLockAtivo(event.getModifierState('CapsLock'))
                    }
                    onBlur={() => setCapsLockAtivo(false)}
                    disabled={enviando}
                    aria-invalid={Boolean(erro)}
                    aria-describedby={
                      erro && capsLockAtivo
                        ? 'erro-login caps-lock-login'
                        : erro
                          ? 'erro-login'
                          : capsLockAtivo
                            ? 'caps-lock-login'
                            : undefined
                    }
                    className="h-full w-full min-w-0 border-0 bg-transparent pl-[15px] pr-2 text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
                    placeholder="••••••••"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarSenha((atual) => !atual)}
                    disabled={enviando}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={mostrarSenha}
                    title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {capsLockAtivo ? (
                  <p
                    id="caps-lock-login"
                    className="text-xs font-bold text-amber-700"
                  >
                    Caps Lock ativado.
                  </p>
                ) : null}
              </label>

              {erro ? (
                <div
                  ref={erroRef}
                  tabIndex={-1}
                  id="erro-login"
                  role="alert"
                  aria-live="assertive"
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700 outline-none"
                >
                  {erro}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={enviando || !formularioValido || !online}
                className="mt-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {enviando ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}

                <span aria-live="polite">
                  {!online
                    ? 'Sem conexão'
                    : enviando
                      ? 'Entrando...'
                      : formularioValido
                        ? 'Acessar portal'
                        : mostrarErroEmail
                          ? 'Corrija o e-mail'
                          : 'Preencha e-mail e senha'}
                </span>
              </button>
            </form>
            </div>
          </div>
</div>
        </section>
      </div>
    </main>
  );
}
