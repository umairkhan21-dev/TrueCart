console.log("TrueCart content script loaded");

if (window.__truecartContentLoaded) {
    console.log("TrueCart content script already running");
} else {
    window.__truecartContentLoaded = true;

    function safeSendMessage(message, onDone) {
        try {
            if (!chrome?.runtime?.id) {
                onDone?.(false);
                return;
            }

            chrome.runtime.sendMessage(message, () => {
                if (chrome.runtime.lastError) {
                    console.warn("sendMessage failed:", chrome.runtime.lastError.message);
                    onDone?.(false);
                    return;
                }

                onDone?.(true);
            });
        } catch (error) {
            console.warn("Extension context invalidated:", error.message);
            onDone?.(false);
        }
    }

    function firstText(selectors) {
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            const text = el?.innerText?.replace(/\s+/g, " ").trim();
            if (text) return text;
        }
        return null;
    }

    function normalizeNumber(text) {
        if (!text) return null;
        return text.replace(/,/g, "").match(/[\d.]+/)?.[0] || null;
    }

    function normalizePrice(text) {
        if (!text) return null;

        const compact = text.replace(/\s+/g, " ").trim();
        const match = compact.match(/(?:Rs\.?|INR|MRP|₹)\s*[\d,]+(?:\.\d{1,2})?/i);

        if (!match) {
            return null;
        }

        return match[0].replace(/\s+/g, " ").trim();
    }

    function findRatingByPattern() {
        const candidates = Array.from(document.querySelectorAll("div, span"));
        for (const el of candidates) {
            const text = el.innerText?.trim();
            if (!text) continue;

            if (/^\d(\.\d)?$/.test(text)) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return text;
                }
            }
        }

        return null;
    }

    function findReviewCountByPattern() {
        const candidates = Array.from(document.querySelectorAll("div, span"));
        for (const el of candidates) {
            const text = el.innerText?.replace(/\s+/g, " ").trim();
            if (!text) continue;

            if (/Ratings?\s*&\s*Reviews?/i.test(text) || /\bReviews?\b/i.test(text)) {
                const match = text.replace(/,/g, "").match(/\d+/g);
                if (match?.length) {
                    return match[match.length - 1];
                }
            }
        }

        return null;
    }

    function extractReviewTexts(selectors, limit = 5) {
        const items = [];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                addReviewCandidate(items, el.innerText, limit);
                if (items.length >= limit) return items;
            }
        }

        return items;
    }

    function extractTextBlocks(limit = 10) {
        const blockedPatterns = [
            /\bbuy\b/i,
            /\bfree shipping\b/i,
            /\bcash on delivery\b/i,
            /\breturns?\b/i,
            /\breplacement\b/i,
            /\bgenuine products?\b/i,
            /\bday replacement guarantee\b/i,
            /\bonline\b/i,
            /\bdelivery\b/i,
            /\bpolicy\b/i,
            /\bwarranty\b/i,
        ];

        return Array.from(document.querySelectorAll("p, div"))
            .map((el) => el.innerText?.replace(/\s+/g, " ").trim())
            .filter((text) => {
                if (!text || text.length < 40 || text.length > 400) {
                    return false;
                }

                if (text.includes("₹")) {
                    return false;
                }

                if (blockedPatterns.some((pattern) => pattern.test(text))) {
                    return false;
                }

                return /(good|bad|nice|poor|great|awesome|worst|best|quality|battery|design|comfortable|value|product)/i.test(text);
            })
            .slice(0, limit);
    }

    function decodeJsonString(raw) {
        if (!raw) return "";

        try {
            return JSON.parse(`"${raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
        } catch {
            return raw
                .replace(/\\"/g, "\"")
                .replace(/\\n/g, " ")
                .replace(/\\r/g, " ")
                .replace(/\\t/g, " ")
                .replace(/\\\\/g, "\\");
        }
    }

    function cleanReviewText(text) {
        if (!text) {
            return "";
        }

        return text
            .replace(/\bREAD MORE\b/gi, " ")
            .replace(/\bCertified Buyer\b/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function delay(ms) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, ms);
        });
    }

    async function scrollForDynamicReviews({ steps = 6, stepSize = 700, delayMs = 450 } = {}) {
        const startY = window.scrollY;
        let lastHeight = document.body?.scrollHeight || 0;

        for (let step = 0; step < steps; step++) {
            const nextY = Math.min(window.scrollY + stepSize, document.body?.scrollHeight || window.scrollY);
            window.scrollTo({ top: nextY, behavior: "auto" });
            await delay(delayMs);

            const currentHeight = document.body?.scrollHeight || 0;
            if (currentHeight <= lastHeight && nextY === window.scrollY) {
                break;
            }

            lastHeight = currentHeight;
        }

        window.scrollTo({ top: startY, behavior: "auto" });
        await delay(200);
    }

    function splitIntoReviewSentences(text) {
        if (!text) {
            return [];
        }

        const normalized = cleanReviewText(text)
            .replace(/\s*\n+\s*/g, ". ")
            .replace(/\s{2,}/g, " ")
            .trim();

        if (!normalized) {
            return [];
        }

        return normalized
            .split(/(?<=[.!?])\s+|\s{2,}/)
            .map((sentence) => cleanReviewText(sentence))
            .filter(Boolean);
    }

    function isHumanLikeReviewSentence(text) {
        const cleanText = cleanReviewText(text);

        if (!cleanText) {
            return false;
        }

        const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

        if (wordCount < 6 || wordCount > 45) {
            return false;
        }

        if (cleanText.length < 35 || cleanText.length > 320) {
            return false;
        }

        if (!/[a-z]{3,}/i.test(cleanText)) {
            return false;
        }

        if (/[{}<>]/.test(cleanText) || /https?:\/\//i.test(cleanText)) {
            return false;
        }

        if (/\d{4,}/.test(cleanText) || /(₹|Rs\.?|INR)\s*[\d,]+/i.test(cleanText)) {
            return false;
        }

        if (/^[^a-z]*$/i.test(cleanText)) {
            return false;
        }

        const blockedPhrases = [
            /\bbuy now\b/i,
            /\badd to cart\b/i,
            /\breturn policy\b/i,
            /\breplacement policy\b/i,
            /\bfree delivery\b/i,
            /\bfast delivery\b/i,
            /\bcash on delivery\b/i,
            /\bdelivery by\b/i,
            /\bview more sellers\b/i,
            /\bproduct details?\b/i,
            /\bproduct description\b/i,
            /\bfrom the manufacturer\b/i,
            /\bspecifications?\b/i,
            /\bhighlights?\b/i,
            /\bwarranty\b/i,
            /\binstallation\b/i,
            /\bterms and conditions\b/i,
            /\bexchange offer\b/i,
            /\bbank offer\b/i,
            /\bemi\b/i,
            /\bavailable offers?\b/i,
            /\bgenuine products?\b/i,
            /\bsecure packaging\b/i,
            /\bno contact delivery\b/i,
            /\bservice center\b/i,
            /\border now\b/i,
            /\bonly few left\b/i,
            /\bvisit the store\b/i,
            /\bcolor\b/i,
            /\bmaterial\b/i,
            /\bsize\b/i,
        ];

        if (blockedPhrases.some((pattern) => pattern.test(cleanText))) {
            return false;
        }

        const reviewSignals = [
            /\b(i|my|me|we|us)\b/i,
            /\b(after|using|used|tried|bought|received|ordered)\b/i,
            /\b(good|great|bad|poor|nice|excellent|amazing|worst|best|awesome|comfortable|disappointed|satisfied|happy|quality|battery|fit|design|sound|camera|display|fabric|delivery experience)\b/i,
        ];

        if (!reviewSignals.some((pattern) => pattern.test(cleanText))) {
            return false;
        }

        return true;
    }

    function detectFakeReviews(reviews = []) {
        if (!reviews || reviews.length === 0) {
            return { percent: 0, label: "no-data" };
        }

        let suspicious = 0;
        const promotionalWords = ["best", "amazing", "awesome", "perfect", "excellent", "must buy"];

        reviews.forEach((review) => {
            const text = cleanReviewText(review).toLowerCase();
            const words = text.split(/\s+/).filter(Boolean);
            let score = 0;

            if (text.length < 20) {
                score++;
            }

            if (promotionalWords.some((word) => text.includes(word))) {
                score++;
            }

            const repeatedWords = words.filter((word, index) => word.length > 2 && words.indexOf(word) !== index);
            if (repeatedWords.length > 0) {
                score++;
            }

            if (score >= 2) {
                suspicious++;
            }
        });

        const percent = Math.round((suspicious / reviews.length) * 100);

        return {
            percent,
            label: percent > 30 ? "high" : percent > 15 ? "medium" : "low",
        };
    }

    async function getReviewsWithoutClass(limit = 6) {
        await scrollForDynamicReviews();
        await delay(500);

        const nodes = Array.from(document.querySelectorAll("p, div, span"));
        const reviews = [];
        const seen = new Set();

        for (const node of nodes) {
            if (!(node instanceof HTMLElement)) {
                continue;
            }

            const rect = node.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                continue;
            }

            const text = node.innerText?.replace(/\s+/g, " ").trim();

            if (!text || text.length < 35 || text.length > 700) {
                continue;
            }

            const sentences = splitIntoReviewSentences(text);

            for (const sentence of sentences) {
                if (!isHumanLikeReviewSentence(sentence)) {
                    continue;
                }

                const key = sentence.toLowerCase();

                if (seen.has(key)) {
                    continue;
                }

                seen.add(key);
                reviews.push(sentence);

                if (reviews.length >= Math.min(Math.max(limit, 5), 8)) {
                    return reviews;
                }
            }
        }

        return reviews;
    }

    function isLikelyReviewText(text) {
        if (!text) {
            return false;
        }

        const cleanText = cleanReviewText(text);

        if (cleanText.length < 30 || cleanText.length > 1200) {
            return false;
        }

        if (!/[a-z]{3,}/i.test(cleanText) || cleanText.split(" ").length < 6) {
            return false;
        }

        if (/^(₹|Rs\.?|INR)\s*[\d,]+/i.test(cleanText)) {
            return false;
        }

        if (/\b(buy|free shipping|cash on delivery|returns?|replacement|genuine products?|delivery|warranty|policy|online)\b/i.test(cleanText)) {
            return false;
        }

        if (/^\s*(fire-boltt|boat|noise|samsung|apple|oneplus)\b/i.test(cleanText) && cleanText.length > 120) {
            return false;
        }

        if (/^(buy now|add to cart|view more sellers|save extra|wow! deal)$/i.test(cleanText)) {
            return false;
        }

        return true;
    }

    function addReviewCandidate(items, text, limit = 5) {
        const cleanText = cleanReviewText(text);

        if (!isLikelyReviewText(cleanText) || items.includes(cleanText)) {
            return;
        }

        items.push(cleanText);

        if (items.length > limit) {
            items.length = limit;
        }
    }

    function collectTexts(selectors, limit = 10) {
        const items = [];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);

            for (const el of elements) {
                const text = el.innerText?.replace(/\s+/g, " ").trim();

                if (text && !items.includes(text)) {
                    items.push(text);
                }

                if (items.length >= limit) {
                    return items;
                }
            }
        }

        return items;
    }

    function findPriceByPattern() {
        const blockedContainers = [
            "[class*='exchange']",
            "[class*='offer']",
            "[class*='bank']",
            "[class*='emi']",
            "[class*='strike']",
            "del",
            "s",
        ];

        const candidates = Array.from(document.querySelectorAll("div, span"))
            .filter((el) => {
                const text = el.innerText?.replace(/\s+/g, " ").trim();

                if (!text || !normalizePrice(text)) {
                    return false;
                }

                for (const selector of blockedContainers) {
                    if (el.closest(selector)) {
                        return false;
                    }
                }

                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            })
            .slice(0, 200);

        for (const el of candidates) {
            const price = normalizePrice(el.innerText);

            if (price) {
                return price;
            }
        }

        return null;
    }

    function hasEnoughFlipkartEvidence(data) {
        if (!data?.title) {
            return false;
        }

        if (data.reviews?.length) {
            return true;
        }

        return Boolean(data.price && data.rating && data.reviewCount);
    }

    function findFlipkartReviewCountFromBody() {
        const text = document.body.innerText?.replace(/\s+/g, " ").trim();

        if (!text) {
            return null;
        }

        const strongPattern = text.match(/(\d[\d,]*)\s+ratings?\s+and\s+(\d[\d,]*)\s+reviews?/i);

        if (strongPattern) {
            return strongPattern[2].replace(/,/g, "");
        }

        const compactPattern = text.match(/(\d(?:\.\d)?)\s*\|\s*(\d[\d,]*)/);

        if (compactPattern) {
            return compactPattern[2].replace(/,/g, "");
        }

        return null;
    }

    function findFlipkartTitle() {
        const heading = firstText([
            "h1",
            "[data-testid='product-title']",
            "span.B_NuCI",
            "span.VU-ZEz",
            "div.C7fEHH h1",
        ]);

        if (heading) {
            return heading;
        }

        const ogTitle = document.querySelector('meta[property="og:title"]')?.content?.trim();

        if (ogTitle) {
            return ogTitle.replace(/\s*-\s*Buy.*$/i, "").trim();
        }

        return null;
    }

    function findFlipkartPid() {
        const currentUrl = new URL(window.location.href);
        const urlPid = currentUrl.searchParams.get("pid");

        if (urlPid) {
            return urlPid;
        }

        const canonicalHref = document.querySelector("link[rel='canonical']")?.href;

        if (canonicalHref) {
            const canonicalPid = new URL(canonicalHref, window.location.origin).searchParams.get("pid");

            if (canonicalPid) {
                return canonicalPid;
            }
        }

        const scripts = Array.from(document.scripts);

        for (const script of scripts) {
            const text = script.textContent || "";
            const match = text.match(/["']pid["']\s*:\s*["']([A-Z0-9]+)["']/i);

            if (match?.[1]) {
                return match[1];
            }
        }

        return null;
    }

    function buildFlipkartReviewUrl() {
        const currentUrl = new URL(window.location.href);
        const pid = findFlipkartPid();
        const lid = currentUrl.searchParams.get("lid");
        const productTitle = findFlipkartTitle() || "";
        const slug = productTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 120)

        if (!pid) {
            return null;
        }

        const reviewUrl = new URL(`${window.location.origin}/product-reviews/${pid}`);

        if (slug) {
            reviewUrl.searchParams.set("title", slug);
        }
        reviewUrl.searchParams.set("pid", pid);

        if (lid) {
            reviewUrl.searchParams.set("lid", lid);
        }

        reviewUrl.searchParams.set("marketplace", "FLIPKART");
        reviewUrl.searchParams.set("aid", "overall");
        reviewUrl.searchParams.set("certifiedBuyer", "false");
        reviewUrl.searchParams.set("sortOrder", "MOST_RELEVANT");

        return reviewUrl.toString();
    }

    function extractFlipkartReviewsFromDocument(doc, limit = 5) {
        const selectors = [
            "div.ZmyHeo",
            "div.t-ZTKy",
            "div._11pzQk",
            "p._2-N8zT",
            "div[data-testid='review-text']",
            "[data-testid*='review']",
            "div[class*='review'] p",
            "div[class*='review'] span",
        ];

        const reviews = [];

        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);

            for (const el of elements) {
                addReviewCandidate(reviews, el.textContent, limit);
                if (reviews.length >= limit) {
                    return reviews;
                }
            }
        }

        const structuredReviews = extractStructuredReviewsFromDocument(doc, limit);

        for (const review of structuredReviews) {
            addReviewCandidate(reviews, review, limit);

            if (reviews.length >= limit) {
                return reviews;
            }
        }

        return reviews;
    }

    function extractStructuredReviewsFromDocument(doc, limit = 5) {
        const reviews = [];
        const scripts = Array.from(doc.querySelectorAll("script:not([src])"));

        for (const script of scripts) {
            const text = script.textContent || "";

            if (!text || !/reviewText|customer review|user review|ratingCount|reviewCount/i.test(text)) {
                continue;
            }

            const patterns = [
                /"reviewText"\s*:\s*"((?:\\.|[^"])*)"/gi,
                /"text"\s*:\s*"((?:\\.|[^"])*)"/gi,
                /"description"\s*:\s*"((?:\\.|[^"])*)"/gi,
            ];


            for (const pattern of patterns) {
                const matches = text.matchAll(pattern);
                for (const match of matches) {          // ← now in same scope
                    addReviewCandidate(reviews, decodeJsonString(match[1]), limit);
                    if (reviews.length >= limit) return reviews;
                }
            }
        }


        return reviews;
    }

    async function fetchFlipkartReviews(limit = 5) {
        const reviewUrl = buildFlipkartReviewUrl();

        if (!reviewUrl) {
            return [];
        }

        try {
            const response = await fetch(reviewUrl, {
                credentials: "include",
            });

            if (!response.ok) {
                return [];
            }

            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            return extractFlipkartReviewsFromDocument(doc, limit);
        } catch (error) {
            console.warn("Failed to fetch Flipkart reviews:", error.message);
            return [];
        }
    }

    function normalizeData(data) {
        return {
            title: data?.title || null,
            price: data?.price || null,
            rating: data?.rating || null,
            reviewCount: data?.reviewCount || null,
            site: getSiteName(),
            reviews: Array.isArray(data?.reviews) ? data.reviews.filter(Boolean).slice(0, 5) : [],
        };
    }

    async function scrapeAmazon() {
        const title =
            document.querySelector("#productTitle")?.innerText?.trim() || null;

        const price =
            normalizePrice(
                document.querySelector(".a-price .a-offscreen")?.innerText ||
                document.querySelector("#corePriceDisplay_desktop_feature_div .a-offscreen")?.innerText
            ) || null;

        const rating =
            document.querySelector("#acrPopover .a-size-base")?.innerText?.match(/[\d.]+/)?.[0] ||
            document.querySelector(".a-icon-alt")?.innerText?.match(/[\d.]+/)?.[0] ||
            null;

        const reviewCount =
            document.querySelector("#acrCustomerReviewText")?.innerText
                ?.replace(/,/g, "").match(/\d+/)?.[0] || null;

        console.log("TrueCart Amazon: title:", title, "| rating:", rating, "| reviewCount:", reviewCount);

        let reviews = extractReviewsFromCurrentPage();
        console.log("TrueCart: inline reviews:", reviews.length);

        if (!reviews.length) {
            console.log("TrueCart: no inline reviews, fetching reviews page...");
            reviews = await fetchAmazonReviews(5);
        }
        if (!reviews.length) {
            console.log("TrueCart: trying class-free scraper...");
            reviews = await getReviewsWithoutClass(5);
        }

        console.log("TrueCart: final review count:", reviews.length);
        return normalizeData({ title, price, rating, reviewCount, reviews });
    }

async function fetchAmazonReviews(limit = 5) {
    const asinMatch = window.location.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (!asinMatch) {
        console.log("TrueCart: could not find ASIN in URL");
        return [];
    }

    const asin = asinMatch[1];
    console.log("TrueCart: fetching reviews for ASIN:", asin);

    const reviewUrl = `https://www.amazon.in/product-reviews/${asin}?ie=UTF8&reviewerType=all_reviews&sortBy=recent&pageNumber=1`;

    try {
        const response = await fetch(reviewUrl, {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-IN,en;q=0.9",
                "Referer": `https://www.amazon.in/dp/${asin}`,
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Upgrade-Insecure-Requests": "1",
            },
        });

        console.log("TrueCart: review page status:", response.status);

        if (!response.ok) {
            console.warn("TrueCart: review page returned", response.status);
            return [];
        }

        const html = await response.text();
        console.log("TrueCart: review HTML length:", html.length);

        if (html.includes("ap/signin") || html.includes("signIn") || html.length < 5000) {
            // console.warn("TrueCart: Amazon redirected to login, trying fallback");
            return extractReviewsFromCurrentPage();
        }

        const doc = new DOMParser().parseFromString(html, "text/html");
        const reviews = [];
        const seen = new Set();


        const reviewSelectors = [
            '[data-hook="review-body"] span[data-hook="review-collapsed"]',
            '[data-hook="review-body"] span',
            '.review-text-content span',
            '.review-text span',
            '[class*="review-text"] span',
            'span[data-hook="review-collapsed"]',
        ];

        for (const selector of reviewSelectors) {
            doc.querySelectorAll(selector).forEach(el => {
                const text = cleanReviewText(el.textContent?.replace(/\s+/g, " ").trim());
                if (text && text.length > 40 && text.length < 1000 && !seen.has(text)) {

                    if (!/(read more|helpful|report|verified purchase|one person found)/i.test(text)) {
                        seen.add(text);
                        reviews.push(text);
                    }
                }
            });
            if (reviews.length >= limit) break;
        }

        console.log("TrueCart: extracted review count:", reviews.length);
        return reviews.slice(0, limit);

    } catch (err) {
        console.warn("TrueCart: fetchAmazonReviews failed:", err.message);
        return extractReviewsFromCurrentPage();
    }
}


function extractReviewsFromCurrentPage() {
    const reviews = [];
    const seen = new Set();

    const selectors = [
        '#cm-cr-dp-review-list [data-hook="review-body"] span',
        '#reviews-summary [data-hook="review-body"] span',
        '.cr-widget-desktop [data-hook="review-body"] span',
        '[data-hook="top-reviews"] [data-hook="review-body"] span',
        '[data-hook="review-collapsed"]',
        '[data-hook="review-title"] span:not([class])',
    ];

    for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
            const text = cleanReviewText(el.textContent?.replace(/\s+/g, " ").trim());
            if (text && text.length > 30 && !seen.has(text)) {
                if (!/(read more|helpful|report|verified purchase)/i.test(text)) {
                    seen.add(text);
                    reviews.push(text);
                }
            }
        });
        if (reviews.length >= 5) break;
    }

    console.log("TrueCart: inline reviews found:", reviews.length);
    return reviews.slice(0, 5);
};
function scrapeFlipkart() {
    const title = findFlipkartTitle();

    const rating =
        normalizeNumber(firstText([
            "div.XQDdHH",
            "span.XQDdHH",
            "div._3LWZlK",
            "span._3LWZlK",
            "div.ipqd2A",
            "[class*='rating']",
            "[data-testid='rating']",
        ])) || findRatingByPattern();

    const reviewCount =
        normalizeNumber(firstText([
            "span.Wphh3N",
            "div.Wphh3N",
            "span._2_R_DZ",
            "div._2_R_DZ",
            "div.row.j-aW8Z",
            "[class*='review']",
            "[data-testid='review-count']",
        ])) || findReviewCountByPattern() || findFlipkartReviewCountFromBody();

    const price = normalizePrice(firstText([
        "div.CxhGGd div.Nx9bqj",
        "div.CxhGGd div._30jeq3",
        "div.Nx9bqj",
        "div._30jeq3",
        "[data-testid='price']",
    ])) || findPriceByPattern();


    const reviews = extractReviewTexts([
        "div.ZmyHeo",
        "div.t-ZTKy",
        "div._11pzQk",
        "p._2-N8zT",
        "div[data-testid='review-text']",
        "[data-testid*='review']",
        "[class*='review'] p",
        "[class*='review'] span",
    ]);


    const structuredReviews = extractStructuredReviewsFromDocument(document, 5);
    const textBlockReviews = [];

    for (const text of extractTextBlocks(10)) {
        addReviewCandidate(textBlockReviews, text, 5);
        if (textBlockReviews.length >= 5) {
            break;
        }
    }

    return normalizeData({
        title,
        price,
        rating,
        reviewCount,
        reviews: reviews.length ? reviews : (structuredReviews.length ? structuredReviews : textBlockReviews),
    });
}

