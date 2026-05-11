import { useEffect, useRef, useState } from "react";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsOfService from "./pages/TermsOfService.jsx";
import "./App.css";

const tickerItems = [
  "Amazon Product Analysis",
  "Flipkart Review Intelligence",
  "Myntra Fashion Reviews",
  "Meesho Deal Verification",
  "AI-Powered Risk Alerts",
  "Price Intelligence",
  "Real-time Review Analysis",
  "Smart Buy Decisions",
];

const steps = [
  {
    number: "1",
    title: "Open any product page",
    description:
      "Browse Amazon, Flipkart, or your preferred retailer, just as you normally would. No setup or configuration required.",
  },
  {
    number: "2",
    title: "Click TrueCart",
    description:
      "Launch the extension to generate a focused AI summary from large volumes of customer feedback instantly.",
  },
  {
    number: "3",
    title: "Get Instant Insights",
    description:
      "Review strengths, concerns, and a clear purchase recommendation in seconds. Make your decision with confidence.",
  },
];

const features = [
  {
    icon: "♡",
    title: "What Users Love",
    description:
      "The AI distills recurring praise into product strengths customers mention most, so the key advantages are immediately clear.",
  },
  {
    icon: "⚡",
    title: "Top Complaints",
    description:
      "Our analysis highlights recurring frustrations and performance concerns that may materially affect your purchase decision.",
  },
  {
    icon: "⚠",
    title: "Risk Alerts",
    description:
      "Issues repeated in high-risk areas, including safety concerns and hidden drawbacks, are surfaced before you commit.",
  },
  {
    icon: "✓",
    title: "Smart Buy Decision",
    description:
      "Combines everything to give actionable guidance on whether to proceed, wait, or consider a stronger alternative.",
  },
  {
    icon: "₹",
    title: "Price Insight",
    description:
      "We consider product context and customer sentiment to determine whether the current price represents fair market value.",
  },
  {
    icon: "◈",
    title: "Find Better Deals",
    description:
      "Quickly suggests comparable offers across platforms so you can identify stronger alternatives before you buy.",
  },
];

const reasons = [
  "Based on real, verified user reviews",
  "No fake ratings or paid bias",
  "Highlights what actually matters",
  "Helps you decide in seconds",
];

const faqItems = [
  {
    question: "Which shopping sites does TrueCart support?",
    answer:
      "TrueCart is designed for major Indian shopping platforms including Amazon, Flipkart, Myntra, and Meesho.",
  },
  {
    question: "Do I need to learn anything before using it?",
    answer:
      "No. Open a product page, click the extension, and TrueCart summarizes the key buying signals for you.",
  },
  {
    question: "Is TrueCart free?",
    answer:
      "This landing page presents TrueCart as a free Chrome extension experience for shoppers.",
  },
];

