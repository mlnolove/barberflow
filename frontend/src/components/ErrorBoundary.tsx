import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Sem isso, um erro em qualquer componente derruba a árvore inteira do
 * React silenciosamente — a tela fica em branco e não sobra nenhuma pista
 * de por que. Mostrar o erro na tela é o que permite diagnosticar algo
 * rodando fora de um ambiente de desenvolvimento (ex.: o WebView do app
 * nativo, onde não há acesso ao console do navegador).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro não tratado na interface:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6 text-white">
          <div className="max-w-md">
            <h1 className="font-serif text-lg font-semibold text-red-400">Algo deu errado</h1>
            <p className="mt-2 text-sm text-ink-300">
              A aplicação encontrou um erro e não conseguiu continuar. Detalhes abaixo — envie
              essa mensagem se for reportar o problema.
            </p>
            <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-white/[0.06] bg-ink-900 p-3 text-xs text-red-300">
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
            <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-4">
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
