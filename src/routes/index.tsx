import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import marianaVideoAsset from "@/assets/mariana-video.mp4.asset.json";
import videoThumb from "@/assets/video-thumb.png.asset.json";
import marianaAsset from "@/assets/mariana.jpg.asset.json";
import academiaImpulsiaImg from "@/assets/academia-impulsia-gold.png";
const academiaImpulsiaAsset = { url: academiaImpulsiaImg };
import caixaPandoraAsset from "@/assets/caixa-pandora.png.asset.json";
import parceriasImg from "@/assets/parcerias-palestras.png";
import aulasFlashImg from "@/assets/aulas-flash.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://linkia-mariana.lovable.app/" },
      { name: "twitter:url", content: "https://linkia-mariana.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://linkia-mariana.lovable.app/" },
    ],
  }),
  component: Index,
});

type QKey = "impulsia" | "flash" | "consultoria";

const QUESTIONS: { q: string; options: { label: string; key: QKey }[] }[] = [
  {
    q: "Em que ponto estás com a IA?",
    options: [
      { label: "Ainda não uso, quero começar do zero", key: "impulsia" },
      { label: "Já mexo, mas quero aprender um tema específico já", key: "flash" },
      { label: "Uso bastante e quero levar o meu negócio mais longe", key: "consultoria" },
    ],
  },
  {
    q: "Quanto tempo consegues dedicar por semana?",
    options: [
      { label: "Consigo assistir a uma aula ou ver uma gravação", key: "impulsia" },
      { label: "Pouco - preciso de algo curto e direto ao ponto", key: "flash" },
      { label: "Quero um momento individual e personalizado", key: "consultoria" },
    ],
  },
  {
    q: "Como preferes aprender?",
    options: [
      { label: "Em comunidade, com outras mulheres", key: "impulsia" },
      { label: "Numa aula prática e direta sobre um tema", key: "flash" },
      { label: "Uma a uma, com foco no meu caso", key: "consultoria" },
    ],
  },
  {
    q: "O que descreve melhor o teu momento?",
    options: [
      { label: "Estou a construir o meu negócio agora", key: "impulsia" },
      { label: "Tenho negócio e falta-me tempo para tudo", key: "flash" },
      { label: "Quero escalar e preciso de estratégia", key: "consultoria" },
    ],
  },
  {
    q: "Qual é o teu próximo passo ideal?",
    options: [
      { label: "Entrar numa comunidade e aprender por método", key: "impulsia" },
      { label: "Fazer uma aula rápida e sair a saber usar", key: "flash" },
      { label: "Ter uma conversa 1:1 e um plano à minha medida", key: "consultoria" },
    ],
  },
];

const RESULTS: Record<QKey, { badge: string; title: string; text: string; cta: string; url: string }> = {
  impulsia: {
    badge: "O teu caminho",
    title: "academia impulsia",
    text: "O teu próximo passo é aprenderes com método e em boa companhia. Na ImpulsIA tens aulas práticas, desafios e uma comunidade de mulheres que estão exatamente onde tu estás.",
    cta: "Conhecer a ImpulsIA",
    url: "https://impulsia-ma.lovable.app",
  },
  flash: {
    badge: "O teu caminho",
    title: "aulas flash",
    text: "Queres aprender mas não tens tempo. As Aulas Flash são sessões curtas e práticas sobre um tema específico - entras, aprendes a usar, sais a aplicar já no teu negócio.",
    cta: "Ver as Aulas Flash",
    url: "mailto:marianalmeida.mkt@gmail.com",
  },
  consultoria: {
    badge: "O teu caminho",
    title: "consultoria 1:1",
    text: "Estás pronta para estratégia à tua medida. Vamos olhar para o teu negócio juntas e desenhar um plano de IA que faz sentido para ti - sem receitas genéricas.",
    cta: "Falar comigo no WhatsApp",
    url: "https://wa.me/351935449581",
  },
};