function createParticle(context, colors, getDimensions) {
  return {
    x: 0,
    y: 0,
    r: 0,
    vx: 0,
    vy: 0,
    a: 0,
    maxA: 0,
    life: 0,
    maxLife: 0,
    c: colors[0],
    reset(initial) {
      const { width, height } = getDimensions();
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.r = Math.random() * 1.5 + 0.3;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -(Math.random() * 0.4 + 0.15);
      this.a = 0;
      this.maxA = Math.random() * 0.5 + 0.1;
      this.life = 0;
      this.maxLife = Math.random() * 400 + 200;
      this.c = colors[Math.floor(Math.random() * colors.length)];
    },
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life += 1;

      const t = this.life / this.maxLife;
      this.a = t < 0.1 ? t * 10 * this.maxA : t > 0.8 ? (1 - t) * 5 * this.maxA : this.maxA;

      if (this.life > this.maxLife || this.y < -10) {
        this.reset(false);
      }
    },
    draw() {
      context.beginPath();
      context.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      context.fillStyle = `${this.c}${this.a})`;
      context.fill();
    },
  };
}

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function HomePage() {
  return (
    <>
      <section className="hero section">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <div className="hero-eyebrow">
                <div className="hero-eyebrow-pulse" />
                Powered AI
              </div>
              <h1 className="hero-h1">
                <span className="line">
                  <span>Don&apos;t Read</span>
                </span>
                <span className="line">
                  <span className="grad">Reviews.</span>
                </span>
                <span className="line">
                  <span>Understand Them.</span>
                </span>
              </h1>
              <p className="hero-p">
                TrueCart converts scattered customer feedback into concise, decision-ready insights
                so you can evaluate product quality, risks, and value with confidence.
              </p>
              <div className="hero-cta-row">
                <a href="#" className="btn-primary">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Add to Chrome — Free
                </a>
                <a href="#how" className="btn-ghost">
                  See how it works
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              </div>
              <div className="hero-proof">
                <div className="proof-faces">
                  <div className="proof-face">😊</div>
                  <div className="proof-face">🙂</div>
                  <div className="proof-face">😄</div>
                </div>
                <div className="proof-stars">★★★★★</div>
                <div className="proof-text">
                  <strong>10,000+</strong> shoppers trust TrueCart
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="mockup-glow" />
              <div className="mockup">
                <div className="mockup-bar">
                  <div className="dot dot-r" />
                  <div className="dot dot-y" />
                  <div className="dot dot-g" />
                  <div className="mockup-url">amazon.com/product/...</div>
                </div>
                <div className="mockup-body">
                  <div className="m-badge">
                    <div className="m-badge-dot" /> TrueCart Analysis
                  </div>
                  <div className="m-product-row">
                    <div className="m-product-img">⌚</div>
                    <div>
                      <div className="m-product-name">
                        boAt Rockerz 450 Bluetooth On-Ear Headphones with Mic
                      </div>
                      <div className="m-product-meta">2,847 reviews analyzed</div>
                    </div>
                  </div>
                  <div className="m-cards">
                    <div className="m-card">
                      <div className="m-card-label">What Users Love</div>
                      <div className="m-bullets">
                        <div className="m-bullet">Excellent bass for the price point</div>
                        <div className="m-bullet">40hr battery life consistently reported</div>
                        <div className="m-bullet">Comfortable for 6+ hour sessions</div>
                      </div>
                    </div>
                    <div className="m-card">
                      <div className="m-card-label">Verdict</div>
                      <div className="m-card-val purple">
                        Good value - minor build quality concerns in 12% of reviews
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="ticker-wrap">
        <div className="ticker">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <div key={`${item}-${index}`} className="ticker-item">
              <span className="ticker-sep">✦</span>
              <strong>{item.split(" ")[0]}</strong>
              <span>{item.replace(`${item.split(" ")[0]} `, "")}</span>
            </div>
          ))}
        </div>
      </div>

      <section id="how" className="steps-section section">
        <div className="wrap">
          <div className="steps-head">
            <div className="s-label">Process</div>
            <h2 className="s-title reveal">Shopping Smarter in 3 Steps</h2>
            <p className="s-sub reveal reveal-delay-1">
              No learning curve. Works on every major Indian shopping platform out of the box.
            </p>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`step reveal ${index ? `reveal-delay-${index + 1}` : ""}`.trim()}
              >
                <div className="step-num">{step.number}</div>
                <div className="step-title">{step.title}</div>
                <p className="step-desc">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <section id="features" className="features-section section">
        <div className="wrap">
          <div className="features-head">
            <div className="s-label reveal">What We Analyze</div>
            <h2 className="s-title reveal reveal-delay-1">Every Detail Analyzed For You</h2>
            <p className="s-sub reveal reveal-delay-2">
              Cut through inconsistent ratings and lengthy review sections with a cleaner, smarter
              summary.
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`feat reveal ${index % 3 ? `reveal-delay-${(index % 3) + 1}` : ""}`.trim()}
              >
                <div className="feat-icon">{feature.icon}</div>
                <div className="feat-title">{feature.title}</div>
                <p className="feat-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <section id="why" className="why-section section">
        <div className="wrap">
          <div className="why-inner">
            <div>
              <div className="s-label reveal">Why TrueCart</div>
              <h2 className="s-title reveal reveal-delay-1">
                Built for Smarter
                <br />
                Buying Decisions
              </h2>
              <p className="s-sub reveal reveal-delay-2">
                Every feature is designed around one goal - helping you buy with confidence, not
                regret.
              </p>
              <div className="why-list">
                {reasons.map((reason, index) => (
                  <div key={reason} className={`why-item reveal reveal-delay-${index + 1}`}>
                    <div className="why-check">✓</div>
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            <div className="why-visual reveal reveal-delay-2">
              <div className="floating-badge">
                <span className="fb-dot" /> Live on Flipkart
              </div>
              <div className="why-stats-card">
                <div className="stat-grid">
                  <div className="stat-item">
                    <div className="stat-num" data-count="10">
                      0
                    </div>
                    <div className="stat-label">K+ Active Users</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-num" data-count="98">
                      0
                    </div>
                    <div className="stat-label">% Accuracy Rate</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-num" data-count="4">
                      0
                    </div>
                    <div className="stat-label">Platforms Supported</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-num" data-count="2">
                      0
                    </div>
                    <div className="stat-label">Sec Average Analysis</div>
                  </div>
                </div>
              </div>
              <div className="floating-badge2">✨ Saved ₹4,200 on last purchase</div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <section id="faq" className="faq-section section">
        <div className="wrap">
          <div className="features-head faq-head">
            <div className="s-label reveal">FAQ</div>
            <h2 className="s-title reveal reveal-delay-1">Everything You Need to Know</h2>
          </div>
          <div className="faq-grid">
            {faqItems.map((item, index) => (
              <article
                key={item.question}
                className={`faq-card reveal ${index ? `reveal-delay-${index + 1}` : ""}`.trim()}
              >
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section section">
        <div className="wrap">
          <div className="cta-box reveal">
            <h2 className="cta-h">
              Stop Buying Regret.
              <br />
              <span className="grad">Start Buying Truth.</span>
            </h2>
            <p className="cta-sub">
              Your review intelligence assistant is one click away. Free forever.
            </p>
            <div className="cta-btn-wrap">
              <a href="#" className="btn-primary">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Add to Chrome — Free
              </a>
              {/* <a href="#" className="btn-ghost">
                View on Chrome Web Store
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a> */}
            </div>
          </div>
        </div>
      </section>
      <section className="coming-soon">
        <div className="coming-soon-badge">
          Mobile App Coming Soon
        </div>
        <h2>TrueCart Mobile App</h2>
        <p>Scan reviews instantly inside Amazon, Flipkart, Myntra and more —
          directly on your phone.</p>
        <div className="store-buttons">
          <button className="store-btn disabled">
            <span>📱</span>
            Android - Coming Soon
          </button>
          <button className="store-btn disabled">
            <span>🍎</span>
            IOS - Coming Soon
          </button>
        </div>
      </section>
    </>
  );
}

function SiteNav({ currentPath, navRef, onRouteClick }) {
  const isLegalPage = currentPath !== "/";

  return (
    <nav ref={navRef} className="truthlens-nav" id="nav">
      <a href="/" className="nav-logo" onClick={(event) => onRouteClick(event, "/")}>
        {/* <div className="nav-logo-dot" /> */}
        <img src="/maintrueecart-logo-removebg-preview.png" alt="TrueCart" className="nav-logo-image" />
        TrueCart
      </a>

      {isLegalPage ? (
        <ul className="nav-links">
          <li>
            <a href="/" onClick={(event) => onRouteClick(event, "/")}>
              Home
            </a>
          </li>
          <li>
            <a href="/privacy" onClick={(event) => onRouteClick(event, "/privacy")}>
              Privacy
            </a>
          </li>
          <li>
            <a href="/terms" onClick={(event) => onRouteClick(event, "/terms")}>
              Terms
            </a>
          </li>
        </ul>
      ) : (
        <ul className="nav-links">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#how">How It Works</a>
          </li>
          <li>
            <a href="#why">Why Us</a>
          </li>
          <li>
            <a href="#faq">FAQ</a>
          </li>
        </ul>
      )}

      <button type="button" className="nav-cta">
        Add to Chrome — Free
      </button>
    </nav>
  );
}

function SiteFooter({ onRouteClick }) {
  return (
    <footer className="truthlens-footer">
      <div className="foot-logo">TrueCart</div>
      <ul className="foot-links">
        <li>
          <a href="/privacy" onClick={(event) => onRouteClick(event, "/privacy")}>
            Privacy Policy
          </a>
        </li>
        <li>
          <a href="/terms" onClick={(event) => onRouteClick(event, "/terms")}>
            Terms of Service
          </a>
        </li>
      </ul>
      <div className="foot-copy">© 2026 TrueCart. All Rights Reserved.</div>
    </footer>
  );
}

function App() {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const ringRef = useRef(null);
  const navRef = useRef(null);
  const isHomePage = pathname === "/";

  useEffect(() => {
    document.body.classList.add("truecart-site-body");

    return () => {
      document.body.classList.remove("truecart-site-body");
    };
  }, []);

  useEffect(() => {
    const titles = {
      "/": "TrueCart — AI-Powered Review Intelligence",
      "/privacy": "Privacy Policy — TrueCart",
      "/terms": "Terms of Service — TrueCart",
    };

    document.title = titles[pathname] || titles["/"];
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!isHomePage || !window.location.hash) {
      return;
    }

    const targetId = window.location.hash.replace("#", "");
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isHomePage, pathname]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) {
      return undefined;
    }

    const handleScroll = () => {
      nav.classList.toggle("scrolled", window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  useEffect(() => {
    // if (!isHomePage) {
    //   return undefined;
    // }

    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    const ring = ringRef.current;

    if (!canvas || !cursor || !ring) {
      return undefined;
    }

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;
    let cursorFrame = 0;
    let canvasFrame = 0;

    const handleMouseMove = (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const animateCursor = () => {
      ringX += (mouseX - ringX) * 0.14;
      ringY += (mouseY - ringY) * 0.14;

      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;

      cursorFrame = window.requestAnimationFrame(animateCursor);
    };

    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    let width = 0;
    let height = 0;
    let particles = [];
    const colors = ["rgba(124,92,252,", "rgba(160,127,255,", "rgba(0,212,170,"];

    const resizeCanvas = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles = Array.from({ length: 120 }, () => {
        const particle = createParticle(context, colors, () => ({ width, height }));
        particle.reset(true);
        return particle;
      });
    };

    const drawConnections = () => {
      const threshold = 140;

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < threshold) {
            const alpha = (1 - dist / threshold) * 0.06;
            context.beginPath();
            context.moveTo(particles[i].x, particles[i].y);
            context.lineTo(particles[j].x, particles[j].y);
            context.strokeStyle = `rgba(124,92,252,${alpha})`;
            context.lineWidth = 0.5;
            context.stroke();
          }
        }
      }
    };

    const animateCanvas = () => {
      context.clearRect(0, 0, width, height);
      drawConnections();
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });
      canvasFrame = window.requestAnimationFrame(animateCanvas);
    };

    const reveals = Array.from(document.querySelectorAll(".reveal"));
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    reveals.forEach((element) => revealObserver.observe(element));

    const counters = Array.from(document.querySelectorAll("[data-count]"));
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target;
          const target = Number.parseInt(element.dataset.count || "0", 10);
          const suffixMap = {
            "98": "%",
            "2": "s",
            "10": "K+",
          };
          const suffix = suffixMap[element.dataset.count || ""] || "";
          let startTimestamp = 0;
          const duration = 1800;

          const step = (timestamp) => {
            if (!startTimestamp) {
              startTimestamp = timestamp;
            }

            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const eased = 1 - (1 - progress) ** 3;
            element.textContent = `${Math.floor(eased * target)}${progress === 1 ? suffix : ""}`;

            if (progress < 1) {
              window.requestAnimationFrame(step);
            }
          };

          window.requestAnimationFrame(step);
          countObserver.unobserve(element);
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((element) => countObserver.observe(element));

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", resizeCanvas);

    resizeCanvas();
    animateCursor();
    animateCanvas();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", resizeCanvas);
      revealObserver.disconnect();
      countObserver.disconnect();
      window.cancelAnimationFrame(cursorFrame);
      window.cancelAnimationFrame(canvasFrame);
    };
  }, [isHomePage]);

  const handleRouteClick = (event, href) => {
    event.preventDefault();

    if (href.startsWith("#")) {
      if (pathname !== "/") {
        window.history.pushState({}, "", `/${href}`);
        setPathname("/");
      } else {
        const section = document.querySelector(href);
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      return;
    }

    if (normalizePathname(href) === pathname) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    window.history.pushState({}, "", href);
    setPathname(normalizePathname(href));
  };

  let pageContent = <HomePage />;
  if (pathname === "/privacy") {
    pageContent = <PrivacyPolicy />;
  } else if (pathname === "/terms") {
    pageContent = <TermsOfService />;
  }

  return (
    <div className="truthlens-page">
      <div ref={cursorRef} className="truthlens-cursor" />
      <div ref={ringRef} className="truthlens-cursor-ring" />
      <canvas ref={canvasRef} className="truthlens-bg-canvas" />
      <div className="truthlens-noise" />

      <SiteNav currentPath={pathname} navRef={navRef} onRouteClick={handleRouteClick} />
      {pageContent}
      <SiteFooter onRouteClick={handleRouteClick} />
    </div>
  );
}

export default App;
