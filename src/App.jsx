import React, { useState } from "react";
import "./App.css";
import IDE from "./pages/IDE.jsx";

function LandingPage({ onOpenIDE }) {
  return (
    <div className="landing">
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />

      <div className="landing-content">
        <div className="landing-badge">
          <span className="badge-dot" />
          Universal Programming Language · v1.0
        </div>

        <h1 className="landing-title">
          <span className="title-human">Human</span>
          <span className="title-to">to</span>
          <span className="title-code">Code</span>
        </h1>

        <p className="landing-subtitle">
          Edit code in your language. Any language. Any human.
        </p>

        <div className="landing-features">
          {[
            "JavaScript → हिंदी",
            "Semantic UPL Layer",
            "Live Sync",
            "AST Viewer",
            "In-Browser",
          ].map((f) => (
            <span key={f} className="feature-chip">
              {f}
            </span>
          ))}
        </div>

        {/* UPL Demo */}
        <div className="upl-demo">
          <div className="demo-col">
            <span className="demo-label">JavaScript</span>
            <code className="demo-code">children.push(button)</code>
          </div>

          <div className="demo-arrow">
            <div className="arrow-line" />
            <span className="arrow-glyph">⇕</span>
            <div className="arrow-line rev" />
          </div>

          <div className="demo-col">
            <span className="demo-label">UPL Layer</span>
            <code className="demo-code" style={{ color: "var(--accent-primary)" }}>
              array_push · children · button
            </code>
          </div>

          <div className="demo-arrow">
            <div className="arrow-line" />
            <span className="arrow-glyph">⇕</span>
            <div className="arrow-line rev" />
          </div>

          <div className="demo-col">
            <span className="demo-label">हिंदी UPL</span>
            <span className="demo-upl">children जोड़ो_अंत_में button</span>
          </div>
        </div>

        <button className="cta-button" onClick={onOpenIDE}>
          <span className="cta-shimmer" />
          <span>Open IDE</span>
          <span className="cta-icon">→</span>
        </button>
      </div>

      {/* Architecture */}
      <div className="landing-arch">
        {["JavaScript", "↕", "UPL Semantic", "↕", "हिंदी / English"].map((n, i) => (
          <span key={i} className={n === "↕" ? "arch-arrow" : "arch-node"}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("landing");

  if (page === "ide") {
    return <IDE onBack={() => setPage("landing")} />;
  }

  return <LandingPage onOpenIDE={() => setPage("ide")} />;
}
