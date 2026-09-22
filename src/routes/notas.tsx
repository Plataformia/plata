import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Download,
  FileJson,
  Moon,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

/**
 * Bloco de notas do evento da nilg.ai.
 *
 * Corre todo no navegador. As notas ficam em localStorage, neste
 * dispositivo, e nunca saem daqui: sem base de dados, sem servidor,
 * sem terceiros. Por isso a página leva noindex e há sempre forma de
 * exportar (.md e .json): limpar os dados do navegador apaga tudo.
 *
 * Desenhado para iPad: duas colunas a partir dos 768px, painel de
 * escrita sempre à vista à esquerda, notas à direita. Tema claro e
 * escuro porque as salas de conferência costumam estar às escuras.
 */

export const Route = createFileRoute("/notas")({
  head: () => ({
    meta: [
      { title: "notas · nilg.ai" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Bloco de notas do evento da nilg.ai. Corre no navegador, as notas ficam neste dispositivo.",
      },
      { name: "theme-color", content: "#F7F1E8" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "notas nilg.ai" },
    ],
  }),
  component: Notas,
});

const EVENTO = "nilg.ai";
const STORAGE_KEY = "linkia.notas.nilg.v1";
const DRAFT_KEY = "linkia.notas.nilg.draft.v1";
const TEMA_KEY = "linkia.notas.nilg.tema.v1";

type TagKey = "insight" | "ideia" | "acao" | "citacao" | "contacto";
type Tema = "claro" | "escuro";

const TAGS: { key: TagKey; label: string; hint: string }[] = [
  { key: "insight", label: "insight", hint: "Algo que mudou a minha cabeça" },
  { key: "ideia", label: "ideia", hint: "Para usar no meu conteúdo ou negócio" },
  { key: "acao", label: "ação", hint: "Algo para fazer depois" },
  { key: "citacao", label: "citação", hint: "Frase para guardar" },
  { key: "contacto", label: "contacto", hint: "Pessoa para falar" },
];

const TAG_LABEL: Record<TagKey, string> = {
  insight: "insight",
  ideia: "ideia",
  acao: "ação",
  citacao: "citação",
  contacto: "contacto",
};

type Note = {
  id: string;
  text: string;
  tag: TagKey;
  talk: string;
  createdAt: number;
  done?: boolean;
};

type Stored = {
  version: 1;
  talk: string;
  notes: Note[];
};

const SEM_SESSAO = "Sem sessão";

function novoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isTag(value: unknown): value is TagKey {
  return typeof value === "string" && TAGS.some((t) => t.key === value);
}

/** Aceita só o que tem forma de nota. Ficheiros importados são dados de fora. */
function limparNotas(input: unknown): Note[] {
  if (!Array.isArray(input)) return [];
  const notas: Note[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    if (typeof raw.text !== "string" || !raw.text.trim()) continue;
    notas.push({
      id: typeof raw.id === "string" && raw.id ? raw.id : novoId(),
      text: raw.text.slice(0, 5000),
      tag: isTag(raw.tag) ? raw.tag : "insight",
      talk: typeof raw.talk === "string" ? raw.talk.slice(0, 120) : "",
      createdAt:
        typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
          ? raw.createdAt
          : Date.now(),
      done: raw.done === true ? true : undefined,
    });
  }
  return notas;
}

function ler(): Stored {
  const vazio: Stored = { version: 1, talk: "", notes: [] };
  if (typeof window === "undefined") return vazio;
  try {
    const cru = window.localStorage.getItem(STORAGE_KEY);
    if (!cru) return vazio;
    const dados = JSON.parse(cru) as Record<string, unknown>;
    return {
      version: 1,
      talk: typeof dados.talk === "string" ? dados.talk : "",
      notes: limparNotas(dados.notes),
    };
  } catch {
    return vazio;
  }
}

