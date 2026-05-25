import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import axios from "axios"

dotenv.config();
const PORT = 5000;


function cleanTitle(title) {
    return title
        .replace(/[\(\[].*?[\)\]]/g, "")
        .replace(/\|.*$/, "")
        .replace(/,\s*(pack|combo|set|buy|get|free|offer|sale).*/i, "")
        .replace(/\b(with|for|by|and|the|in|of)\b.*$/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
}

const app = express();
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

app.use(cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
}));
app.use(express.json())

app.get("/", (_req, res) => {
    res.json({
        ok: true,
        message: "TrueCart backend is running",
        endpoints: ["/analyze", "/compare-price", "/health", "/alternatives"],
    });
});

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

function decodeHtmlEntities(text = "") {
    return text
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'")
        .replace(/&nbsp;/gi, " ")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}

function stripHtml(text = "") {
    return decodeHtmlEntities(text)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeCompareText(text = "") {
    return String(text)
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function scoreTitleMatch(sourceTitle, candidateTitle) {
    const source = normalizeCompareText(sourceTitle);
    const candidate = normalizeCompareText(candidateTitle);

    if (!source || !candidate) {
        return 0;
    }

    if (source === candidate) {
        return 100;
    }

    const sourceWords = new Set(source.split(" ").filter((word) => word.length > 1));
    const candidateWords = new Set(candidate.split(" ").filter((word) => word.length > 1));

    let matches = 0;

    for (const word of sourceWords) {
        if (candidateWords.has(word)) {
            matches += 1;
        }
    }

    return Math.round((matches / Math.max(sourceWords.size, 1)) * 100);
}

function extractPriceNumber(price) {
    if (!price) {
        return null;
    }

    const numeric = String(price).replace(/[^\d.]/g, "");
    return numeric ? Number(numeric) : null;
}

function formatPriceDifference(value) {
    if (value == null || Number.isNaN(value)) {
        return null;
    }

    return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function buildUnavailableMarketplaceResult(store, reason, statusCode = null) {
    return {
        found: false,
        store,
        unavailable: true,
        reason,
        statusCode,
    };
}

function getMarketplaceSearchHeaders(url) {

    return {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",

        "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",

        "Accept-Language":
            "en-US,en;q=0.9",

        "Cache-Control":
            "no-cache",

        "Pragma":
            "no-cache",

        "Upgrade-Insecure-Requests":
            "1",

        "Referer":
            "https://www.google.com/",

        "Sec-Fetch-Dest":
            "document",

        "Sec-Fetch-Mode":
            "navigate",

        "Sec-Fetch-Site":
            "cross-site",

        "Sec-Fetch-User":
            "?1",
    };
}

async function fetchMarketplaceHtml(url, store) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let response;

    try {
        response = await fetch(url, {
            headers: getMarketplaceSearchHeaders(url),
            signal: controller.signal,
        });
    } catch (error) {
        return {
            ok: false,
            status: 0,
            html: "",
            error: buildUnavailableMarketplaceResult(
                store,
                "Request failed or timed out",
                0
            ),
        };
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        return {
            ok: false,
            status: response.status,
            html: "",
            error: buildUnavailableMarketplaceResult(
                store,
                response.status === 403
                    ? `${store} blocked the automated price lookup`
                    : `${store} search returned status ${response.status}`,
                response.status
            ),
        };
    }

    return {
        ok: true,
        status: response.status,
        html: await response.text(),
    };
}

function extractFlipkartCandidates(html, productTitle) {
    const candidates = [];
    const linkRegex = /<a[^>]+href="([^"]*\/p\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        const anchorHtml = match[0];
        const anchorInnerHtml = match[2];
        const searchWindow = html.slice(
            Math.max(0, match.index - 1800),
            Math.min(html.length, match.index + anchorHtml.length + 1800)
        );

        const titleAttr = anchorHtml.match(/\stitle="([^"]+)"/i)?.[1] || "";
        const textTitle = stripHtml(anchorInnerHtml);
        const nearbyTitle = stripHtml(searchWindow).slice(0, 280);
        const title = titleAttr || textTitle || nearbyTitle;
        const price = searchWindow.match(/₹\s?[\d,]+(?:\.\d{1,2})?/)?.[0] || null;

        if (!title || !price) {
            continue;
        }

        const absoluteUrl = href.startsWith("http")
            ? href
            : `https://www.flipkart.com${href.startsWith("/") ? href : `/${href}`}`;

        candidates.push({
            title,
            price,
            url: absoluteUrl,
            score: scoreTitleMatch(productTitle, title),
        });
    }

    return candidates.sort((a, b) => b.score - a.score);
}

