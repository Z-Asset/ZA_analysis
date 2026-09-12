# Domain Profile

<!--
Asset Pricing + Machine Learning / Deep Learning research profile.
All agents read this file to calibrate their field-specific behavior.
Edit sections as your focus shifts (e.g., options, fixed income, crypto,
Chinese A-shares, alternative data).
-->

## Field

**Primary:** Empirical Asset Pricing
**Adjacent subfields:** Financial Machine Learning, Quantitative Finance, Financial Econometrics, Investment Management
**Method emphasis:** Cross-sectional return prediction, factor models, stochastic discount factor (SDF) estimation, predictive regressions, ML/DL methods for return forecasting and portfolio construction.

---

## Target Journals (ranked by tier)

<!-- The Orchestrator uses this for journal selection. The Librarian prioritizes these in searches. -->

| Tier | Journals |
|------|----------|
| Top-3 | Journal of Finance (JF), Journal of Financial Economics (JFE), Review of Financial Studies (RFS) |
| Top field | Management Science, Journal of Financial and Quantitative Analysis (JFQA), Review of Finance (RF), Journal of Econometrics (financial econometrics) |
| Strong field | Journal of Banking and Finance, Journal of Empirical Finance, Journal of Financial Markets, Critical Finance Review, Journal of Financial Econometrics |
| Specialty | Journal of Portfolio Management, Financial Analysts Journal, Journal of Investment Management, Journal of Financial Data Science, Quantitative Finance |

---

## Common Data Sources

<!-- The Explorer prioritizes these. The explorer-critic knows their quirks. -->

| Dataset | Type | Access | Notes |
|---------|------|--------|-------|
| CRSP | Returns (US equity, monthly/daily) | Paid (WRDS) | Gold standard for US returns; survivorship-bias-free with delisting returns |
| Compustat | Fundamentals/accounting | Paid (WRDS) | Merge with CRSP via PERMNO/linktable; point-in-time vs as-reported |
| Kenneth French Data Library | Factor portfolios | Public | Fama-French 3/5/6-factor, momentum, industry, 25/100 size-BM portfolios |
| Open Source Asset Pricing (Chen-Zimmermann) | Characteristics / predictor signals | Public | Reproduces ~200 published predictors; standard ML benchmark set |
| OptionMetrics | Options (IV, greeks) | Paid (WRDS) | Implied vol, put-call, option-based factors |
| TAQ / Daily TAQ | Intraday quotes/trades | Paid | High-frequency signals, liquidity, realized vol |
| IBES | Analyst forecasts | Paid (WRDS) | Earnings surprises, revisions |
| FRED | Macro predictors | Public | Yield curve, inflation, credit spreads; Goyal-Welch predictors |
| AQR Data Library | Factor returns | Public | Replicated factors, QMJ/BAB, monthly |
| SEC EDGAR / news / social | Text / alternative data | Public/scraped | Sentiment, topic, LLM-embedded text features |

---

## Common Identification Strategies

<!-- In asset pricing, "identification" maps to the estimator that links
     characteristics/factors to expected returns. The Strategist considers
     these first; the strategist-critic knows field-specific threats. -->

| Strategy | Typical Application | Key Assumption to Defend |
|----------|-------------------|------------------------|
| Portfolio sorts (single/double) | Characteristic-return monotonicity | Spread return robust to weighting scheme and breakpoints |
| Fama-MacBeth cross-sectional regression (1973) | Price-of-risk estimation for characteristics | Newey-West HAC for overlapping/autocorrelated errors |
| Time-series factor regression (alpha/spanning) | Factor model fit, alpha | GRS test for joint alpha=0; factor not spanned |
| SDF / GMM estimation | Hansen-Jagannathan distance, pricing kernel | SDF correctly specified; weak-factor issues (Kleibergen) |
| Predictive regression | Return/equity-premium forecasting | OOS evaluation, not just in-sample; Stambaugh bias for persistent predictors |
| Machine learning (penalized/trees/NN) | High-dimensional return prediction | Walk-forward CV, no look-ahead, economic value net of costs |
| Deep learning (LSTM/GRU/transformer) | Sequence/representation learning on characteristics | Complexity premium is economic, not overfit; compare to linear baseline |
| IPCA / latent factors | Kelly-Pruitt-Su instrumented factors | Latent factor identification |
| Shrinkage / sparse SDF | Kozak-Nagel-Santosh | Prior structure is economically motivated |

---

## Field Conventions

<!-- The Coder and Writer follow these. The writer-critic checks for them. -->

- Always report BOTH statistical and economic significance (alpha, Sharpe, certainty-equivalent return).
- Annualize returns, alphas, and Sharpe ratios; state the annualization and risk-free rate convention.
- Report out-of-sample R^2 (Campbell-Thompson 2008) for predictive regressions; benchmark against Goyal-Welch (2008) historical mean and simple linear predictors.
- Use Newey-West (1987) HAC standard errors for overlapping horizons; state lag length.
- Value-weighted returns as the primary result; equal-weighted as robustness.
- ML/DL papers MUST document: hyperparameter tuning protocol (walk-forward or nested CV), feature set, train/valid/test split, and comparison against a linear benchmark (OLS/elastic-net). Complexity must buy measurable OOS gain.
- Report transaction costs / turnover / capacity for any tradable strategy. A signal that dies under realistic costs is not a contribution.
- Address data snooping: Harvey-Liu-Zhu (2016) t-stat threshold (~3.0), White (2000) reality check / Hansen (2005) SPA for multiple testing, or out-of-sample confirmation.
- Feature importance must be interpretable (SHAP / permutation / grouped by economic category), not just a black-box ranking.
- Portfolio construction: describe weighting (value-weight, equal-weight, mean-variance, tangency), rebalancing frequency, and short-sale constraints.