function horas(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function dia(ts: number) {
  return new Date(ts).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

function nomeFicheiro(ext: string) {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `notas-nilg-ai-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
}

/** Agrupa por sessão, mantendo a ordem de chegada dentro de cada grupo. */
function agrupar(notes: Note[]) {
  const ordenadas = [...notes].sort((a, b) => a.createdAt - b.createdAt);
  const mapa = new Map<string, Note[]>();
  ordenadas.forEach((n) => {
    const chave = n.talk.trim() || SEM_SESSAO;
    const lista = mapa.get(chave);
    if (lista) lista.push(n);
    else mapa.set(chave, [n]);
  });
  return [...mapa.entries()].map(([talk, lista]) => ({ talk, notes: lista }));
}

function paraMarkdown(notes: Note[]) {
  const linhas: string[] = [
    `# Notas · ${EVENTO}`,
    "",
    `Exportado a ${new Date().toLocaleString("pt-PT")} · ${notes.length} ${notes.length === 1 ? "nota" : "notas"}`,
    "",
  ];

  const porFazer = notes.filter((n) => n.tag === "acao" && !n.done);
  if (porFazer.length) {
    linhas.push("## Por fazer", "");
    porFazer.forEach((n) => linhas.push(`- [ ] ${n.text.replace(/\n+/g, " ")}`));
    linhas.push("");
  }

  agrupar(notes).forEach((grupo) => {
    linhas.push(`## ${grupo.talk}`, "");
    grupo.notes.forEach((n) => {
      const marca = n.tag === "acao" ? (n.done ? "[x] " : "[ ] ") : "";
      linhas.push(
        `**${dia(n.createdAt)} ${horas(n.createdAt)} · ${TAG_LABEL[n.tag]}**`,
        "",
        `${marca}${n.text}`,
        "",
      );
    });
  });

  return linhas.join("\n").trimEnd() + "\n";
}

function descarregar(conteudo: string, tipo: string, nome: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Notas() {
  const [carregado, setCarregado] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [talk, setTalk] = useState("");
  const [texto, setTexto] = useState("");
  const [tag, setTag] = useState<TagKey>("insight");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<TagKey | "todas">("todas");
  const [aEditar, setAEditar] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [aviso, setAviso] = useState("");
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);
  const [mostrarAtalho, setMostrarAtalho] = useState(false);
  const [ultimaId, setUltimaId] = useState<string | null>(null);
  const [tema, setTema] = useState<Tema>("claro");

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLElement>(null);
  const ficheiroRef = useRef<HTMLInputElement>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dizer = useCallback((msg: string) => {
    setAviso(msg);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(""), 3200);
  }, []);

  useEffect(
    () => () => {
      if (avisoTimer.current) clearTimeout(avisoTimer.current);
    },
    [],
  );

  // Lê o que já estava guardado. Só depois disto é que se escreve,
  // senão o primeiro render apagava tudo.
  useEffect(() => {
    const guardado = ler();
    setNotes(guardado.notes);
    setTalk(guardado.talk);
    try {
      const rascunho = window.localStorage.getItem(DRAFT_KEY);
      if (rascunho) setTexto(rascunho);
      const temaGuardado = window.localStorage.getItem(TEMA_KEY);
      if (temaGuardado === "escuro" || temaGuardado === "claro") {
        setTema(temaGuardado);
      } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        setTema("escuro");
      }
    } catch {
      /* navegador sem localStorage: segue-se sem rascunho */
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      const dados: Stored = { version: 1, talk, notes };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    } catch {
      dizer("Não consegui guardar neste navegador. Exporta o que tens.");
    }
  }, [carregado, notes, talk, dizer]);

  // Rascunho: se a página fechar a meio de uma nota, o texto volta.
  useEffect(() => {
    if (!carregado) return;
    try {
      if (texto) window.localStorage.setItem(DRAFT_KEY, texto);
      else window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* sem localStorage não há rascunho, a nota em si continua a dar para guardar */
    }
  }, [carregado, texto]);

  // O tema pinta também o fundo do documento e a barra do Safari,
  // senão o ressalto do scroll no iPad mostra o creme por baixo.
  useEffect(() => {
    if (!carregado) return;
    const raiz = document.documentElement;
    raiz.classList.toggle("notas-escuro", tema === "escuro");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", tema === "escuro" ? "#17100E" : "#F7F1E8");
    try {
      window.localStorage.setItem(TEMA_KEY, tema);
    } catch {
      /* sem localStorage o tema não fica memorizado, mas funciona na sessão */
    }
    return () => raiz.classList.remove("notas-escuro");
  }, [carregado, tema]);

  // A caixa de escrita cresce com o texto em vez de abrir barra de scroll.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 420)}px`;
  }, [texto]);

  // Em ecrã estreito a caixa de escrita sai de vista. O botão flutuante
  // traz-nos de volta a ela. No iPad ela está sempre à esquerda, por isso
  // o CSS esconde-o a partir das duas colunas.
  useEffect(() => {
    const alvo = composerRef.current;
    if (!alvo || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entrada]) => setMostrarAtalho(!entrada.isIntersecting), {
      threshold: 0,
    });
    io.observe(alvo);
    return () => io.disconnect();
  }, []);

  const irParaEscrever = () => {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => areaRef.current?.focus(), 320);
  };

  const sessoes = useMemo(() => {
    const vistas = new Set<string>();
    [...notes]
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((n) => {
        const t = n.talk.trim();
        if (t) vistas.add(t);
      });
    return [...vistas];
  }, [notes]);

  // As sessoes anteriores servem para saltar para outra sem escrever;
  // a que ja esta no campo nao precisa de atalho.
  const outrasSessoes = useMemo(
    () => sessoes.filter((s) => s !== talk.trim()).slice(0, 3),
    [sessoes, talk],
  );

  const contagens = useMemo(() => {
    const base: Record<TagKey, number> = {
      insight: 0,
      ideia: 0,
      acao: 0,
      citacao: 0,
      contacto: 0,
    };
    notes.forEach((n) => {
      base[n.tag] += 1;
    });
    return base;
  }, [notes]);

  const porFazer = useMemo(() => notes.filter((n) => n.tag === "acao" && !n.done).length, [notes]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return notes.filter((n) => {
      if (filtro !== "todas" && n.tag !== filtro) return false;
      if (!termo) return true;
      return n.text.toLowerCase().includes(termo) || n.talk.toLowerCase().includes(termo);
    });
  }, [notes, busca, filtro]);

  const grupos = useMemo(() => agrupar(visiveis).reverse(), [visiveis]);

  const guardar = () => {
    const limpo = texto.trim();
    if (!limpo) {
      areaRef.current?.focus({ preventScroll: true });
      return;
    }
    const nova: Note = {
      id: novoId(),
      text: limpo.slice(0, 5000),
      tag,
      talk: talk.trim(),
      createdAt: Date.now(),
      ...(tag === "acao" ? { done: false } : {}),
    };
    setNotes((atuais) => [...atuais, nova]);
    setUltimaId(nova.id);
    setTexto("");
    // preventScroll: sem isto o painel fixo do iPad salta de volta ao topo
    areaRef.current?.focus({ preventScroll: true });
  };

  const apagar = (id: string) => {
    setNotes((atuais) => atuais.filter((n) => n.id !== id));
    dizer("Nota apagada.");
  };

  const alternarFeito = (id: string) => {
    setNotes((atuais) => atuais.map((n) => (n.id === id ? { ...n, done: !n.done } : n)));
  };

  const comecarEdicao = (n: Note) => {
    setAEditar(n.id);
    setTextoEdicao(n.text);
  };

  const gravarEdicao = (id: string) => {
    const limpo = textoEdicao.trim();
    if (!limpo) {
      apagar(id);
    } else {
      setNotes((atuais) =>
        atuais.map((n) => (n.id === id ? { ...n, text: limpo.slice(0, 5000) } : n)),
      );
    }
    setAEditar(null);
    setTextoEdicao("");
  };

  const copiarTudo = async () => {
    if (!notes.length) return dizer("Ainda não há notas para copiar.");
    const md = paraMarkdown(notes);
    try {
      await navigator.clipboard.writeText(md);
      dizer("Notas copiadas em Markdown.");
    } catch {
      descarregar(md, "text/markdown;charset=utf-8", nomeFicheiro("md"));
      dizer("O navegador não deixou copiar, descarreguei o ficheiro.");
    }
  };

  const exportarMd = () => {
    if (!notes.length) return dizer("Ainda não há notas para exportar.");
    descarregar(paraMarkdown(notes), "text/markdown;charset=utf-8", nomeFicheiro("md"));
    dizer("Ficheiro .md descarregado.");
  };

  const exportarJson = () => {
    if (!notes.length) return dizer("Ainda não há notas para guardar.");
    const copia: Stored = { version: 1, talk, notes };
    descarregar(JSON.stringify(copia, null, 2), "application/json", nomeFicheiro("json"));
    dizer("Cópia de segurança .json descarregada.");
  };

  const importar = (ficheiro: File) => {
    if (ficheiro.size > 2_000_000) {
      dizer("Ficheiro demasiado grande.");
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const dados = JSON.parse(String(leitor.result)) as Record<string, unknown>;
        const chegadas = limparNotas(Array.isArray(dados) ? dados : dados.notes);
        if (!chegadas.length) {
          dizer("Não encontrei notas nesse ficheiro.");
          return;
        }
        setNotes((atuais) => {
          const ids = new Set(atuais.map((n) => n.id));
          const novas = chegadas.filter((n) => !ids.has(n.id));
          dizer(`${novas.length} ${novas.length === 1 ? "nota importada" : "notas importadas"}.`);
          return [...atuais, ...novas].sort((a, b) => a.createdAt - b.createdAt);
        });
      } catch {
        dizer("Esse ficheiro não é uma cópia válida.");
      }
    };
    leitor.onerror = () => dizer("Não consegui ler o ficheiro.");
    leitor.readAsText(ficheiro);
  };

  const limparTudo = () => {
    if (!confirmarLimpeza) {
      setConfirmarLimpeza(true);
      setTimeout(() => setConfirmarLimpeza(false), 5000);
      return;
    }
    setNotes([]);
    setConfirmarLimpeza(false);
    dizer("Apaguei todas as notas deste dispositivo.");
  };

  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      guardar();
    }
  };

  return (
    <div className="notas-shell" data-tema={tema}>
      <div className="notas-fundo" aria-hidden />

      <div className="notas-grelha">
        <div className="notas-painel">
          <header className="notas-header">
            <div className="notas-header-topo">
              <span className="notas-eyebrow">
                <span className="notas-ponto" /> bloco de notas
              </span>
              <button
                type="button"
                className="notas-tema"
                onClick={() => setTema(tema === "claro" ? "escuro" : "claro")}
                aria-label={tema === "claro" ? "Mudar para tema escuro" : "Mudar para tema claro"}
                title={tema === "claro" ? "Tema escuro" : "Tema claro"}
              >
                {tema === "claro" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            </div>
            <h1 className="notas-titulo">
              {EVENTO}
              <span className="notas-titulo-ponto">.</span>
            </h1>
            <p className="notas-sub">
              Escreve durante as sessões, exporta no fim. Fica tudo neste dispositivo.
            </p>
          </header>

          <section className="notas-caixa" aria-label="Escrever nota" ref={composerRef}>
            <div className="notas-campo">
              <label className="notas-campo-etiqueta" htmlFor="notas-sessao">
                Sessão
              </label>
              <div className="notas-campo-input">
                <input
                  id="notas-sessao"
                  className="notas-input"
                  value={talk}
                  onChange={(e) => setTalk(e.target.value)}
                  placeholder="Keynote, painel, nome de quem está a falar..."
                  list="notas-sessoes"
                  maxLength={120}
                  autoComplete="off"
                />
                {talk && (
                  <button
                    type="button"
                    className="notas-limpar-campo"
                    onClick={() => setTalk("")}
                    aria-label="Limpar sessão"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <datalist id="notas-sessoes">
                {sessoes.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              {outrasSessoes.length > 0 && (
                <div className="notas-sessoes-recentes">
                  {outrasSessoes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="notas-mini-chip"
                      onClick={() => setTalk(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea
              ref={areaRef}
              className="notas-textarea"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={aoTeclar}
              placeholder="O que acabaste de ouvir?"
              rows={3}
              maxLength={5000}
            />

            <div className="notas-chips" role="group" aria-label="Tipo de nota">
              {TAGS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  title={t.hint}
                  aria-pressed={tag === t.key}
                  className={`notas-chip tom-${t.key} ${tag === t.key ? "ativa" : ""}`}
                  onClick={() => setTag(t.key)}
                >
                  <span className="notas-chip-ponto" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="notas-guardar">
              <span className="notas-atalho">
                <kbd>⌘</kbd>
                <kbd>↵</kbd> guarda
              </span>
              <button
                type="button"
                className="notas-botao-principal"
                onClick={guardar}
                disabled={!texto.trim()}
              >
                <Plus size={16} />
                Guardar nota
              </button>
            </div>
          </section>

          {notes.length > 0 && (
            <div className="notas-metricas">
              <div className="notas-metrica destaque">
                <span className="notas-metrica-valor">{notes.length}</span>
                <span className="notas-metrica-etiqueta">
                  {notes.length === 1 ? "nota" : "notas"}
                </span>
              </div>
              <div className="notas-metrica">
                <span className="notas-metrica-valor">{sessoes.length || 1}</span>
                <span className="notas-metrica-etiqueta">
                  {sessoes.length === 1 ? "sessão" : "sessões"}
                </span>
              </div>
              <div className={`notas-metrica ${porFazer ? "alerta" : ""}`}>
                <span className="notas-metrica-valor">{porFazer}</span>
                <span className="notas-metrica-etiqueta">por fazer</span>
              </div>
            </div>
          )}

          <section className="notas-ferramentas" aria-label="Exportar notas">
            <h2 className="notas-ferramentas-titulo">Levar as notas daqui</h2>
            <div className="notas-ferramentas-botoes">
              <button type="button" className="notas-botao" onClick={copiarTudo}>
                <Copy size={15} />
                Copiar tudo
              </button>
              <button type="button" className="notas-botao" onClick={exportarMd}>
                <Download size={15} />
                Descarregar .md
              </button>
              <button type="button" className="notas-botao" onClick={exportarJson}>
                <FileJson size={15} />
                Cópia .json
              </button>
              <button
                type="button"
                className="notas-botao"
                onClick={() => ficheiroRef.current?.click()}
              >
                <Upload size={15} />
                Importar .json
              </button>
              <button
                type="button"
                className={`notas-botao perigo ${confirmarLimpeza ? "armado" : ""}`}
                onClick={limparTudo}
                disabled={!notes.length}
              >
                <Trash2 size={15} />
                {confirmarLimpeza ? "Carrega outra vez" : "Apagar tudo"}
              </button>
            </div>
            <input
              ref={ficheiroRef}
              type="file"
              accept="application/json,.json"
              className="notas-ficheiro"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importar(f);
                e.target.value = "";
              }}
            />
            <p className="notas-privacidade">
              As notas ficam guardadas só neste navegador, neste dispositivo. Não há servidor, não
              há conta, não há cópia noutro lado. Se limpares os dados do navegador, desaparecem:
              descarrega o .md no fim do evento.
            </p>
          </section>
        </div>

        <div className="notas-coluna">
          {notes.length > 0 && (
            <div className="notas-barra">
              <div className="notas-procura">
                <Search size={16} className="notas-procura-icone" />
                <input
                  className="notas-input notas-input-procura"
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Procurar nas notas..."
                  aria-label="Procurar nas notas"
                />
              </div>
              <div className="notas-chips" role="group" aria-label="Filtrar por tipo">
                <button
                  type="button"
                  aria-pressed={filtro === "todas"}
                  className={`notas-chip ${filtro === "todas" ? "ativa" : ""}`}
                  onClick={() => setFiltro("todas")}
                >
                  todas
                  <span className="notas-chip-conta">{notes.length}</span>
                </button>
                {TAGS.filter((t) => contagens[t.key] > 0).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={filtro === t.key}
                    className={`notas-chip tom-${t.key} ${filtro === t.key ? "ativa" : ""}`}
                    onClick={() => setFiltro(filtro === t.key ? "todas" : t.key)}
                  >
                    <span className="notas-chip-ponto" />
                    {t.label}
                    <span className="notas-chip-conta">{contagens[t.key]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <section className="notas-lista" aria-live="polite">
            {!carregado && <p className="notas-vazio">A abrir as notas...</p>}

            {carregado && !notes.length && (
              <div className="notas-vazio-estado">
                <div className="notas-vazio-marca" aria-hidden>
                  <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
                    <rect
                      x="9"
                      y="6"
                      width="30"
                      height="36"
                      rx="5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M16 17h16M16 24h16M16 31h9"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="notas-vazio-texto">
                  Ainda não há nada aqui. A primeira nota entra na caixa
                  <span className="notas-so-largo"> à esquerda</span>
                  <span className="notas-so-estreito"> lá em cima</span>.
                </p>
              </div>
            )}

            {carregado && notes.length > 0 && !visiveis.length && (
              <p className="notas-vazio">Nenhuma nota bate com essa procura.</p>
            )}

            {grupos.map((grupo) => (
              <div key={grupo.talk} className="notas-grupo">
                <div className="notas-grupo-cabeca">
                  <h2 className="notas-grupo-titulo">{grupo.talk}</h2>
                  <span className="notas-grupo-conta">
                    {grupo.notes.length} {grupo.notes.length === 1 ? "nota" : "notas"}
                  </span>
                </div>
                <div className="notas-grupo-lista">
                  {[...grupo.notes].reverse().map((n) => (
                    <article
                      key={n.id}
                      className={`notas-cartao tom-${n.tag} ${n.tag === "acao" && n.done ? "feita" : ""} ${
                        n.id === ultimaId ? "acabada" : ""
                      }`}
                    >
                      <div className="notas-cartao-topo">
                        <span className="notas-selo">
                          <span className="notas-chip-ponto" />
                          {TAG_LABEL[n.tag]}
                        </span>
                        <span className="notas-hora">
                          {dia(n.createdAt)} · {horas(n.createdAt)}
                        </span>
                      </div>

                      {aEditar === n.id ? (
                        <>
                          <textarea
                            className="notas-textarea notas-textarea-edicao"
                            value={textoEdicao}
                            onChange={(e) => setTextoEdicao(e.target.value)}
                            rows={4}
                            maxLength={5000}
                            autoFocus
                          />
                          <div className="notas-cartao-acoes">
                            <button
                              type="button"
                              className="notas-acao"
                              onClick={() => gravarEdicao(n.id)}
                            >
                              <Check size={14} />
                              Gravar
                            </button>
                            <button
                              type="button"
                              className="notas-acao"
                              onClick={() => setAEditar(null)}
                            >
                              <X size={14} />
                              Cancelar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="notas-cartao-texto">{n.text}</p>
                          <div className="notas-cartao-acoes">
                            {n.tag === "acao" && (
                              <button
                                type="button"
                                className={`notas-acao ${n.done ? "" : "sublinhada"}`}
                                onClick={() => alternarFeito(n.id)}
                              >
                                <Check size={14} />
                                {n.done ? "Reabrir" : "Marcar feita"}
                              </button>
                            )}
                            <button
                              type="button"
                              className="notas-acao"
                              onClick={() => comecarEdicao(n)}
                            >
                              <Pencil size={14} />
                              Editar
                            </button>
                            <button
                              type="button"
                              className="notas-acao perigo"
                              onClick={() => apagar(n.id)}
                            >
                              <Trash2 size={14} />
                              Apagar
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      <button
        type="button"
        className={`notas-flutuante ${mostrarAtalho ? "visivel" : ""}`}
        onClick={irParaEscrever}
        aria-hidden={!mostrarAtalho}
        tabIndex={mostrarAtalho ? 0 : -1}
      >
        <Plus size={16} />
        nova nota
      </button>

      <div className={`notas-aviso ${aviso ? "visivel" : ""}`} role="status">
        {aviso}
      </div>
    </div>
  );
}