async function searchFlipkartProduct(productTitle) {
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(productTitle)}`;
    const result = await fetchMarketplaceHtml(searchUrl, "flipkart");

    if (!result.ok) {
        return result.error;
    }

    const html = result.html;
    const candidates = extractFlipkartCandidates(html, productTitle);
    const bestMatch = candidates.find((item) => item.score >= 45);

    if (!bestMatch) {
        return {
            found: false,
            store: "flipkart",
            unavailable: false,
        };
    }

    return {
        found: true,
        store: "flipkart",
        title: bestMatch.title,
        price: bestMatch.price,
        url: bestMatch.url,
        score: bestMatch.score,
        inStock: true,
    };
}

function extractAmazonCandidates(html, productTitle) {
    const candidates = [];
    const blockRegex = /<div[^>]+data-component-type="s-search-result"[\s\S]*?<\/div>\s*<\/div>/gi;
    let match;

    while ((match = blockRegex.exec(html)) !== null) {
        const block = match[0];
        const href = block.match(/href="(\/[^"]*\/dp\/[^"]+)"/i)?.[1] || block.match(/href="(\/gp\/[^"]+)"/i)?.[1];
        const title =
            stripHtml(block.match(/<h2[\s\S]*?<\/h2>/i)?.[0] || "") ||
            stripHtml(block.match(/<span[^>]*class="[^"]*a-size-medium[^"]*"[^>]*>[\s\S]*?<\/span>/i)?.[0] || "");
        const priceWhole = block.match(/<span[^>]*class="a-price-whole"[^>]*>([\d,]+)/i)?.[1] || "";
        const priceFraction = block.match(/<span[^>]*class="a-price-fraction"[^>]*>(\d{1,2})/i)?.[1] || "";
        const price = priceWhole ? `₹${priceWhole}${priceFraction ? `.${priceFraction}` : ""}` : null;

        if (!href || !title || !price) {
            continue;
        }

        candidates.push({
            title,
            price,
            url: `https://www.amazon.in${decodeHtmlEntities(href)}`,
            score: scoreTitleMatch(productTitle, title),
        });
    }

    return candidates.sort((a, b) => b.score - a.score);
}

