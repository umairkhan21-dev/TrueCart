function PrivacyPolicy() {
  return (
    <main className="legal-shell">
      <div className="legal-hero">
        <span className="legal-eyebrow">TrueCart Legal</span>
        <h1>Privacy Policy</h1>
        <p>
          TrueCart is a browser extension that helps shoppers understand product reviews and
          pricing insights with faster, clearer AI analysis.
        </p>
        <div className="legal-updated">Last updated: May 2026</div>
      </div>

      <div className="legal-card">
        <section className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            TrueCart is a browser extension that helps users analyze product reviews and pricing
            insights.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Information We Collect</h2>
          <p>We do not collect personal user data.</p>
          <p>We may process the following information while generating shopping insights:</p>
          <ul>
            <li>Product titles</li>
            <li>Prices</li>
            <li>Public reviews</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. How We Use Information</h2>
          <ul>
            <li>To generate insights such as fake review detection and alternative suggestions</li>
            <li>To improve product recommendations</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Data Storage</h2>
          <p>No personal data is stored.</p>
          <p>Information is processed temporarily only to deliver extension results.</p>
        </section>

        <section className="legal-section">
          <h2>5. Third-party Services</h2>
          <p>TrueCart may use AI APIs, including OpenAI or similar providers, to generate insights.</p>
          <p>We do not share personal data with these services.</p>
        </section>

        <section className="legal-section">
          <h2>6. Cookies</h2>
          <p>We do not use cookies.</p>
        </section>

        <section className="legal-section">
          <h2>7. User Rights</h2>
          <p>Users can uninstall the extension at any time.</p>
        </section>

        <section className="legal-section">
          <h2>8. Changes to Policy</h2>
          <p>We may update this Privacy Policy at any time.</p>
        </section>
      </div>
    </main>
  );
}

export default PrivacyPolicy;