---

## Notation Conventions

<!-- The Writer and writer-critic enforce these. -->

| Symbol | Meaning | Anti-pattern |
|--------|---------|-------------|
| $r_{i,t}$ | Excess return of asset i in period t | Don't use $R$ for excess and gross interchangeably |
| $R_{i,t}$ | Gross (total) return | Don't drop the subscript in derivations |
| $f_t$ | Factor realizations | Reserve $F$ for the factor matrix |
| $m_{t+1}$ | Stochastic discount factor | Don't write $M$ without time subscript |
| $\beta_i$, $\lambda$ | Factor loadings / price of risk | Keep $\beta$ for loadings, $\lambda$ for prices |
| $\hat{\alpha}_i$ | Pricing error (alpha) | Distinguish from performance alpha where relevant |
| $R^2_{OOS}$ | Out-of-sample R^2 | State sign convention (positive = beats benchmark) |
| $\mathrm{SR}$ | Annualized Sharpe ratio | State annualization factor |

---

## Seminal References

<!-- The Librarian ensures these are cited when relevant. The strategist-critic knows their methods. -->

| Paper | Why It Matters |
|-------|---------------|
| Sharpe (1964) | CAPM — the baseline pricing model |
| Fama & MacBeth (1973) | Cross-sectional regression framework |
| Fama & French (1993) | Three-factor model; workhorse benchmark |
| Hansen (1982) / Hansen & Jagannathan (1991) | GMM / SDF and the HJ bound |
| Goyal & Welch (2008) | Return predictability benchmark — the standard null |
| Campbell & Thompson (2008) | OOS R^2 metric for predictability |
| Cochrane (2005) | Asset Pricing textbook — canonical framing |
| Harvey, Liu & Zhu (2016) | t-stat > 3.0 threshold for new factors |
| Kelly, Pruitt & Su (2019) | Instrumented PCA (IPCA) |
| Kozak, Nagel & Santosh (2020) | Shrinkage / sparse SDF estimation |
| Gu, Kelly & Xiu (2020) | Empirical asset pricing via machine learning (RFS) — the ML benchmark |
| Chen, Pelger & Zhu (2024) | Deep learning in asset pricing (Management Science) |
| Kelly, Malamud & Zhou (2024) | The virtue of complexity in return prediction |
| Chen & Zimmermann (2022) | Open Source Asset Pricing — replication benchmark set |

---

## Theoretical Foundational References

<!-- The Theorist and theorist-critic default to these anchors when building or reviewing a theory section.
     Only needed if the paper has a formal theory section (asset pricing theory, ML/DL asymptotic theory). -->

| Topic | Anchor references |
|-------|------------------|
| SDF / no-arbitrage pricing | Ross (1976) APT; Hansen & Jagannathan (1991); Cochrane (2005) |
| Consumption-based asset pricing | Merton (1973) ICAPM; Campbell & Cochrane (1999) habits |
| Weak factors / factor zoo | Onatski; Kleibergen & Zhan; Giglio & Xiu (2021) |
| High-dimensional / ML asymptotics | Gu, Kelly & Xiu (2020); Chen, Pelger & Zhu (2024); Kelly, Malamud & Zhou (2024) |
| Latent factor models | Kelly, Pruitt & Su (2019); Lettau & Pelger (2020) |

---

## Paper Author Team

<!-- Used by the theorist-critic to calibrate respect. List the author team if they are
     themselves foundational on a topic. -->

| Author | Foundational on |
|--------|----------------|
| (fill in your team) | (their prior contributions on the topic) |

---

## Field-Specific Referee Concerns

<!-- The domain-referee and methods-referee watch for these. -->

- "Is this just data snooping / overfitting?" — the single most common ML asset-pricing objection. Preempt with OOS discipline and HLZ threshold.
- "Does it survive transaction costs?" — report net-of-cost performance for any tradable strategy.
- "What is the economic mechanism?" — a predictive signal without a story will be rejected.
- "Why does the complexity pay?" — must beat a linear benchmark, not just the historical mean.
- "Are the features point-in-time and free of look-ahead bias?" — stale/misaligned accounting data is fatal.
- "How sensitive to the sample split / CV design?" — show robustness across subperiods.
- "Weak factor / weak instrument?" — relevant for GMM/SDF and predictive regressions with persistent predictors.
- "Decile spreads or ML gains are tiny (<1% annual) — economically meaningful?" — report certainty-equivalent gains.

---

## Quality Tolerance Thresholds

<!-- Customize for your domain's standards. Used by quality.md and cross-language replication. -->

| Quantity | Tolerance | Rationale |
|----------|-----------|-----------|
| Sharpe ratio | 1e-3 | Portfolio statistics reported to 2-3 decimals |
| Annualized alpha | 1e-3 (in %) | Economic magnitude matters |
| OOS R^2 | 1e-4 | Values are often < 1%, report precisely |
| Point estimates (cross-sectional) | 1e-6 (relative) | Numerical precision in FM/predictive regressions |
| Standard errors | 1e-4 (relative) | HAC/DF corrections differ across implementations |
| Portfolio weights | 1e-6 | Reproducible portfolio construction |