async function searchAmazonProduct(productTitle) {
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(productTitle)}`;
    const result = await fetchMarketplaceHtml(searchUrl, "amazon");

    if (!result.ok) {
        return result.error;
    }

    const candidates = extractAmazonCandidates(result.html, productTitle);
    const bestMatch = candidates.find((item) => item.score >= 45);

    if (!bestMatch) {
        return {
            found: false,
            store: "amazon",
            unavailable: false,
        };
    }

    return {
        found: true,
        store: "amazon",
        title: bestMatch.title,
        price: bestMatch.price,
        url: bestMatch.url,
        score: bestMatch.score,
        inStock: true,
    };
}

async function searchMarketplaceProduct(store, productTitle) {
    if (store === "amazon") {
        return searchAmazonProduct(productTitle);
    }

    if (store === "flipkart") {
        return searchFlipkartProduct(productTitle);
    }

    return buildUnavailableMarketplaceResult(store, `No search provider configured for ${store}`);
}

function getMessageText(content) {
    if (typeof content === "string") {
        return content;
    }

    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === "string") {
                    return part;
                }

                if (part?.type === "text" && typeof part.text === "string") {
                    return part.text;
                }

                return "";
            })
            .join("")
            .trim();
    }

    return "";
}

function extractJsonObject(text) {
    const clean = text.replace(/```json|```/gi, "").trim();
    const start = clean.indexOf("{");

    if (start === -1) {
        throw new SyntaxError("No JSON object found");
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < clean.length; i++) {
        const char = clean[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === "\\") {
            escaped = true;
            continue;
        }

        if (char === "\"") {
            inString = !inString;
            continue;
        }

        if (inString) {
            continue;
        }

        if (char === "{") {
            depth++;
        } else if (char === "}") {
            depth--;

            if (depth === 0) {
                return clean.slice(start, i + 1);
            }
        }
    }

    throw new SyntaxError("Incomplete JSON object");
}

function sanitizeParsedResult(value) {
    const keyInsights = Array.isArray(value?.keyInsights)
        ? value.keyInsights.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
        : [];
    const whatUsersLove = Array.isArray(value?.whatUsersLove)
        ? value.whatUsersLove.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
        : [];
    const topComplaints = Array.isArray(value?.topComplaints)
        ? value.topComplaints.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
        : [];
    const riskAlerts = Array.isArray(value?.riskAlerts)
        ? value.riskAlerts.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
        : [];
    const buyIf = Array.isArray(value?.shouldYouBuy?.buyIf)
        ? value.shouldYouBuy.buyIf.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
        : [];
    const avoidIf = Array.isArray(value?.shouldYouBuy?.avoidIf)
        ? value.shouldYouBuy.avoidIf.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
        : [];
    const confidence = typeof value?.confidence === "string" ? value.confidence.trim() : "";
    const rawVerdict = typeof value?.priceAnalysis?.verdict === "string"
        ? value.priceAnalysis.verdict.trim().toLowerCase()
        : "";
    const verdict = ["overpriced", "fair", "good deal", "unknown"].includes(rawVerdict)
        ? rawVerdict
        : "unknown";
    const priceInsight = typeof value?.priceAnalysis?.insight === "string"
        ? value.priceAnalysis.insight.trim()
        : "";
    const suggestedPlatforms = Array.isArray(value?.priceAnalysis?.suggestedPlatforms)
        ? value.priceAnalysis.suggestedPlatforms.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
        : [];

    if (
        !keyInsights.length &&
        !whatUsersLove.length &&
        !topComplaints.length &&
        !riskAlerts.length &&
        !buyIf.length &&
        !avoidIf.length &&
        !confidence &&
        !priceInsight &&
        !suggestedPlatforms.length &&
        verdict === "unknown"
    ) {
        throw new SyntaxError("Parsed JSON missing structured analysis fields");
    }

    return {
        keyInsights: keyInsights.length ? keyInsights : ["Not enough review evidence to identify patterns"],
        whatUsersLove,
        topComplaints,
        riskAlerts,
        shouldYouBuy: {
            buyIf,
            avoidIf,
        },
        priceAnalysis: {
            verdict,
            insight: priceInsight || "Price confidence is limited because the visible evidence is thin.",
            suggestedPlatforms,
        },
        confidence: confidence || "Low",
    };
}

function parseAnalysisResponse(text) {
    const clean = text.replace(/```json|```/gi, "").trim();

    try {
        return sanitizeParsedResult(JSON.parse(clean));
    } catch {
        const jsonString = extractJsonObject(clean);
        return sanitizeParsedResult(JSON.parse(jsonString));
    }
}

function buildLimitedEvidenceResult({ price, rating, reviewCount }) {
    const visibleSignals = [];

    if (rating) {
        visibleSignals.push(`rating ${rating}/5`);
    }

    if (reviewCount) {
        visibleSignals.push(`${reviewCount} visible reviews`);
    }

    const signalSummary = visibleSignals.length
        ? visibleSignals.join(" with ")
        : "limited marketplace signals";

    return {
        keyInsights: [
            `Detected ${signalSummary}, but written review text could not be extracted from this page.`,
        ],
        whatUsersLove: [],
        topComplaints: [],
        riskAlerts: [
            "Confidence is low because the analysis could not read detailed customer review text.",
        ],
        shouldYouBuy: {
            buyIf: rating ? ["You only need a quick snapshot from the visible listing metrics."] : [],
            avoidIf: ["You want a review-grounded recommendation before buying."],
        },
        priceAnalysis: {
            verdict: "unknown",
            insight: price
                ? `The current visible price is ${price}, but TrueCart cannot judge whether that is a good value without readable customer reviews.`
                : "TrueCart could not evaluate price-value because both detailed reviews and a reliable price signal were limited.",
            // suggestedPlatforms: ["Amazon", "Flipkart"],
        },
        confidence: "Low",
    };
}

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": "http://127.0.0.1:5000",
        "X-Title": "TrueCart"
    }
});

app.post("/analyze", async (req, res) => {
    const source = req.query.source;
    console.log("request received", req.body);
    try {
        const { title, price, rating, reviewCount, reviews } = req.body;
        if (!title || title.trim() === "") {
            return res.status(400).json({ error: "product name is required" });
        }
        const safeReviews = Array.isArray(reviews) ? reviews.slice(0, 5) : [];

        if (!safeReviews.length) {
            return res.json({
                result: buildLimitedEvidenceResult({ price, rating, reviewCount }),
            });
        }

        const prompt = `You are a product analyst.