async function scrapeFlipkartWithFallback() {
    const data = scrapeFlipkart();
    const classFreeReviews = await getReviewsWithoutClass(6);

    if (classFreeReviews.length) {
        return normalizeData({
            ...data,
            reviews: classFreeReviews,
        });
    }

    if (data.reviews.length) {
        return normalizeData(data);
    }

    const fetchedReviews = await fetchFlipkartReviews(5);

    return normalizeData({
        ...data,
        reviews: fetchedReviews.length ? fetchedReviews : data.reviews,
    });
}

function scrapeMyntra() {
    return normalizeData({
        title:
            document.querySelector("h1")?.innerText?.trim() ||
            document.querySelector(".pdp-title")?.innerText?.trim() ||
            null,
        price:
            normalizePrice(
                document.querySelector(".pdp-price strong")?.innerText ||
                document.querySelector(".product-discountedPrice")?.innerText
            ) || null,
        rating:
            document.querySelector(".index-overallRating")?.innerText?.match(/[\d.]+/)?.[0] || null,
        reviewCount:
            document.querySelector(".index-ratingsCount")?.innerText?.replace(/,/g, "").match(/\d+/)?.[0] || null,
        reviews: Array.from(document.querySelectorAll(".user-review-reviewTextWrapper"))
            .map((el) => el.innerText.replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .slice(0, 5),
    });
}

function scrapeMeesho() {
    return normalizeData({
        title:
            document.querySelector("h1")?.innerText?.trim() || null,
        price:
            normalizePrice(
                firstText([
                    "[class*='price']",
                    "[data-testid='price']",
                ])
            ) || null,
        rating:
            document.querySelector("[label*='rating']")?.innerText?.match(/[\d.]+/)?.[0] || null,
        reviewCount:
            document.body.innerText.replace(/,/g, "").match(/\b\d+\s+Reviews?\b/i)?.[0]?.match(/\d+/)?.[0] || null,
        reviews: Array.from(document.querySelectorAll('[data-testid="review"], [class*="review"], p'))
            .map((el) => el.innerText.replace(/\s+/g, " ").trim())
            .filter((text) => text.length > 30)
            .slice(0, 5),
    });
}

// function scrapeMeesho() {
//     const title =
//         document.querySelector("h1")?.innerText?.trim() ||
//         document.querySelector("span")?.innerText?.trim() ||
//         null;

    
//     let price =
//         document.querySelector("h4")?.innerText ||
//         document.querySelector("[data-testid='product-price']")?.innerText ||
//         firstText(["[class*='price']"]);

    
//     if (!price) {
//         const match = document.body.innerText.match(/₹\s?[\d,]+/);
//         price = match ? match[0] : null;
//     }

//     return normalizeData({
//         title,
//         price: normalizePrice(price),
//         rating:
//             document.querySelector("[label*='rating']")?.innerText?.match(/[\d.]+/)?.[0] || null,
//         reviewCount:
//             document.body.innerText
//                 .replace(/,/g, "")
//                 .match(/\b\d+\s+Reviews?\b/i)?.[0]
//                 ?.match(/\d+/)?.[0] || null,
//         reviews: Array.from(
//             document.querySelectorAll('[data-testid="review"], [class*="review"], p')
//         )
//             .map((el) => el.innerText.replace(/\s+/g, " ").trim())
//             .filter((text) => text.length > 30)
//             .slice(0, 5),
//     });
// }

function getSiteName() {
    const host = window.location.hostname;

    if (host.includes("amazon.")) return "amazon";
    if (host.includes("flipkart.")) return "flipkart";
    if (host.includes("myntra.")) return "myntra";
    if (host.includes("meesho.")) return "meesho";

    return "unknown";
}

async function getProductData() {
    const site = getSiteName();

    if (site === "amazon") return await scrapeAmazon();
    if (site === "flipkart") return scrapeFlipkart();
    if (site === "myntra") return scrapeMyntra();
    if (site === "meesho") return scrapeMeesho();

    return normalizeData({
        title: document.querySelector("h1")?.innerText?.trim() || null,
        price: normalizePrice(firstText(["[class*='price']", "[data-testid='price']"])),
        rating: null,
        reviewCount: null,
        reviews: [],
    });
}

async function getProductDataAsync() {
    const site = getSiteName();

    if (site === "amazon") {
        return await getProductData();
    }

    if (site === "flipkart") {
        return scrapeFlipkartWithFallback();
    }

    const data = await getProductData();
    const reviews = await getReviewsWithoutClass(6);

    if (!reviews.length) {
        return data;
    }

    return normalizeData({
        ...data,
        reviews,
    });
}

function waitForProductData(timeoutMs = 12000) {
    return new Promise((resolve) => {
        let finished = false;
        let checking = false;
        const startedAt = Date.now();

        const finish = (data) => {
            if (finished) {
                return;
            }

            finished = true;
            observer.disconnect();
            clearInterval(interval);
            resolve(data);
        };

        const check = async () => {
            if (checking || finished) {
                return false;
            }

            checking = true;

            try {
                const data = await getProductDataAsync();

                const site = getSiteName();
                const timedOut = Date.now() - startedAt >= timeoutMs;

                if (site === "flipkart") {
                    if (hasEnoughFlipkartEvidence(data) || timedOut) {
                        finish(data);
                        return true;
                    }

                    return false;
                }

                if (data.title) {
                    finish(data);
                    return true;
                }

                if (timedOut) {
                    finish(data);
                    return true;
                }

                return false;
            } finally {
                checking = false;
            }
        };

        const observer = new MutationObserver(() => {
            check();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        const interval = setInterval(() => {
            check();
        }, 500);

        check();
    });
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "GET_PRODUCT_FROM_PAGE") {
            waitForProductData().then((data) => {
                sendResponse(data);
            });
            return true;
        }
    });
}


function waitForProduct() {
    let attempts = 0;

    const interval = setInterval(async () => {
        attempts++;

        const productData = await getProductDataAsync();
        console.log("extracted data", productData);
        console.log("PRODUCT DATA:", productData);

        if (productData.title) {
            const fakeAnalysis = detectFakeReviews(productData.reviews || []);
            console.log("TrueCart fakeAnalysis", fakeAnalysis);
            safeSendMessage({
                type: "PRODUCT_DATA",
                data: {
                    ...productData,
                    fakeAnalysis
                }
            },()=>{
                clearInterval(interval);
            });
        }

        if (attempts > 10) {
            console.log("Failed to detect product");
            clearInterval(interval);
        }
    }, 1000);
}

if (
    window.location.hostname.includes("amazon.") ||
    window.location.hostname.includes("flipkart.")
) {
    waitForProduct();
}
}
