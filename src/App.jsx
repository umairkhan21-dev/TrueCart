import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:5000";

function InsightCard({ tone, label, items }) {
  if (!items?.length) return null;

  return (
    <article className={`insight-card ${tone}`}>
      <div className="insight-rail" />
      <div className="insight-content">
        <div className="section-label">{label}</div>
        <ul className="insight-list">
          {items.map((item, index) => (
            <li key={`${label}-${index}`}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function shortenProductTitle(title, maxLength = 42) {
  if (!title) return "";
  if (title.length <= maxLength) return title;

  const trimmed = title.slice(0, maxLength).trim();
  const lastSpace = trimmed.lastIndexOf(" ");

  if (lastSpace > 24) {
    return `${trimmed.slice(0, lastSpace)}...`;
  }

  return `${trimmed}...`;
}

function formatVerdict(verdict) {
  if (!verdict) return "Unknown";
  if (verdict === "good deal") return "Good Deal";
  return verdict.charAt(0).toUpperCase() + verdict.slice(1);
}

function getVerdictTone(verdict) {
  if (verdict === "good deal") return "positive";
  if (verdict === "overpriced") return "negative";
  return "neutral";
}

function parsePriceValue(price) {
  if (!price) return null;
  const digits = String(price).replace(/[^\d.]/g, "");
  return digits ? Number(digits) : null;
}

function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatStoreName(store) {
  if (!store) return "Current Page";

  const labels = {
    amazon: "Amazon",
    flipkart: "Flipkart",
    myntra: "Myntra",
    meesho: "Meesho",
    unknown: "Current Page",
  };

  return labels[store] || store.charAt(0).toUpperCase() + store.slice(1);
}

async function readJsonResponse(res) {
  const raw = await res.text();

  if (!raw.trim()) {
    throw new Error(
      `Backend returned an empty response (${res.status} ${res.statusText || "Unknown"}). Make sure the backend server is running.`
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `Backend returned invalid JSON (${res.status} ${res.statusText || "Unknown"}).`
    );
  }
}

function CompareLoadingView({ product, onBack }) {
  return (
    <div className="truthlens-shell">
      <section className="compare-screen fade-up">
        <div className="compare-header">
          <button type="button" className="compare-back" onClick={onBack}>
            ← Back
          </button>
          <div className="compare-header-copy">
            <div className="compare-label">Compare Prices</div>
            <div className="compare-title">{shortenProductTitle(product, 54)}</div>
          </div>
        </div>

        <div className="compare-loading-note">Comparing prices across marketplaces...</div>

        <div className="compare-skeleton skeleton skeleton-banner" />

        <div className="compare-grid">
          <div className="compare-skeleton skeleton skeleton-card" />
          <div className="compare-skeleton skeleton skeleton-card" />
        </div>

        <div className="compare-skeleton skeleton skeleton-table" />
        <div className="compare-skeleton skeleton skeleton-button" />
        <div className="compare-skeleton skeleton skeleton-button" />
      </section>
    </div>
  );
}

function CompareErrorView({ product, error, onRetry, onBack }) {
  return (
    <div className="truthlens-shell">
      <section className="compare-screen fade-up">
        <div className="compare-header">
          <button type="button" className="compare-back" onClick={onBack}>
            ← Back
          </button>
          <div className="compare-header-copy">
            <div className="compare-label">Compare Prices</div>
            <div className="compare-title">{shortenProductTitle(product, 54)}</div>
          </div>
        </div>

        <div className="compare-error-card">
          <div className="compare-error-title">Could not compare prices right now</div>
          <p className="compare-error-copy">{error || "Please try again in a moment."}</p>
        </div>

        <div className="actions compare-actions">
          <button type="button" className="action-button primary" onClick={onRetry}>
            Try Again
          </button>
          <button type="button" className="action-button secondary" onClick={onBack}>
            Back to Analysis
          </button>
        </div>
      </section>
    </div>
  );
}

function CompareResultView({ product, comparison, onBack }) {
  const currentStore = formatStoreName(comparison?.current?.store);
  const currentPrice = comparison?.current?.price || "N/A";
  const competitorStore = formatStoreName(comparison?.competitor?.store);
  const competitorFound = Boolean(comparison?.competitor?.found);
  const competitorUnavailable = Boolean(comparison?.competitor?.unavailable);
  const competitorPrice = competitorFound ? comparison.competitor.price : "Not found";

  const currentValue = parsePriceValue(comparison?.current?.price);
  const targetValue = parsePriceValue(comparison?.competitor?.price);
  const canSave = Boolean(comparison?.summary?.canSave);
  const savingsAmount = comparison?.summary?.savingsAmount || formatCurrency((currentValue ?? 0) - (targetValue ?? 0));
  const bestStore = formatStoreName(comparison?.summary?.bestStore);
  const competitorMessage = competitorUnavailable
    ? comparison?.competitor?.reason || `${competitorStore} comparison is temporarily unavailable`
    : competitorFound
      ? `Match score ${comparison.competitor.score || 0}%`
      : "No reliable match found";

  return (
    <div className="truthlens-shell">
      <section className="compare-screen fade-up">
        <div className="compare-header">
          <button type="button" className="compare-back" onClick={onBack}>
            ← Back
          </button>
          <div className="compare-header-copy">
            <div className="compare-label">Compare Prices</div>
            <div className="compare-title">{shortenProductTitle(product, 54)}</div>
          </div>
        </div>

        <article className={`compare-savings ${canSave ? "better" : "same"}`}>
          <div className="compare-savings-icon">{canSave ? "₹" : "•"}</div>
          <div>
            <div className="compare-savings-kicker">
              {canSave ? "You could save" : competitorUnavailable ? "Comparison limited right now" : "Best visible price right now"}
            </div>
            <div className="compare-savings-value">
              {canSave ? savingsAmount : currentPrice}
              <span>
                {canSave ? ` by switching to ${bestStore}` : competitorUnavailable ? ` while checking ${competitorStore}` : ` on ${bestStore}`}
              </span>
            </div>
          </div>
        </article>

        <div className="compare-grid">
          <article className="compare-store-card">
            <div className="compare-card-label">You Are Here</div>
            <div className="compare-store-name">{currentStore}</div>
            <div className="compare-store-price">{currentPrice}</div>
            <div className="compare-store-meta">
              {currentValue != null ? "Live price on current page" : "Price not captured"}
            </div>
          </article>

          <article className={`compare-store-card highlight ${competitorFound ? "" : "muted"}`}>
            <div className="compare-card-label">Best Match</div>
            <div className="compare-store-name">{competitorStore}</div>
            <div className="compare-store-price">{competitorPrice}</div>
            <div className="compare-store-meta">
              {competitorMessage}
            </div>
          </article>
        </div>

        <section className="compare-table">
          <div className="compare-table-head">
            <span>Retailer</span>
            <span>Price</span>
            <span>Status</span>
          </div>

          <div className="compare-table-row">
            <span>{currentStore}</span>
            <span>{currentPrice}</span>
            <span className="compare-stock in">Live</span>
          </div>

          <div className="compare-table-row">
            <span>{competitorStore}</span>
            <span>{competitorPrice}</span>
            <span className={`compare-stock ${competitorFound ? "in" : "out"}`}>
              {competitorFound ? "Found" : competitorUnavailable ? "Blocked" : "No match"}
            </span>
          </div>
        </section>

        <div className="compare-footnote">Based on live listing prices available at compare time.</div>

        {competitorUnavailable ? (
          <div className="compare-inline-note">
            {competitorMessage}. The popup is working, but the marketplace blocked the automated lookup.
          </div>
        ) : null}

        <div className="actions compare-actions">
          {competitorFound ? (
            <button
              type="button"
              className="action-button primary"
              onClick={() => window.open(comparison.competitor.url, "_blank")}
            >
              {canSave ? `Go to ${competitorStore} — Save ${savingsAmount}` : `Open ${competitorStore} Match`}
            </button>
          ) : competitorUnavailable ? (
            <button type="button" className="action-button primary" disabled>
              {competitorStore} Temporarily Unavailable
            </button>
          ) : null}

          <button type="button" className="action-button secondary" onClick={onBack}>
            Stay on {currentStore}
          </button>
        </div>
      </section>
    </div>
  );
}

const tagConfig = {
  "cheaper":        { label: "💸 Cheaper",        color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  "better-rated":   { label: "⭐ Better Rated",    color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  "different-brand":{ label: "🔄 Different Brand", color: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  "premium":        { label: "👑 Premium Pick",    color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
};

function BetterAlternativesView({ product, alternativesData, loading, onBack, onViewMore }) {
  const alternatives = alternativesData?.alternatives || [];
  console.log("TrueCart alternatives data:", JSON.stringify(alternativesData, null, 2));
  const fallbackUrl  = alternativesData?.fallbackUrl  || null;
  const message      = alternativesData?.message      || "No alternatives found";

  return (
    <div className="truthlens-shell">
      <section className="min-h-full rounded-[28px] bg-gradient-to-b from-[#020617] via-slate-950 to-slate-900 p-4 text-white shadow-2xl shadow-black/30">
        <div className="mx-auto max-w-md">
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur-lg">
            {loading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
                <Loader />
              </div>
            )}

           
            <div className="mb-5">
              <button
                type="button"
                onClick={onBack}
                className="mb-3 text-sm text-slate-400 transition hover:text-white"
              >
                ← Back
              </button>
              <div className="bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 bg-clip-text text-xl font-semibold text-transparent">
                Better Alternatives
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {shortenProductTitle(product, 56)}
              </div>
            </div>

            {alternatives.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-6 text-center backdrop-blur-lg">
                <p className="mb-4 text-sm text-slate-400">{message}</p>
                {fallbackUrl && (
                  <button
                    type="button"
                    onClick={() => chrome.tabs.create({ url: fallbackUrl })}
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
                  >
                    Search on Amazon →
                  </button>
                )}
              </div>

           
            ) : (
              <div className="space-y-3">
                {alternatives.slice(0, 4).map((item, index) => {
                  const tag = tagConfig[item.tag] || {
                    label: item.tag || "Alternative",
                    color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
                  };

                  return (
                    <div
                      key={`${item.title}-${index}`}
                      className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-lg transition-all duration-200 hover:border-white/20 hover:bg-white/10"
                    >
                     
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tag.color}`}>
                          {tag.label}
                        </span>
                        <span className="shrink-0 text-base font-bold text-cyan-300">
                          {item.estimatedPrice || item.price || "—"}
                        </span>
                      </div>

                     
                      <div className="mb-1 text-sm font-semibold leading-5 text-white">
                        {item.title}
                      </div>

                      
                      {item.highlight && (
                        <div className="mb-1.5 text-xs text-slate-400">
                          ✦ {item.highlight}
                        </div>
                      )}

                      
                      <div className="mb-3 text-xs leading-5 text-slate-500">
                        {item.reason || "Popular alternative in this price range"}
                      </div>

                      
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-amber-400">
                          ★ {item.rating || "N/A"}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => chrome.tabs.create({ url: item.amazonUrl })}
                            className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/30"
                          >
                            Amazon
                          </button>
                          <button
                            type="button"
                            onClick={() => chrome.tabs.create({ url: item.flipkartUrl })}
                            className="rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-500/30"
                          >
                            Flipkart
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

           
            {!loading && (
              <button
                type="button"
                onClick={onViewMore}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-cyan-500/20"
              >
                View More Alternatives
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
function App() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState("detecting product...");
  const [analysis, setAnalysis] = useState(null);
  const [productMeta, setProductMeta] = useState({
    price: null,
    rating: null,
    reviewCount: null,
    site: null,
    fakeAnalysis: null,
  });
  const [status, setStatus] = useState("Analyzing Product...");
  const [activeView, setActiveView] = useState("analysis");
  const [priceComparison, setPriceComparison] = useState(null);
  const [compareState, setCompareState] = useState({
    loading: false,
    error: "",
  });
  const [alternativesState, setAlternativesState] = useState({
    loading: false,
    data: null,
  });

  const getProductFromActiveTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      throw new Error("No active tab found");
    }

    try {
      return await chrome.tabs.sendMessage(tab.id, { type: "GET_PRODUCT_FROM_PAGE" });
    } catch (error) {
      const message = error?.message || "";
      const isMissingReceiver = message.includes("Receiving end does not exist");
      const isRestrictedPage = !tab.url || /^chrome:|^chrome-extension:|^edge:|^about:/.test(tab.url);

      if (isRestrictedPage) {
        throw new Error("Open a supported product page and try again.");
      }

      if (!isMissingReceiver) {
        throw error;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      return chrome.tabs.sendMessage(tab.id, { type: "GET_PRODUCT_FROM_PAGE" });
    }
  };

  const fetchAnalysis = async (productData) => {
    const res = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productData),
    });

    const data = await readJsonResponse(res);

    if (!res.ok) {
      throw new Error(data?.error || data?.err || "Analysis request failed");
    }

    if (!data.result) {
      throw new Error("No analysis result returned");
    }

    return data.result;
  };

  const handleComparePrices = async () => {
    if (!product || product === "detecting product..." || product === "no product detected") {
      return;
    }

    try {
      setCompareState({ loading: true, error: "" });
      setPriceComparison(null);
      setActiveView("compare-loading");

      const res = await fetch(`${API_BASE_URL}/compare-price`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: product,
          currentPrice: productMeta.price,
          currentStore: productMeta.site || "current page",
        }),
      });

      const data = await readJsonResponse(res);

      setPriceComparison(data);
      setActiveView("compare-result");
      setCompareState({ loading: false, error: "" });
    } catch (error) {
      setCompareState({
        loading: false,
        error: error.message || "Could not compare prices",
      });
      setActiveView("compare-error");
    }
  };

  const handleFindBetterAlternatives = async () => {
    if (!product || product === "detecting product..." || product === "no product detected") {
      return;
    }

    const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(`${product} alternatives`)}`;

    try {
      setLoading(true);
      setAlternativesState({
        loading: true,
        data: {
          alternatives: [],
          source: "loading",
          message: "Finding better alternatives...",
          fallbackUrl,
        },
      });
      setActiveView("alternatives");

      const res = await fetch(`${API_BASE_URL}/alternatives`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: product,
          price: productMeta.price,
        }),
      });

      const data = await readJsonResponse(res);

      setAlternativesState({
        loading: false,
        data: {
          alternatives: Array.isArray(data?.alternatives) ? data.alternatives : [],
          source: data?.source || "api",
          message: data?.message || "No alternatives found",
          fallbackUrl: data?.fallbackUrl || fallbackUrl,
        },
      });
    } catch (error) {
      setAlternativesState({
        loading: false,
        data: {
          alternatives: [],
          source: "fallback",
          message: error.message || "Could not fetch alternatives",
          fallbackUrl,
        },
      });
      setActiveView("alternatives");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chrome.storage.local.get(["productData"], (res) => {
      console.log("TrueCart popup storage productData", res.productData);
      if (!res.productData) {
        return;
      }

      setProductMeta((prev) => ({
        ...prev,
        ...res.productData,
      }));
    });

    const handleStorageChange = (changes, areaName) => {
      if (areaName !== "local" || !changes.productData?.newValue) {
        return;
      }

      console.log("TrueCart popup storage changed", changes.productData.newValue);
      setProductMeta((prev) => ({
        ...prev,
        ...changes.productData.newValue,
      }));
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const getProductAndAnalyze = async () => {
      try {
        const productData = await getProductFromActiveTab();

        if (!productData?.title) {
          setProduct("no product detected");
          setStatus("Refresh the product page once, then reopen TrueCart.");
          return;
        }

        setProduct(productData.title);
        setProductMeta((prev) => ({
          ...prev,
          price: productData.price || null,
          rating: productData.rating || null,
          reviewCount: productData.reviewCount || null,
          site: productData.site || null,
          fakeAnalysis: productData.fakeAnalysis ?? prev.fakeAnalysis ?? null,
        }));

        const result = await fetchAnalysis(productData);
        setAnalysis(result);
      } catch (err) {
        setStatus(err.message || "Could not analyze this product.");
      } finally {
        setInitialLoading(false);
      }
    };

    getProductAndAnalyze();
  }, []);

  useEffect(() => {
    console.log("TrueCart popup productMeta", productMeta);
  }, [productMeta]);

  const hasProduct = product !== "detecting product..." && product !== "no product detected";
  const keyInsights = analysis?.keyInsights || [];
  const whatUsersLove = analysis?.whatUsersLove || [];
  const topComplaints = analysis?.topComplaints || [];
  const riskAlerts = analysis?.riskAlerts || [];
  const buyIf = analysis?.shouldYouBuy?.buyIf || [];
  const avoidIf = analysis?.shouldYouBuy?.avoidIf || [];
  const confidence = analysis?.confidence || "Low";
  const priceAnalysis = analysis?.priceAnalysis || {};
  const priceVerdict = priceAnalysis?.verdict || "unknown";
  const priceInsight = priceAnalysis?.insight || "Price analysis is unavailable for this product.";
  const suggestedPlatforms = priceAnalysis?.suggestedPlatforms || [];
  const summaryCopy =
    priceInsight ||
    keyInsights[0] ||
    whatUsersLove[0] ||
    topComplaints[0] ||
    "Analyzing...";
  const displayProduct = shortenProductTitle(product);

  if (initialLoading) {
    return (
      <div className="truthlens-app">
        <div className="truthlens-shell">
          <Loader />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="truthlens-app">
        <div className="truthlens-loading">{status}</div>
      </div>
    );
  }

  if (activeView === "compare-loading") {
    return (
      <div className="truthlens-app">
        <CompareLoadingView
          product={product}
          onBack={() => {
            if (!compareState.loading) {
              setActiveView("analysis");
            }
          }}
        />
      </div>
    );
  }

  if (activeView === "compare-result" && priceComparison) {
    return (
      <div className="truthlens-app compare-mode">
        <CompareResultView
          product={product}
          comparison={priceComparison}
          onBack={() => setActiveView("analysis")}
        />
      </div>
    );
  }

  if (activeView === "compare-error") {
    return (
      <div className="truthlens-app compare-mode">
        <CompareErrorView
          product={product}
          error={compareState.error}
          onRetry={handleComparePrices}
          onBack={() => setActiveView("analysis")}
        />
      </div>
    );
  }

  if (activeView === "alternatives") {
    return (
      <div className="truthlens-app compare-mode">
        <BetterAlternativesView
          product={product}
          alternativesData={alternativesState.data}
          loading={loading}
          onBack={() => setActiveView("analysis")}
          onViewMore={() => {
            const url =
              alternativesState.data?.fallbackUrl ||
              `https://www.google.com/search?q=${encodeURIComponent(`${product} alternatives`)}`;
            chrome.tabs.create({ url });
          }}
        />
      </div>
    );
  }

  return (
    <div className="truthlens-app">
      <div className="truthlens-shell">
        <section className="hero-panel fade-up">
          <div className="hero-topbar">
            <div>
              <h1 className="brand-title">Truth<span>Lens</span></h1>
              <div className="brand-subtitle">
                <span className="brand-dot" />
                AI Product Insights
              </div>
            </div>
            <div className="status-badge">Detected</div>
          </div>

          <h2 className="product-title" title={product}>{displayProduct}</h2>
          <p className="product-subcopy">
            Review-grounded analysis with a quick price-value check from the visible listing.
          </p>
        </section>

        <section className="meta-panel fade-up delay-1">
          <article className="meta-chip">
            <span className="meta-label">Current Price</span>
            <div className="meta-value">
              {productMeta.price || "N/A"}
            </div>
            <div className="meta-note">
              {productMeta.price ? "Visible on this page" : "Price not captured from listing"}
            </div>
          </article>

          <article className="meta-chip">
            <span className="meta-label">Based On</span>
            <div className="meta-value">
              {productMeta.rating ? `⭐ ${productMeta.rating}` : "N/A"}
            </div>
            <div className="meta-note">
              {productMeta.rating ? "Marketplace rating" : "Rating not available"}
            </div>
          </article>

          <article className="meta-chip">
            <span className="meta-label">Reviews</span>
            <div className="meta-value">
              {productMeta.reviewCount ? `🧾 ${productMeta.reviewCount}` : "N/A"}
            </div>
            <div className="meta-note">
              {productMeta.reviewCount ? "Visible review base" : "Review count not available"}
            </div>
          </article>
          
          {productMeta.fakeAnalysis &&(
            <article className="meta-chip">
              <span className="meta-label">Fake Reviews</span>
              <div className="meta-value">
                {productMeta.fakeAnalysis.percent === 0 ? "No Fake Reviews" :
                `${productMeta.fakeAnalysis.percent}% suspicious`}
              </div>
              <div className="meta-note">
                Risk level : {productMeta.fakeAnalysis.label}
              </div>
            </article>
          )}

          <article className="meta-chip">
            <span className="meta-label">Confidence</span>
            <div className="meta-value">{confidence}</div>
            <div className="meta-note">Evidence quality from available reviews</div>
          </article>
        </section>

        <section className={`price-card ${getVerdictTone(priceVerdict)} fade-up delay-2`}>
          <div className="price-header">
            <div>
              <div className="price-label">Price Check</div>
              <div className="price-verdict">{formatVerdict(priceVerdict)}</div>
            </div>
            <div className="price-pill">{productMeta.price || "Price missing"}</div>
          </div>
          <p className="price-copy">{priceInsight}</p>
          {suggestedPlatforms.length ? (
            <div className="platform-row">
              {suggestedPlatforms.map((platform, index) => (
                <span key={`${platform}-${index}`} className="platform-chip">
                  {platform}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="insight-grid fade-up delay-2">
          <InsightCard tone="pros" label="Key Insights" items={keyInsights} />
          <InsightCard tone="pros" label="What Users Love" items={whatUsersLove} />
          <InsightCard tone="cons" label="Top Complaints" items={topComplaints} />
          <InsightCard tone="cons" label="Risk Alerts" items={riskAlerts} />
          <InsightCard tone="pros" label="Buy If" items={buyIf} />
          <InsightCard tone="cons" label="Avoid If" items={avoidIf} />
        </section>

        <section className="verdict-card fade-up delay-3">
          <div className="verdict-header">
            <div className="verdict-title">
              <span>✦</span>
              AI Buying Summary
            </div>
            <div className="verdict-icon">⌘</div>
          </div>
          <p className="verdict-copy">
            {summaryCopy}
          </p>
        </section>

        <div className="actions fade-up delay-3">
          <button
            type="button"
            className="action-button primary"
            onClick={handleComparePrices}
            disabled={!hasProduct || compareState.loading}
          >
            {compareState.loading ? "Comparing Prices..." : "Compare Prices"}
          </button>

          <button
            type="button"
            className="action-button secondary"
            onClick={handleFindBetterAlternatives}
          >
            Find Better Alternatives
          </button>
        </div>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="loader-wrapper">
      <div className="loader" />
      <p className="loader-text">Analyzing Product...</p>
    </div>
  );
}

export default App;