Analyze the product ONLY using the provided data.
When referring to the product, use only the core product name, not the full marketplace listing title.

Do NOT assume features that are not mentioned in reviews.
Do NOT use general knowledge.
If data is insufficient, clearly say so.

---

Product Data:
Title: ${title}
Price: ${price || "Not available"}
Rating: ${rating || "Not available"}
Review Count: ${reviewCount || "Not available"}

User Reviews:
${safeReviews.length ? safeReviews.map((review, index) => `${index + 1}. ${review}`).join("\n") : "No reviews available"}

---

Tasks:

1. Analyze reviews and extract insights.
2. Evaluate if the current price seems:
   - overpriced
   - fair
   - good deal

   based ONLY on:
   - user satisfaction
   - complaints
   - overall sentiment

3. If price is not available OR reviews are insufficient, say that clearly.

4. Suggest where the user can check for better pricing (e.g., Amazon, Flipkart, other sellers).

---

Return ONLY valid JSON in this format:

{
  "keyInsights": [],
  "whatUsersLove": [],
  "topComplaints": [],
  "riskAlerts": [],
  "shouldYouBuy": {
    "buyIf": [],
    "avoidIf": []
  },
  "priceAnalysis": {
    "verdict": "overpriced | fair | good deal | unknown",
    "insight": "short human-like explanation",
    
  },
  "confidence": "High | Medium | Low"
}

---

Rules:
- Base everything strictly on review text
- Do not hallucinate features
- Keep each point short (1 line)
- If reviews are few or missing, reduce confidence
- If price is missing, set verdict to "unknown"
- Do not include explanations outside JSON`;

        const response = await openai.chat.completions.create({
            model: "meta-llama/llama-3-8b-instruct",
            messages: [
                {
                    role: "system",
                    content: "Return only valid JSON. Analyze only the supplied reviews. Do not assume or invent features. Never wrap the JSON in markdown fences.",
                },
                { role: "user", content: prompt }
            ],
            temperature: 0.2,
        });

        const text = getMessageText(response.choices[0]?.message?.content);

        let parsed;

        try {
            parsed = parseAnalysisResponse(text);
        } catch (e) {
            console.log("Raw AI response:", text);
            parsed = {
                keyInsights: ["Could not analyze properly"],
                whatUsersLove: [],
                topComplaints: ["AI response parsing failed"],
                riskAlerts: [],
                shouldYouBuy: {
                    buyIf: [],
                    avoidIf: [],
                },
                priceAnalysis: {
                    verdict: "unknown",
                    insight: "Price analysis was unavailable because the AI response could not be parsed.",
                    suggestedPlatforms: [],
                },
                confidence: "Low",
            };
        }

        return res.json({
            result: parsed,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ err: error?.message || "something went wrong" });
    }
});

app.post("/compare-price", async (req, res) => {
    try {
        const { title, currentPrice, currentStore } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: "product title is required" });
        }

        const sourceStore = currentStore || "unknown";
        const targetStore = sourceStore === "flipkart" ? "amazon" : "flipkart";
        const competitor = await searchMarketplaceProduct(targetStore, title);
        const currentPriceValue = extractPriceNumber(currentPrice);
        const targetPriceValue = extractPriceNumber(competitor?.price);
        const canSave =
            currentPriceValue != null &&
            targetPriceValue != null &&
            targetPriceValue < currentPriceValue;
        const savingsValue = canSave ? currentPriceValue - targetPriceValue : 0;

        return res.json({
            query: title,
            current: {
                store: sourceStore,
                price: currentPrice || null,
                inStock: true,
            },
            competitor,
            summary: {
                canSave,
                savingsAmount: canSave ? formatPriceDifference(savingsValue) : null,
                bestStore: canSave ? targetStore : sourceStore,
                sourceStore,
                targetStore,
                comparisonAvailable: Boolean(competitor && !competitor.unavailable),
            },
        });
    } catch (error) {
        console.error("compare-price error:", error);
        return res.json({
            query: title || "",
            current: {
                store: currentStore || "unknown",
                price: currentPrice || null,
                inStock: true,
            },
            competitor: buildUnavailableMarketplaceResult(
                currentStore === "flipkart" ? "amazon" : "flipkart",
                error?.message || "failed to compare prices"
            ),
            summary: {
                canSave: false,
                savingsAmount: null,
                bestStore: currentStore || "unknown",
                sourceStore: currentStore || "unknown",
                targetStore: currentStore === "flipkart" ? "amazon" : "flipkart",
                comparisonAvailable: false,
            },
        });
    }
});



app.post("/alternatives", async (req, res) => {
    const { title, price, site } = req.body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
    }

    const clean = cleanTitle(title.trim());
    const priceNum = parseFloat(String(price || "0").replace(/[^\d.]/g, "")) || null;

    try {
        const response = await openai.chat.completions.create({
            model: "meta-llama/llama-3.1-70b-instruct",
            messages: [{
                role: "system",
                content: "You are a product research expert for the Indian market. Return only valid JSON. No markdown fences. No explanation outside JSON."
            }, {
                role: "user",
                content: `Product: "${clean}"