function Sparkles() {
  const items = useMemo(() => {
    const sp = Array.from({ length: 22 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      dur: 4 + Math.random() * 4,
      size: 2 + Math.random() * 2.5,
      marfim: Math.random() > 0.75,
    }));
    const stars = Array.from({ length: 6 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 6,
      dur: 5 + Math.random() * 4,
      size: 9 + Math.random() * 8,
      rosa: Math.random() > 0.5,
    }));
    return { sp, stars };
  }, []);
  return (
    <div className="sparkles" aria-hidden>
      {items.sp.map((s, i) => (
        <span
          key={`s${i}`}
          className="sparkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: s.marfim ? "#F9EFE4" : undefined,
          }}
        />
      ))}
      {items.stars.map((s, i) => (
        <span
          key={`st${i}`}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
            fontSize: `${s.size}px`,
            color: s.rosa ? "#EE90A2" : undefined,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}

function Quiz() {
  const [step, setStep] = useState(-1);
  const [scores, setScores] = useState<Record<QKey, number>>({ impulsia: 0, flash: 0, consultoria: 0 });
  const [done, setDone] = useState(false);

  const restart = () => {
    setStep(-1);
    setScores({ impulsia: 0, flash: 0, consultoria: 0 });
    setDone(false);
  };

  const pick = (key: QKey) => {
    const next = { ...scores, [key]: scores[key] + 1 };
    setScores(next);
    if (step + 1 >= QUESTIONS.length) setDone(true);
    else setStep(step + 1);
  };

  if (done) {
    const winner = (Object.keys(scores) as QKey[]).reduce((a, b) => (scores[b] > scores[a] ? b : a));
    const r = RESULTS[winner];
    return (
      <div className="quiz-card reveal visible">
        <div className="quiz-step">
          <span className="quiz-result-badge">✦ {r.badge}</span>
          <div className="quiz-result-title">{r.title}</div>
          <div className="quiz-result-text">{r.text}</div>
          {r.url ? (
            <a
              className="quiz-cta"
              href={r.url}
              {...(r.url.startsWith("mailto") ? {} : { target: "_blank", rel: "noopener" })}
            >
              {r.cta} →
            </a>
          ) : (
            <span className="quiz-cta" style={{ opacity: 0.6 }}>
              {r.cta} →
            </span>
          )}
          <button className="quiz-restart" onClick={restart}>
            Refazer o quiz
          </button>
        </div>
      </div>
    );
  }

  if (step === -1) {
    return (
      <div className="quiz-card reveal visible">
        <div className="quiz-step">
          <span className="quiz-label">
            <span className="dot"></span> Descobre o teu caminho
          </span>
          <div className="quiz-title">
            como posso ajudar o teu negócio a crescer com Inteligência Artificial?
          </div>
          <div className="quiz-sub">
            5 perguntas rápidas e digo-te exatamente por onde começar.
          </div>
          <button className="quiz-start-btn" onClick={() => setStep(0)}>
            Começar <span className="arr">→</span>
          </button>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[step];
  return (
    <div className="quiz-card reveal visible">
      <div className="quiz-step" key={step}>
        <span className="quiz-label">
          <span className="dot"></span> Pergunta {step + 1} de {QUESTIONS.length}
        </span>
        <div className="quiz-progress">
          {QUESTIONS.map((_, i) => (
            <span key={i} className={i <= step ? "done" : ""}></span>
          ))}
        </div>
        <div className="quiz-question">{q.q}</div>
        <div className="quiz-options">
          {q.options.map((o, i) => (
            <button key={i} className="quiz-option" onClick={() => pick(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Index() {
  useReveal();
  const [flashOpen, setFlashOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
      setHasStarted(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  

  useEffect(() => {
    const id = "ma-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <>
      <div className="aura aura-1"></div>
      <div className="aura aura-2"></div>
      <Sparkles />

      <main className="page">
        <div className="avatar-ring">
          <img className="avatar-placeholder" src={marianaAsset.url} alt="Mariana Almeida" style={{ objectFit: "cover" }} />
        </div>

        <header className="header">
          <h1>
            mariana almeida<span className="dot">.</span>
          </h1>
          <span className="handle-pulse">@mariiana.ai</span>
        </header>

        <div className="news-wrap reveal">
          <a
            className="news-card news-card-active"
            href="https://www.mulheresemia.pt/yapia"
            target="_blank"
            rel="noopener"
          >
            <div className="news-head">
              <span className="news-badge">
                <span className="live-dot" /> Quaseeeee a começar!
              </span>
            </div>

            <h3 className="news-title">
              desafio yapia<br />
              <em>a tua voz, com o melhor da ia.</em>
            </h3>

            <p className="news-text">
              Yap é a nova palavra para conversar sem filtro, e é aí que está o próximo desafio. 15 dias, a partir de <strong>1 de setembro</strong>, para tirares a tua voz do sítio onde ficou parada e usares a IA para dar forma a tudo o que tens para dizer.
            </p>

            <div className="news-footer">
              <div className="news-price-block">
                <span className="news-price-label">Início</span>
                <span className="news-price-value">1 Set</span>
              </div>
              <span className="news-cta">
                Inscreve-te <span className="news-cta-arrow">→</span>
              </span>
            </div>
          </a>
        </div>

        <div className="video-box reveal visible">
          <div className="video-frame" onClick={toggleVideo}>
            <video
              ref={videoRef}
              className="video-embed"
              src={marianaVideoAsset.url}
              playsInline
              preload="metadata"
              onPlay={() => { setIsPlaying(true); setHasStarted(true); }}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            {!hasStarted && <div className="video-cover" aria-hidden="true" style={{ ["--video-thumb" as any]: `url(${videoThumb.url})` }} />}
            {!isPlaying && (
              <button
                type="button"
                className="video-play-btn"
                onClick={(e) => { e.stopPropagation(); toggleVideo(); }}
                aria-label={hasStarted ? "Retomar vídeo" : "Reproduzir vídeo"}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}
          </div>
        </div>


        <div className="socials">
          <a
            className="social-btn"
            href="https://instagram.com/mariiana.ai"
            target="_blank"
            rel="noopener"
            aria-label="Instagram"
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 2.2c3.2 0 3.6 0 4.8.07 1.2.05 1.8.24 2.2.4.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.05.4 2.23.06 1.26.07 1.64.07 4.82s0 3.56-.07 4.82c-.05 1.18-.25 1.8-.4 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.05.35-2.23.4-1.26.06-1.64.07-4.82.07s-3.56 0-4.82-.07c-1.18-.05-1.8-.25-2.23-.4a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.35-1.05-.4-2.23C2.2 15.56 2.2 15.18 2.2 12s0-3.56.07-4.82c.05-1.18.24-1.8.4-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.05-.35 2.23-.4C8.44 2.2 8.82 2.2 12 2.2m0-2.2C8.74 0 8.33 0 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.38A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05 0 8.33 0 8.74 0 12s0 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 24 8.74 24 12 24s3.67 0 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.07-1.28.07-1.69.07-4.95s0-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67 0 15.26 0 12 0m0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m7.84-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0" />
            </svg>
          </a>
          <a className="social-btn" href="https://pt.linkedin.com/in/mariiana-ai" target="_blank" rel="noopener" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
            </svg>
          </a>
          <a className="social-btn" href="mailto:info@marianalmeida.pt" aria-label="Email">
            <svg viewBox="0 0 24 24">
              <path d="M12 12.71 1.15 5.24C1.4 4.52 2.07 4 2.87 4h18.26c.8 0 1.47.52 1.72 1.24L12 12.71zM12 15.1 22.99 7.5c0 .06.01.11.01.17v10.5c0 1-.82 1.83-1.83 1.83H2.83A1.83 1.83 0 0 1 1 18.17V7.67c0-.06 0-.11.01-.17L12 15.1z" />
            </svg>
          </a>
        </div>

        <p className="tagline">
          responde a 5 perguntas e descobre
          <br />o melhor caminho para ti <span className="arrow">↓</span>
        </p>

        <div className="divider"></div>

        <Quiz />

        <h2 className="section-heading reveal">
          <span className="spark">✦</span> Como te posso ajudar hoje
        </h2>
        <div className="carousel-wrap reveal">
          <div className="carousel">
            <a className="product-card" href="https://impulsia-ma.lovable.app" target="_blank" rel="noopener">
              <div className="product-cover cover-1">
                <img src={academiaImpulsiaAsset.url} alt="Academia Impulsia" className="cover-image" />
              </div>
              <div className="cover-banner">Academia Impulsia®</div>
              <div className="product-info">
                <div className="product-name">Cursos e formações para dominares a IA</div>
                <div className="product-desc">Aulas práticas, desafios e uma comunidade de mulheres no mesmo caminho.</div>
                <span className="product-btn">Ver detalhes</span>
              </div>
            </a>

            <button
              type="button"
              className="product-card"
              onClick={() => setFlashOpen(true)}
            >
              <div className="product-cover cover-2">
                <img src={aulasFlashImg} alt="Aulas Flash" className="cover-image" />
              </div>
              <div className="cover-banner">Aulas Flash</div>
              <div className="product-info">
                <div className="product-name">Aulas práticas para aprenderes de forma direta</div>
                <div className="product-desc">Escolhe o teu tema e aprende ferramentas de IA de forma prática e rápida.</div>
                <span className="product-btn">Ver detalhes</span>
              </div>
            </button>


            <a className="product-card" href="https://caixadepandoria.lovable.app" target="_blank" rel="noopener">
              <div className="product-cover cover-3">
                <img src={caixaPandoraAsset.url} alt="Caixa de Pandora" className="cover-image" />
              </div>
              <div className="cover-banner">Caixa de Pandora</div>
              <div className="product-info">
                <div className="product-name">Assistentes de IA para o teu conteúdo</div>
                <div className="product-desc">As tuas assistentes de IA que criam conteúdo e storytelling contigo.</div>
                <span className="product-btn">Ver detalhes</span>
              </div>
            </a>
          </div>
          <p className="carousel-hint">← desliza →</p>
        </div>

        <h2 className="section-heading reveal">
          <span className="spark">✦</span> Calma, ainda há mais!
        </h2>
        <nav className="links reveal">
          <a className="link-card" href="https://www.mulheresemia.pt/" target="_blank" rel="noopener">
            <span className="link-icon li-1">✦</span>
            <span className="link-text">
              <span className="link-title">Comunidade gratuita Mulheres em IA</span>
              <br />
              <span className="link-sub">Guias gratuitos, Prompts e muito mais</span>
            </span>
            <span className="link-arrow">→</span>
          </a>
          <a className="link-card" href="https://wa.me/351935449581" target="_blank" rel="noopener">
            <span className="link-icon li-grad">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
                <path d="M17.472 14.382c-.297-.149-1.759-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.759-.719 2.007-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
              </svg>
            </span>
            <span className="link-text">
              <span className="link-title">Consultoria Individual</span>
              <br />
              <span className="link-sub">Estratégia personalizada de IA para o teu negócio.</span>
            </span>
            <span className="link-arrow">→</span>
          </a>
          <a className="link-card" href="mailto:marianalmeida.mkt@gmail.com">
            <span className="link-icon li-3">🤝</span>
            <span className="link-text">
              <span className="link-title">Parcerias &amp; Palestras</span>
              <br />
              <span className="link-sub">Convida-me para o teu evento ou projeto</span>
            </span>
            <span className="link-arrow">→</span>
          </a>
        </nav>

        <footer>
          <span className="brand">
            mariana almeida<span className="dot">.</span>
          </span>
          <br />
          <span className="accent">porque a IA é para todas</span>
          <br />
          <a href="https://instagram.com/mariiana.ai" target="_blank" rel="noopener">
            @mariiana.ai
          </a>
        </footer>
      </main>
      {flashOpen && (
        <div
          className="flash-modal-overlay"
          onClick={() => setFlashOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Aulas Flash"
        >
          <div className="flash-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="flash-modal-close"
              onClick={() => setFlashOpen(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            <h3 className="flash-modal-title">Aulas Flash</h3>
            <div className="flash-modal-list">
              <a className="flash-item" href="https://imagens-ia.lovable.app/" target="_blank" rel="noopener">
                <span className="flash-dot flash-dot-green" />
                <div className="flash-item-text">
                  <div className="flash-item-title">Cria Imagens com IA</div>
                  <div className="flash-item-sub">Ao vivo | Dia 01 de Agosto — disponível agora</div>
                </div>
                <span className="flash-arrow">→</span>
              </a>
              <a className="flash-item" href="https://aula-flash-claude.lovable.app/" target="_blank" rel="noopener">
                <span className="flash-dot flash-dot-dark" />
                <div className="flash-item-text">
                  <div className="flash-item-title">Iniciação ao Claude.ai</div>
                  <div className="flash-item-sub">Gravada — disponível agora</div>
                </div>
                <span className="flash-arrow">→</span>
              </a>
              <a className="flash-item" href="https://mariiana-lp.lovable.app/" target="_blank" rel="noopener">
                <span className="flash-dot flash-dot-gold" />
                <div className="flash-item-text">
                  <div className="flash-item-title">Criação de Landing Pages com IA</div>
                  <div className="flash-item-sub">Gravada — disponível agora</div>
                </div>
                <span className="flash-arrow">→</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );

}
