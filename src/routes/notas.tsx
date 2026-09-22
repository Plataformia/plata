import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

/**
 * Bloco de notas do evento da nilg.ai.
 *
 * Corre todo no navegador. As notas ficam em localStorage, neste
 * dispositivo, e nunca saem daqui: sem base de dados, sem servidor,
 * sem terceiros. Por isso a página leva noindex e há sempre forma de
 * exportar (.md e .json): limpar os dados do navegador apaga tudo.
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
      { name: "theme-color", content: "#F6EFE6" },
    ],
  }),
  component: Notas,
});

const EVENTO = "nilg.ai";
const STORAGE_KEY = "linkia.notas.nilg.v1";
const DRAFT_KEY = "linkia.notas.nilg.draft.v1";

type TagKey = "insight" | "ideia" | "acao" | "citacao" | "contacto";

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

  const grupos = agrupar(notes);
  grupos.forEach((grupo) => {
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

  // Com a lista a crescer, a caixa de escrita fica longe. O botao
  // flutuante traz-nos de volta a ela sem ter de fazer scroll a mao.
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

  const contagens = useMemo(() => {
    const base: Record<TagKey, number> = { insight: 0, ideia: 0, acao: 0, citacao: 0, contacto: 0 };
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
      areaRef.current?.focus();
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
    setTexto("");
    areaRef.current?.focus();
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
    <>
      <div className="aura aura-1"></div>
      <div className="aura aura-2"></div>

      <main className="notas-page">
        <header className="notas-header">
          <span className="notas-eyebrow">
            <span className="notas-dot" /> bloco de notas
          </span>
          <h1 className="notas-title">
            {EVENTO}
            <span className="notas-title-dot">.</span>
          </h1>
          <p className="notas-sub">
            Escreve durante as sessões, exporta no fim. Fica tudo neste dispositivo.
          </p>
        </header>

        <section className="notas-card" aria-label="Escrever nota" ref={composerRef}>
          <label className="notas-field">
            <span className="notas-field-label">Sessão</span>
            <input
              className="notas-input"
              value={talk}
              onChange={(e) => setTalk(e.target.value)}
              placeholder="Keynote, painel, nome de quem está a falar..."
              list="notas-sessoes"
              maxLength={120}
            />
          </label>
          <datalist id="notas-sessoes">
            {sessoes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          <textarea
            ref={areaRef}
            className="notas-textarea"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={aoTeclar}
            placeholder="O que acabaste de ouvir?"
            rows={4}
            maxLength={5000}
          />

          <div className="notas-tags" role="group" aria-label="Tipo de nota">
            {TAGS.map((t) => (
              <button
                key={t.key}
                type="button"
                title={t.hint}
                aria-pressed={tag === t.key}
                className={`notas-tag ${tag === t.key ? "ativa" : ""}`}
                onClick={() => setTag(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="notas-guardar-linha">
            <span className="notas-atalho">Ctrl + Enter guarda</span>
            <button
              type="button"
              className="notas-btn-principal"
              onClick={guardar}
              disabled={!texto.trim()}
            >
              Guardar nota
            </button>
          </div>
        </section>

        {notes.length > 0 && (
          <div className="notas-resumo">
            <span className="notas-resumo-item">
              <strong>{notes.length}</strong> {notes.length === 1 ? "nota" : "notas"}
            </span>
            {TAGS.filter((t) => contagens[t.key] > 0).map((t) => (
              <span key={t.key} className="notas-resumo-item">
                <strong>{contagens[t.key]}</strong> {t.label}
              </span>
            ))}
            {porFazer > 0 && (
              <span className="notas-resumo-item notas-resumo-acao">
                <strong>{porFazer}</strong> por fazer
              </span>
            )}
          </div>
        )}

        {notes.length > 0 && (
          <section className="notas-filtros" aria-label="Filtrar notas">
            <input
              className="notas-input notas-busca"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar nas notas..."
            />
            <div className="notas-tags">
              <button
                type="button"
                aria-pressed={filtro === "todas"}
                className={`notas-tag ${filtro === "todas" ? "ativa" : ""}`}
                onClick={() => setFiltro("todas")}
              >
                todas
              </button>
              {TAGS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={filtro === t.key}
                  className={`notas-tag ${filtro === t.key ? "ativa" : ""}`}
                  onClick={() => setFiltro(filtro === t.key ? "todas" : t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="notas-lista" aria-live="polite">
          {!carregado && <p className="notas-vazio">A abrir as notas...</p>}

          {carregado && !notes.length && (
            <p className="notas-vazio">
              Ainda não há nada aqui. A primeira nota entra na caixa lá em cima.
            </p>
          )}

          {carregado && notes.length > 0 && !visiveis.length && (
            <p className="notas-vazio">Nenhuma nota bate com essa procura.</p>
          )}

          {grupos.map((grupo) => (
            <div key={grupo.talk} className="notas-grupo">
              <h2 className="notas-grupo-titulo">{grupo.talk}</h2>
              {[...grupo.notes].reverse().map((n) => (
                <article
                  key={n.id}
                  className={`notas-item ${n.tag === "acao" && n.done ? "feita" : ""}`}
                >
                  <div className="notas-item-topo">
                    <span className={`notas-badge tag-${n.tag}`}>{TAG_LABEL[n.tag]}</span>
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
                      <div className="notas-item-acoes">
                        <button
                          type="button"
                          className="notas-btn-texto"
                          onClick={() => gravarEdicao(n.id)}
                        >
                          Gravar
                        </button>
                        <button
                          type="button"
                          className="notas-btn-texto"
                          onClick={() => setAEditar(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="notas-item-texto">{n.text}</p>
                      <div className="notas-item-acoes">
                        {n.tag === "acao" && (
                          <button
                            type="button"
                            className="notas-btn-texto"
                            onClick={() => alternarFeito(n.id)}
                          >
                            {n.done ? "Reabrir" : "Marcar feita"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="notas-btn-texto"
                          onClick={() => comecarEdicao(n)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="notas-btn-texto perigo"
                          onClick={() => apagar(n.id)}
                        >
                          Apagar
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          ))}
        </section>

        <section className="notas-exportar" aria-label="Exportar notas">
          <h2 className="notas-exportar-titulo">Levar as notas daqui</h2>
          <div className="notas-exportar-botoes">
            <button type="button" className="notas-btn-secundario" onClick={copiarTudo}>
              Copiar tudo
            </button>
            <button type="button" className="notas-btn-secundario" onClick={exportarMd}>
              Descarregar .md
            </button>
            <button type="button" className="notas-btn-secundario" onClick={exportarJson}>
              Cópia .json
            </button>
            <button
              type="button"
              className="notas-btn-secundario"
              onClick={() => ficheiroRef.current?.click()}
            >
              Importar .json
            </button>
            <button
              type="button"
              className={`notas-btn-secundario perigo ${confirmarLimpeza ? "armado" : ""}`}
              onClick={limparTudo}
              disabled={!notes.length}
            >
              {confirmarLimpeza ? "Carrega outra vez para apagar" : "Apagar tudo"}
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
            As notas ficam guardadas só neste navegador, neste dispositivo. Não há servidor, não há
            conta, não há cópia noutro lado. Se limpares os dados do navegador, desaparecem:
            descarrega o .md no fim do evento.
          </p>
        </section>

        <button
          type="button"
          className={`notas-flutuante ${mostrarAtalho ? "visivel" : ""}`}
          onClick={irParaEscrever}
          aria-hidden={!mostrarAtalho}
          tabIndex={mostrarAtalho ? 0 : -1}
        >
          nova nota
        </button>

        <div className={`notas-aviso ${aviso ? "visivel" : ""}`} role="status">
          {aviso}
        </div>
      </main>
    </>
  );
}