Current Price: ${priceNum ? `₹${priceNum}` : "unknown"}
Platform: ${site || "amazon"}

Find 4 REAL alternative products available in India that are better or comparable.
Use your knowledge of actual products sold on Amazon.in and Flipkart.

Rules:
- Must be real products with real model numbers (e.g. "boAt Rockerz 450 Pro", not just "boAt headphones")
- Mix: 1 cheaper option, 1 better-rated option, 1 different brand, 1 premium pick
- Estimate realistic Indian market prices in ₹
- Each must have a clear one-line reason why it's a good alternative
- Generate a real Amazon.in search URL for each product

Return ONLY this JSON structure:
[
  {
    "title": "exact product name with model",
    "brand": "brand name",
    "estimatedPrice": "₹X,XXX",
    "tag": "cheaper | better-rated | different-brand | premium",
    "reason": "one line why this is a good alternative",
    "rating": "4.2/5",
    "amazonUrl": "https://www.amazon.in/s?k=SEARCH+QUERY+HERE",
    "flipkartUrl": "https://www.flipkart.com/search?q=SEARCH+QUERY+HERE",
    "highlight": "key feature that makes it stand out"
  }
]`
            }],
            temperature: 0.4,
        });

        const raw = getMessageText(response.choices[0]?.message?.content);
        let alternatives = [];

        try {
            const cleaned = raw.replace(/```json|```/gi, "").trim();
            const parsed = JSON.parse(cleaned);

            if (!Array.isArray(parsed)) throw new Error("not array");

            alternatives = parsed
                .filter(item => item.title && item.estimatedPrice)
                .map(item => ({
                    title: String(item.title || "").trim(),
                    brand: String(item.brand || "").trim(),
                    estimatedPrice: String(item.estimatedPrice || "").trim(),
                    tag: ["cheaper", "better-rated", "different-brand", "premium"]
                        .includes(item.tag) ? item.tag : "alternative",
                    reason: String(item.reason || "Similar product in same category").trim(),
                    rating: String(item.rating || "N/A").trim(),
                    amazonUrl: String(item.amazonUrl || `https://www.amazon.in/s?k=${encodeURIComponent(item.title)}`).trim(),
                    flipkartUrl: String(item.flipkartUrl || `https://www.flipkart.com/search?q=${encodeURIComponent(item.title)}`).trim(),
                    highlight: String(item.highlight || "").trim(),
                }))
                .slice(0, 4);

        } catch (parseErr) {
            console.error("Parse error:", parseErr.message, "\nRaw:", raw);
            alternatives = [];
        }


        if (alternatives.length >= 2) {
            return res.json({
                success: true,
                original: { title: clean, price: price || null },
                alternatives,
            });
        }


        const keywords = clean.split(" ").slice(0, 4).join(" ");
        return res.json({
            success: false,
            alternatives: [],
            fallbackUrl: `https://www.amazon.in/s?k=${encodeURIComponent(keywords + " alternatives")}`,
            message: "Could not generate alternatives automatically",
        });

    } catch (error) {
        console.error("Alternatives error:", error.message);
        const keywords = clean.split(" ").slice(0, 4).join(" ");
        return res.json({
            success: false,
            alternatives: [],
            fallbackUrl: `https://www.amazon.in/s?k=${encodeURIComponent(keywords)}`,
            message: "Service temporarily unavailable",
        });
    }
});


async function extractAmazonProductData(url) {
    const result = await fetchMarketplaceHtml(url, "amazon");

    if (!result.ok) {
        throw new Error("failes to fetch amazon product page");
    }
    const html = result.html;

    if (
        html.includes("captcha") ||
        html.includes("enter the characters you see")
    ){
        throw new Error("amazon blocked request");
    }
    const $ = cheerio.load(html);

    const title = $("#productTitle").text().trim() ||
        $("#title").text().trim() || "" ;

    const price = $(".a-price .a-offscreen").first().text().trim() || "";
    const rating = $(".a-icon-alt").first().text().trim() || "";
    const reviewCount = $("#acrCustomerReviewText").first().text().trim() || "";
    const reviews = [];
    $(".review-text-content span").each((_, el) => {
        const text = $(el).text().trim();

        if (text.length > 20) {
            reviews.push(text);
        }
    });

    console.log("TITLE:", title);
    console.log("PRICE:", price);
    console.log("RATING:", rating);
    console.log("REVIEWS:", reviews.length);

    
    return {
        title,
        rating,
        price,
        reviewCount,
        reviews: reviews.slice(0, 10),
    };
}

app.post("/analyze-url", async (req, res) => {
    try {
        const { url } = req.body;

        if (!url || !url.includes("amazon")) {
            return res.status(400).json({
                error: "valid amazon url required"
            });
        }

        const productData = await extractAmazonProductData(url);
        const {
            title,
            rating,
            price,
            reviewCount,
            reviews,
        } = productData;

        if (!title) {
            return res.status(400).json({
                error: "Could not extract product data"
            });
        }
        const safeReviews = Array.isArray(reviews) ? reviews.slice(0, 5) : [];

        if (!safeReviews.length) {
            return res.json({
                result: buildLimitedEvidenceResult({
                    price,
                    rating,
                    reviewCount
                }),
                product: productData,
            });
        }
        const prompt = `You are a product analyst.

Analyze the product ONLY using the provided data.

Product Data:
Title: ${title}
Price: ${price || "Not available"}
Rating: ${rating || "Not available"}
Review Count: ${reviewCount || "Not available"}

User Reviews:
${safeReviews.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Return ONLY valid JSON.`;

        const response = await openai.chat.completions.create({
            model: "meta-llama/llama-3-8b-instruct",

            messages: [
                {
                    role: "system",
                    content: "return only valid JSON."
                },
                {
                    role: "user",
                    content: prompt,
                }
            ],
            temperature: 0.2,
        });

        const text = getMessageText(response.choices[0]?.message?.content);

        let parsed;
        try {
            parsed = parseAnalysisResponse(text);
        } catch {
            parsed = {
                keyInsights: [
                    "could not analyze properly"
                ],
                whatUsersLove: [],
                topComplaints: [],
                riskAlerts: [],
                shouldYouBuy: {
                    buyIf: [],
                    avoidIf: [],
                },
                priceAnalysis: {
                    verdict: "unknown",
                    insight: "Ai parsing failed",
                },
                confidence: "Low"
            };
        }

        console.log(typeof parsed);
        console.log(parsed);
        return res.json({
            success: true,
            productData: productData,
            result: parsed,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: error?.message || "something went wrong",
        });
    }
});

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

const HOST = process.env.HOST || "127.0.0.1";

const server = app.listen(PORT, HOST, () => {
    console.log(`server running on http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
    console.error("server failed to start:", error);
});

server.on("close", () => {
    console.log("server closed");
});

process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down server");
    server.close(() => {
        process.exit(0);
    });
});

process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down server");
    server.close(() => {
        process.exit(0);
    });
});

process.on("uncaughtException", (error) => {
    console.error("uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
    console.error("unhandled rejection:", reason);
});

process.on("exit", (code) => {
    console.log(`process exiting with code ${code}`);
});
