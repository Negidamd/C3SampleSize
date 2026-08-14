import { useState, useCallback, useMemo } from "react";

// ============================================================
// NEGIDA HANDBOOK OF CLINICAL RESEARCH – PART IV
// Sample Size Calculator Web App
// By Ahmed Negida, MD, PhD
// Companion tool for NCRT Module C3
// ============================================================

// ---- Z-value lookup ----
const Z_VALUES = {
  0.20: 0.8416, 0.15: 1.0364, 0.10: 1.2816, 0.05: 1.6449, 0.025: 1.9600, 0.01: 2.3263, 0.005: 2.5758,
};
const getZ = (alpha, twoSided = true) => {
  const a = twoSided ? alpha / 2 : alpha;
  return Z_VALUES[a] || 1.96;
};
const getZBeta = (beta) => Z_VALUES[beta] || 0.8416;

// ---- Normal quantile (probit) for general use ----
function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const sign = p < 0.5 ? -1 : 1;
  const pp = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(pp));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  return sign * (t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
}

// ============================================================
// UI Components
// ============================================================
const colors = {
  primary: "#1a365d",
  primaryLight: "#2b6cb0",
  accent: "#d69e2e",
  accentLight: "#ecc94b",
  bg: "#f7fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#2d3748",
  textLight: "#718096",
  success: "#38a169",
  successBg: "#f0fff4",
  info: "#3182ce",
  infoBg: "#ebf8ff",
  warning: "#d69e2e",
  warningBg: "#fffff0",
};

const InputField = ({ label, value, onChange, type = "number", step, min, max, hint, unit }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: colors.text, marginBottom: 4 }}>
      {label} {unit && <span style={{ fontWeight: 400, color: colors.textLight }}>({unit})</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      step={step || "any"}
      min={min}
      max={max}
      style={{
        width: "100%", padding: "8px 12px", border: `1px solid ${colors.border}`,
        borderRadius: 6, fontSize: 14, boxSizing: "border-box",
        outline: "none", transition: "border-color 0.2s",
      }}
      onFocus={(e) => (e.target.style.borderColor = colors.primaryLight)}
      onBlur={(e) => (e.target.style.borderColor = colors.border)}
    />
    {hint && <div style={{ fontSize: 11, color: colors.textLight, marginTop: 2 }}>{hint}</div>}
  </div>
);

const SelectField = ({ label, value, onChange, options, hint }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: colors.text, marginBottom: 4 }}>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "8px 12px", border: `1px solid ${colors.border}`,
        borderRadius: 6, fontSize: 14, boxSizing: "border-box", background: "#fff",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {hint && <div style={{ fontSize: 11, color: colors.textLight, marginTop: 2 }}>{hint}</div>}
  </div>
);

const ResultBox = ({ label, value, detail }) => (
  <div style={{
    background: colors.successBg, border: `2px solid ${colors.success}`,
    borderRadius: 8, padding: 16, marginTop: 16, textAlign: "center",
  }}>
    <div style={{ fontSize: 13, color: colors.success, fontWeight: 600, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 32, fontWeight: 700, color: colors.primary }}>{value}</div>
    {detail && <div style={{ fontSize: 13, color: colors.textLight, marginTop: 4 }}>{detail}</div>}
  </div>
);

const FormulaBox = ({ formula, reference }) => (
  <div style={{
    background: colors.infoBg, border: `1px solid #bee3f8`,
    borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13,
  }}>
    <div style={{ fontWeight: 600, color: colors.info, marginBottom: 4 }}>Formula</div>
    <div style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", color: colors.text }}>{formula}</div>
    {reference && <div style={{ fontSize: 11, color: colors.textLight, marginTop: 6 }}>{reference}</div>}
  </div>
);

const Card = ({ title, subtitle, bookRef, children }) => (
  <div style={{
    background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: 20, marginBottom: 16,
  }}>
    {title && <h3 style={{ margin: "0 0 4px", color: colors.primary, fontSize: 17 }}>{title}</h3>}
    {subtitle && <p style={{ margin: "0 0 6px", color: colors.textLight, fontSize: 13 }}>{subtitle}</p>}
    {bookRef && (
      <div style={{
        display: "inline-block", background: colors.warningBg, border: `1px solid ${colors.accent}`,
        borderRadius: 4, padding: "2px 8px", fontSize: 11, color: colors.warning, fontWeight: 600, marginBottom: 12,
      }}>{bookRef}</div>
    )}
    {children}
  </div>
);

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer",
      fontWeight: active ? 700 : 500, fontSize: 13, whiteSpace: "nowrap",
      background: active ? colors.primary : "transparent",
      color: active ? "#fff" : colors.textLight,
      transition: "all 0.2s",
    }}
  >
    {children}
  </button>
);

// ============================================================
// SCENARIO 1: Single Proportion / Population Surveys (p.32)
// ============================================================
function Scenario1() {
  const [p, setP] = useState("0.151");
  const [d, setD] = useState("0.05");
  const [ci, setCI] = useState("0.95");
  const [N, setN] = useState("7439");
  const [useFPC, setUseFPC] = useState(true);

  const calculate = () => {
    const pv = parseFloat(p), dv = parseFloat(d), civ = parseFloat(ci), Nv = parseFloat(N);
    if ([pv, dv, civ].some(isNaN) || dv === 0) return null;
    const alpha = 1 - civ;
    const z = getZ(alpha, true);
    const n_inf = Math.ceil((z * z * pv * (1 - pv)) / (dv * dv));
    if (useFPC && !isNaN(Nv) && Nv > 0) {
      const n_adj = Math.ceil(n_inf / (1 + (n_inf - 1) / Nv));
      return { n_inf, n_adj, z };
    }
    return { n_inf, n_adj: null, z };
  };

  const r = calculate();
  return (
    <Card
      title="Scenario 1: Single Proportion / Population Surveys"
      subtitle="Use for any study where the objective is to estimate the prevalence or proportion of an attribute in a population."
      bookRef="Handbook p.32-36"
    >
      <FormulaBox
        formula={"n = Z²·p·(1−p) / d²\nWith FPC: n_adj = n / (1 + (n−1)/N)"}
        reference="Negida Handbook Part IV, p.34"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <InputField label="Expected prevalence (p)" value={p} onChange={setP} hint="e.g. 0.151 for 15.1%" step="0.01" min="0" max="1" />
        <InputField label="Margin of error (d)" value={d} onChange={setD} hint="e.g. 0.05 for ±5%" step="0.01" />
        <SelectField label="Confidence level" value={ci} onChange={setCI} options={[
          { value: "0.90", label: "90% (Z=1.645)" },
          { value: "0.95", label: "95% (Z=1.960)" },
          { value: "0.99", label: "99% (Z=2.576)" },
        ]} />
        <InputField label="Population size (N)" value={N} onChange={setN} hint="Leave empty for infinite population" />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={useFPC} onChange={(e) => setUseFPC(e.target.checked)} />
        Apply Finite Population Correction (FPC)
      </label>
      {r && (
        <ResultBox
          label="Required Sample Size"
          value={useFPC && r.n_adj !== null ? r.n_adj : r.n_inf}
          detail={useFPC && r.n_adj !== null
            ? `Before FPC: ${r.n_inf} | After FPC: ${r.n_adj} (Z=${r.z.toFixed(3)})`
            : `Infinite population (Z=${r.z.toFixed(3)})`}
        />
      )}
    </Card>
  );
}

// ============================================================
// SCENARIO 2: Independent Case-Control Studies (p.37)
// ============================================================
function Scenario2() {
  const [inputMode, setInputMode] = useState("proportions");
  const [pCases, setPCases] = useState("0.766");
  const [pControls, setPControls] = useState("0.20");
  const [or, setOR] = useState("13.09");
  const [pControlsOR, setPControlsOR] = useState("0.20");
  const [power, setPower] = useState("0.90");
  const [alpha, setAlpha] = useState("0.05");
  const [ratio, setRatio] = useState("1");

  const calculate = () => {
    const pw = parseFloat(power), al = parseFloat(alpha), r = parseFloat(ratio);
    const z_alpha = getZ(al, true);
    const z_beta = getZBeta(1 - pw);

    if (inputMode === "proportions") {
      const p1 = parseFloat(pCases), p0 = parseFloat(pControls);
      if ([p1, p0].some(isNaN) || p1 === p0) return null;
      const pBar = (p1 + r * p0) / (1 + r);
      const num = Math.pow(z_alpha * Math.sqrt((1 + 1/r) * pBar * (1 - pBar)) + z_beta * Math.sqrt(p1 * (1 - p1) + p0 * (1 - p0) / r), 2);
      const den = Math.pow(p1 - p0, 2);
      const n_cases = Math.ceil(num / den);
      const n_controls = Math.ceil(n_cases * r);
      return { n_cases, n_controls, total: n_cases + n_controls };
    } else {
      const orv = parseFloat(or), p0 = parseFloat(pControlsOR);
      if ([orv, p0].some(isNaN)) return null;
      const p1 = (orv * p0) / (1 + p0 * (orv - 1));
      const pBar = (p1 + r * p0) / (1 + r);
      const num = Math.pow(z_alpha * Math.sqrt((1 + 1/r) * pBar * (1 - pBar)) + z_beta * Math.sqrt(p1 * (1 - p1) + p0 * (1 - p0) / r), 2);
      const den = Math.pow(p1 - p0, 2);
      const n_cases = Math.ceil(num / den);
      const n_controls = Math.ceil(n_cases * r);
      return { n_cases, n_controls, total: n_cases + n_controls, p1_calc: p1 };
    }
  };

  const res = calculate();
  return (
    <Card
      title="Scenario 2: Independent Case-Control Studies"
      subtitle="Use for unmatched case-control studies comparing exposure proportions between cases and controls using the Odds Ratio."
      bookRef="Handbook p.37-41"
    >
      <FormulaBox
        formula={"n = [Z_{α/2}·√((1+1/r)·P̄(1−P̄)) + Z_β·√(P₁(1−P₁)+P₀(1−P₀)/r)]²\n    / (P₁−P₀)²"}
        reference="Negida Handbook Part IV, p.40"
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <TabButton active={inputMode === "proportions"} onClick={() => setInputMode("proportions")}>From Two Proportions</TabButton>
        <TabButton active={inputMode === "or"} onClick={() => setInputMode("or")}>From Odds Ratio</TabButton>
      </div>
      {inputMode === "proportions" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InputField label="P(exposure) in cases" value={pCases} onChange={setPCases} hint="e.g. 0.766" />
          <InputField label="P(exposure) in controls" value={pControls} onChange={setPControls} hint="e.g. 0.20" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InputField label="Expected Odds Ratio" value={or} onChange={setOR} />
          <InputField label="P(exposure) in controls" value={pControlsOR} onChange={setPControlsOR} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <SelectField label="Power (1−β)" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha (α)" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5% (two-sided)" }, { value: "0.01", label: "1% (two-sided)" },
        ]} />
        <InputField label="Controls per case" value={ratio} onChange={setRatio} min="1" max="4" hint="1-4" />
      </div>
      {res && (
        <ResultBox
          label="Required Sample Size"
          value={res.total}
          detail={`${res.n_cases} cases + ${res.n_controls} controls${res.p1_calc ? ` (computed P₁ from OR = ${res.p1_calc.toFixed(4)})` : ""}`}
        />
      )}
    </Card>
  );
}

// ============================================================
// SCENARIO 3: Comparing Two Proportions (Independent Cohort / Clinical Trials) (p.42)
// ============================================================
function Scenario3() {
  const [inputMode, setInputMode] = useState("proportions");
  const [pExposed, setPExposed] = useState("0.18");
  const [pNonExposed, setPNonExposed] = useState("0.049");
  const [rr, setRR] = useState("");
  const [pNonExpRR, setPNonExpRR] = useState("0.049");
  const [power, setPower] = useState("0.90");
  const [alpha, setAlpha] = useState("0.05");
  const [ratio, setRatio] = useState("1");

  const calculate = () => {
    const pw = parseFloat(power), al = parseFloat(alpha), r = parseFloat(ratio);
    const z_a = getZ(al, true), z_b = getZBeta(1 - pw);
    let p1, p0;
    if (inputMode === "proportions") {
      p1 = parseFloat(pExposed); p0 = parseFloat(pNonExposed);
    } else {
      const rv = parseFloat(rr); p0 = parseFloat(pNonExpRR);
      if (isNaN(rv) || isNaN(p0)) return null;
      p1 = p0 * rv;
    }
    if (isNaN(p1) || isNaN(p0) || p1 === p0) return null;
    const pBar = (p1 + r * p0) / (1 + r);
    const num = Math.pow(
      z_a * Math.sqrt((1 + 1/r) * pBar * (1 - pBar)) +
      z_b * Math.sqrt(p1 * (1 - p1) + p0 * (1 - p0) / r),
      2
    );
    const den = Math.pow(p1 - p0, 2);
    const n1 = Math.ceil(num / den);
    const n2 = Math.ceil(n1 * r);
    return { n1, n2, total: n1 + n2, p1, p0 };
  };

  const res = calculate();
  return (
    <Card
      title="Scenario 3: Comparing Two Proportions (Cohort / Clinical Trial – Binary Outcome)"
      subtitle="Use for any study where the outcome is two proportions compared in the form of Risk Ratio (RR). Suitable for cohort studies and clinical trials with binary outcomes."
      bookRef="Handbook p.42-44"
    >
      <FormulaBox
        formula={"p̄ = (p₁ + r·p₂)/(1+r)\nn ≥ [Z_{α/2}·√((r+1)·p̄(1−p̄)) + Z_β·√(p₁(1−p₁)+p₂(1−p₂)/r)]²\n    / r·(p₂−p₁)²"}
        reference="Negida Handbook Part IV, p.44 (SampSize App formula)"
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <TabButton active={inputMode === "proportions"} onClick={() => setInputMode("proportions")}>Two Proportions</TabButton>
        <TabButton active={inputMode === "rr"} onClick={() => setInputMode("rr")}>From Risk Ratio</TabButton>
      </div>
      {inputMode === "proportions" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InputField label="P(event) in exposed group" value={pExposed} onChange={setPExposed} />
          <InputField label="P(event) in non-exposed group" value={pNonExposed} onChange={setPNonExposed} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InputField label="Expected Risk Ratio (RR)" value={rr} onChange={setRR} />
          <InputField label="P(event) in non-exposed" value={pNonExpRR} onChange={setPNonExpRR} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
        <InputField label="Controls per exposed" value={ratio} onChange={setRatio} min="1" max="4" />
      </div>
      {res && (
        <ResultBox
          label="Required Sample Size"
          value={res.total}
          detail={`${res.n1} exposed + ${res.n2} non-exposed`}
        />
      )}
    </Card>
  );
}

// ============================================================
// SCENARIO 4: Matched Case-Control Studies (p.45)
// ============================================================
function Scenario4() {
  const [or, setOR] = useState("2.68");
  const [pControls, setPControls] = useState("0.336");
  const [phi, setPhi] = useState("0.2");
  const [power, setPower] = useState("0.90");
  const [alpha, setAlpha] = useState("0.05");
  const [ratio, setRatio] = useState("1");

  const calculate = () => {
    const orv = parseFloat(or), p0 = parseFloat(pControls), phiv = parseFloat(phi);
    const pw = parseFloat(power), al = parseFloat(alpha), r = parseFloat(ratio);
    if ([orv, p0, pw, al].some(isNaN)) return null;
    const z_a = getZ(al, true), z_b = getZBeta(1 - pw);
    const p1 = (orv * p0) / (1 + p0 * (orv - 1));
    if (p1 === p0) return null;
    // Step 1: Compute independent case-control sample size (same as Scenario 2)
    const pBar = (p1 + r * p0) / (1 + r);
    const num = Math.pow(z_a * Math.sqrt((1 + 1/r) * pBar * (1 - pBar)) + z_b * Math.sqrt(p1 * (1 - p1) + p0 * (1 - p0) / r), 2);
    const den = Math.pow(p1 - p0, 2);
    const n_ind = Math.ceil(num / den);
    // Step 2: Adjust for matching using design effect: n_matched = ceil(n_ind / (1 - φ))
    const n_cases = Math.ceil(n_ind / (1 - phiv));
    const n_controls = Math.ceil(n_cases * r);
    return { n_cases, n_controls, total: n_cases + n_controls, p1, n_ind };
  };

  const res = calculate();
  return (
    <Card
      title="Scenario 4: Matched Case-Control Studies"
      subtitle="Use for matched case-control studies. Requirements are the same as independent case-control + the correlation coefficient (φ) for exposure between matched cases and controls."
      bookRef="Handbook p.45-47"
    >
      <FormulaBox
        formula={"Step 1: n_independent = Independent case-control formula (Scenario 2)\nStep 2: n_matched = ⌈ n_independent / (1 − φ) ⌉\nDesign effect: matching reduces the effective sample by factor (1−φ).\nIf unable to estimate φ, assume φ = 0.2"}
        reference="Negida Handbook Part IV, p.47 (StatsDirect: matched case-control)"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <InputField label="Expected Odds Ratio" value={or} onChange={setOR} />
        <InputField label="P(exposure) in controls" value={pControls} onChange={setPControls} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <InputField label="Correlation (φ)" value={phi} onChange={setPhi} hint="Default: 0.2" />
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
        <InputField label="Controls per case" value={ratio} onChange={setRatio} min="1" max="4" />
      </div>
      {res && (
        <ResultBox
          label="Estimated Minimum Sample Size (cases required)"
          value={res.n_cases}
          detail={`${res.n_cases} cases + ${res.n_controls} controls = ${res.total} total (P₁=${res.p1.toFixed(4)}, n_independent=${res.n_ind})`}
        />
      )}
    </Card>
  );
}

// ============================================================
// SCENARIO 5: Paired Cohort Studies (p.48)
// ============================================================
function Scenario5() {
  const [pExposed, setPExposed] = useState("0.51");
  const [pControl, setPControl] = useState("0.47");
  const [phi, setPhi] = useState("0.2");
  const [power, setPower] = useState("0.80");
  const [alpha, setAlpha] = useState("0.05");

  const calculate = () => {
    const p1 = parseFloat(pExposed), p0 = parseFloat(pControl), phiv = parseFloat(phi);
    const pw = parseFloat(power), al = parseFloat(alpha);
    if ([p1, p0, phiv, pw, al].some(isNaN) || p1 === p0) return null;
    const z_a = getZ(al, true), z_b = getZBeta(1 - pw);
    // Step 1: Independent two-proportions formula (Scenario 3 with r=1)
    const pBar = (p1 + p0) / 2;
    const num = Math.pow(z_a * Math.sqrt(2 * pBar * (1 - pBar)) + z_b * Math.sqrt(p1 * (1 - p1) + p0 * (1 - p0)), 2);
    const den = Math.pow(p1 - p0, 2);
    const n_ind = Math.ceil(num / den);
    // Step 2: Adjust for matching using design effect: n_paired = ceil(n_ind / (1 - φ))
    const n_pairs = Math.ceil(n_ind / (1 - phiv));
    return { n_pairs, n_ind };
  };

  const res = calculate();
  return (
    <Card
      title="Scenario 5: Paired Cohort Studies"
      subtitle="Use for matched/paired cohort studies. Same requirements as independent cohort + the correlation coefficient (φ) for events between matched subjects."
      bookRef="Handbook p.48-49"
    >
      <FormulaBox
        formula={"Step 1: n_independent = Independent two-proportions formula (Scenario 3, r=1)\nStep 2: n_pairs = ⌈ n_independent / (1 − φ) ⌉\nDesign effect: pairing reduces effective sample by factor (1−φ).\nIf unable to estimate φ, assume 0.2 as minimum meaningful correlation."}
        reference="Negida Handbook Part IV, p.49 (StatsDirect: paired cohort study)"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <InputField label="Event rate in exposed (experimental) group" value={pExposed} onChange={setPExposed} />
        <InputField label="Event rate in control group" value={pControl} onChange={setPControl} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <InputField label="Correlation (φ)" value={phi} onChange={setPhi} hint="Default: 0.2" />
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
      </div>
      {res && <ResultBox label="Required Sample Size" value={`${res.n_pairs} pairs`} detail={`n_independent = ${res.n_ind} per group, adjusted for pairing (φ)`} />}
    </Card>
  );
}

// ============================================================
// SCENARIO 6: Comparing Two Groups' Survival Time (p.50)
// ============================================================
function Scenario6() {
  const [inputMode, setInputMode] = useState("medians");
  const [medExp, setMedExp] = useState("8.8");
  const [medCtrl, setMedCtrl] = useState("6.9");
  const [hr, setHR] = useState("");
  const [accrual, setAccrual] = useState("2");
  const [followup, setFollowup] = useState("12");
  const [power, setPower] = useState("0.90");
  const [alpha, setAlpha] = useState("0.05");
  const [ratio, setRatio] = useState("1");

  const calculate = () => {
    const pw = parseFloat(power), al = parseFloat(alpha), r = parseFloat(ratio);
    const z_a = getZ(al, true), z_b = getZBeta(1 - pw);
    let HR;
    if (inputMode === "medians") {
      const m1 = parseFloat(medExp), m0 = parseFloat(medCtrl);
      if (isNaN(m1) || isNaN(m0) || m1 <= 0 || m0 <= 0) return null;
      HR = m0 / m1;
    } else {
      HR = parseFloat(hr);
      if (isNaN(HR) || HR <= 0) return null;
    }
    const logHR = Math.log(HR);
    if (logHR === 0) return null;
    // Schoenfeld formula: n_event ≥ (1+r)²·(Z_{α/2}+Z_{1-β})² / (r·(log HR)²)
    const n_events = Math.ceil(Math.pow(1 + r, 2) * Math.pow(z_a + z_b, 2) / (r * Math.pow(logHR, 2)));
    // Compute probability of event for each group (exponential survival, uniform accrual)
    const Ta = parseFloat(accrual), Tf = parseFloat(followup);
    let n_per_group_adj = null, p_event_avg = null;
    if (!isNaN(Ta) && !isNaN(Tf) && Ta > 0) {
      const m1v = inputMode === "medians" ? parseFloat(medExp) : null;
      const m0v = inputMode === "medians" ? parseFloat(medCtrl) : null;
      if (m1v && m0v) {
        const lambda1 = Math.log(2) / m1v;
        const lambda2 = Math.log(2) / m0v;
        const pE1 = 1 - (1 / (lambda1 * Ta)) * (Math.exp(-lambda1 * Tf) - Math.exp(-lambda1 * (Ta + Tf)));
        const pE2 = 1 - (1 / (lambda2 * Ta)) * (Math.exp(-lambda2 * Tf) - Math.exp(-lambda2 * (Ta + Tf)));
        p_event_avg = (pE1 + r * pE2) / (1 + r);
        if (p_event_avg > 0) {
          n_per_group_adj = Math.ceil(n_events / ((1 + r) * p_event_avg));
        }
      }
    }
    return { n_events, n_per_group: n_per_group_adj || Math.ceil(n_events / (1 + r)), total: n_per_group_adj ? n_per_group_adj * (1 + r) : Math.ceil(n_events / (1 + r)) * (1 + r), HR: (inputMode === "medians" ? parseFloat(medExp) / parseFloat(medCtrl) : HR).toFixed(4), p_event_avg };
  };

  const res = calculate();
  return (
    <Card
      title="Scenario 6: Comparing Two Groups' Survival Time"
      subtitle="Use for any study where the outcome is two survival times compared in the form of Hazard Ratio (HR). Suitable for cohort studies and clinical trials with time-to-event outcomes."
      bookRef="Handbook p.50-52"
    >
      <FormulaBox
        formula={"n_event ≥ 2·(Z_{α/2} + Z_{1−β})² / (log_e HR)²"}
        reference="Negida Handbook Part IV, p.52 (SampSize App formula)"
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <TabButton active={inputMode === "medians"} onClick={() => setInputMode("medians")}>Two Median Survival Times</TabButton>
        <TabButton active={inputMode === "hr"} onClick={() => setInputMode("hr")}>Hazard Ratio</TabButton>
      </div>
      {inputMode === "medians" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InputField label="Median survival – experimental" value={medExp} onChange={setMedExp} unit="months" />
          <InputField label="Median survival – control" value={medCtrl} onChange={setMedCtrl} unit="months" />
        </div>
      ) : (
        <InputField label="Expected Hazard Ratio (HR)" value={hr} onChange={setHR} />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12 }}>
        <InputField label="Accrual time" value={accrual} onChange={setAccrual} unit="months" />
        <InputField label="Follow-up after accrual" value={followup} onChange={setFollowup} unit="months" />
        <InputField label="Allocation ratio" value={ratio} onChange={setRatio} hint="Controls per exp." min="0.25" max="4" step="0.25" />
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
      </div>
      {res && (
        <ResultBox
          label="Required Number of Events"
          value={res.n_events}
          detail={`HR = ${res.HR} | ~${res.n_per_group} per group (${res.total} total)${res.p_event_avg ? ` | P(event) ≈ ${(res.p_event_avg * 100).toFixed(1)}%` : ""}`}
        />
      )}
    </Card>
  );
}

// ============================================================
// SCENARIO 7: Study to Estimate Correlation (p.53)
// ============================================================
function Scenario7() {
  const [r, setR] = useState("0.46");
  const [r0, setR0] = useState("0");
  const [power, setPower] = useState("0.90");
  const [alpha, setAlpha] = useState("0.05");

  const calculate = () => {
    const rv = parseFloat(r), r0v = parseFloat(r0);
    const pw = parseFloat(power), al = parseFloat(alpha);
    if ([rv, pw, al].some(isNaN) || Math.abs(rv) >= 1) return null;
    const z_a = getZ(al, true), z_b = getZBeta(1 - pw);
    const fisherZ1 = 0.5 * Math.log((1 + rv) / (1 - rv));
    const fisherZ0 = 0.5 * Math.log((1 + r0v) / (1 - r0v));
    const diff = fisherZ1 - fisherZ0;
    if (diff === 0) return null;
    const n = Math.ceil(Math.pow((z_a + z_b) / diff, 2) + 3);
    return { n };
  };

  const res = calculate();
  return (
    <Card
      title="Scenario 7: A Study to Estimate Correlation"
      subtitle="Use for any study where the primary outcome is the correlation between two variables expressed as a correlation coefficient (r)."
      bookRef="Handbook p.53-54"
    >
      <FormulaBox
        formula={"n ≥ ((Z_{α/2} + Z_{1−β}) / (½·ln((1+r)/(1−r))))² + 3"}
        reference="Negida Handbook Part IV, p.54 (SampSize App formula)"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <InputField label="Expected correlation (r) – alternative hypothesis" value={r} onChange={setR} hint="e.g. 0.46" min="-0.99" max="0.99" />
        <InputField label="Correlation under null hypothesis (r₀)" value={r0} onChange={setR0} hint="Usually 0" min="-0.99" max="0.99" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
      </div>
      {res && <ResultBox label="Required Sample Size" value={res.n} />}
    </Card>
  );
}

// ============================================================
// SCENARIO 8: Superiority Trials (p.55)
// ============================================================
function Scenario8() {
  const [outcomeType, setOutcomeType] = useState("continuous_means");
  const [mean1, setMean1] = useState("20.3");
  const [mean2, setMean2] = useState("11.4");
  const [sd1, setSD1] = useState("13.5");
  const [sd2, setSD2] = useState("15.5");
  const [effectSize, setEffectSize] = useState("0.5");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [power, setPower] = useState("0.90");
  const [alpha, setAlpha] = useState("0.05");
  const [ratio, setRatio] = useState("1");
  const [design, setDesign] = useState("parallel");

  const calculate = () => {
    const pw = parseFloat(power), al = parseFloat(alpha), r = parseFloat(ratio);
    const z_a = getZ(al, true), z_b = getZBeta(1 - pw);

    if (outcomeType === "continuous_means") {
      const m1 = parseFloat(mean1), m2 = parseFloat(mean2), s1 = parseFloat(sd1), s2 = parseFloat(sd2);
      if ([m1, m2, s1, s2].some(isNaN) || m1 === m2) return null;
      // n ≥ (Z_{α/2}+Z_β)² · (σ₁²+σ₂²/r) / (μ₁−μ₂)² + Z²_{α/2}/(2(1+r))
      const num = Math.pow(z_a + z_b, 2) * (s1 * s1 + s2 * s2 / r);
      const den = Math.pow(m1 - m2, 2);
      const correction = (z_a * z_a) / (2 * (1 + r));
      let n1 = Math.ceil(num / den + correction);
      if (design === "crossover") n1 = Math.ceil(n1 / 2);
      const n2v = Math.ceil(n1 * r);
      return { n1, n2: n2v, total: n1 + n2v };
    } else if (outcomeType === "continuous_effect") {
      const d = parseFloat(effectSize);
      if (isNaN(d) || d === 0) return null;
      const n1 = Math.ceil(((1 + r) / r) * Math.pow((z_a + z_b) / d, 2) + (z_a * z_a) / (2 * (1 + r)));
      const n2v = Math.ceil(n1 * r);
      let n1f = n1, n2f = n2v;
      if (design === "crossover") { n1f = Math.ceil(n1 / 2); n2f = Math.ceil(n2v / 2); }
      return { n1: n1f, n2: n2f, total: n1f + n2f };
    } else {
      const pv1 = parseFloat(p1), pv2 = parseFloat(p2);
      if ([pv1, pv2].some(isNaN) || pv1 === pv2) return null;
      const pBar = (pv1 + r * pv2) / (1 + r);
      const num = Math.pow(
        z_a * Math.sqrt((1 + 1/r) * pBar * (1 - pBar)) +
        z_b * Math.sqrt(pv1 * (1 - pv1) + pv2 * (1 - pv2) / r),
        2
      );
      const den = Math.pow(pv1 - pv2, 2);
      let n1 = Math.ceil(num / den);
      if (design === "crossover") n1 = Math.ceil(n1 / 2);
      const n2v = Math.ceil(n1 * r);
      return { n1, n2: n2v, total: n1 + n2v };
    }
  };

  const res = calculate();
  return (
    <Card
      title="Scenario 8: Superiority Trials, Comparison of Two Means, or Two Proportions"
      subtitle="Use for superiority clinical trials with either continuous measures (comparing means) or binary outcomes (comparing proportions). Supports parallel and crossover designs."
      bookRef="Handbook p.55-58"
    >
      <FormulaBox
        formula={"Continuous: n ≥ (Z_{α/2}+Z_β)²·(σ₁²+σ₂²/r) / (μ₁−μ₂)²\nBy effect size: n ≥ ((1+r)/r)·((Z_{α/2}+Z_β)/d)² + Z²_{α/2}/(2(1+r))\nBinary: same as Scenario 3 formula"}
        reference="Negida Handbook Part IV, p.57-58"
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <TabButton active={outcomeType === "continuous_means"} onClick={() => setOutcomeType("continuous_means")}>Continuous (Means & SD)</TabButton>
        <TabButton active={outcomeType === "continuous_effect"} onClick={() => setOutcomeType("continuous_effect")}>Continuous (Effect Size d)</TabButton>
        <TabButton active={outcomeType === "binary"} onClick={() => setOutcomeType("binary")}>Binary (Proportions)</TabButton>
      </div>
      {outcomeType === "continuous_means" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InputField label="Mean in group 1 (μ₁)" value={mean1} onChange={setMean1} />
          <InputField label="Mean in group 2 (μ₂)" value={mean2} onChange={setMean2} />
          <InputField label="SD in group 1 (σ₁)" value={sd1} onChange={setSD1} />
          <InputField label="SD in group 2 (σ₂)" value={sd2} onChange={setSD2} />
        </div>
      )}
      {outcomeType === "continuous_effect" && (
        <InputField label="Cohen's d effect size" value={effectSize} onChange={setEffectSize} hint="Small=0.2, Medium=0.5, Large=0.8" />
      )}
      {outcomeType === "binary" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InputField label="Proportion in group 1 (p₁)" value={p1} onChange={setP1} />
          <InputField label="Proportion in group 2 (p₂)" value={p2} onChange={setP2} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <SelectField label="Design" value={design} onChange={setDesign} options={[
          { value: "parallel", label: "Parallel" }, { value: "crossover", label: "Crossover" },
        ]} />
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
        <InputField label="Allocation ratio (r)" value={ratio} onChange={setRatio} hint="Controls per exp." />
      </div>
      {res && (
        <ResultBox
          label="Required Sample Size"
          value={res.total}
          detail={`Group 1: ${res.n1} | Group 2: ${res.n2}${design === "crossover" ? " (crossover halved)" : ""}`}
        />
      )}
    </Card>
  );
}

// ============================================================
// SCENARIO 9: Non-Inferiority Trials (p.59)
// ============================================================
function Scenario9() {
  const [outcomeType, setOutcomeType] = useState("binary");
  const [p1, setP1] = useState("0.17");
  const [p2, setP2] = useState("0.14");
  const [meanDiff, setMeanDiff] = useState("");
  const [sd, setSD] = useState("");
  const [margin, setMargin] = useState("0.20");
  const [power, setPower] = useState("0.90");
  const [alpha, setAlpha] = useState("0.05");
  const [ratio, setRatio] = useState("1");
  const [design, setDesign] = useState("parallel");

  const calculate = () => {
    const pw = parseFloat(power), al = parseFloat(alpha), r = parseFloat(ratio);
    const m = parseFloat(margin);
    const z_a = getZ(al, false); // One-sided alpha for NI trials
    const z_b = getZBeta(1 - pw);

    if (outcomeType === "binary") {
      const pv1 = parseFloat(p1), pv2 = parseFloat(p2);
      if ([pv1, pv2, m].some(isNaN)) return null;
      const delta = Math.abs(pv1 - pv2);
      const num = Math.pow(z_a + z_b, 2) * (pv1 * (1 - pv1) + pv2 * (1 - pv2) / r);
      const den = Math.pow(m - delta, 2);
      if (den <= 0) return null;
      let n1 = Math.ceil(num / den);
      if (design === "crossover") n1 = Math.ceil(n1 / 2);
      const n2 = Math.ceil(n1 * r);
      return { n1, n2, total: n1 + n2 };
    } else {
      const md = parseFloat(meanDiff) || 0;
      const sdv = parseFloat(sd);
      if (isNaN(sdv) || isNaN(m) || m === 0) return null;
      const num = Math.pow(z_a + z_b, 2) * sdv * sdv * (1 + 1 / r);
      const den = Math.pow(m - Math.abs(md), 2);
      if (den <= 0) return null;
      let n1 = Math.ceil(num / den);
      if (design === "crossover") n1 = Math.ceil(n1 / 2);
      const n2 = Math.ceil(n1 * r);
      return { n1, n2, total: n1 + n2 };
    }
  };

  const res = calculate();
  return (
    <Card
      title="Scenario 9: Non-Inferiority Trials"
      subtitle="Use for non-inferiority clinical trials. The alternative hypothesis is that the new treatment is not inferior to the standard by more than the non-inferiority margin."
      bookRef="Handbook p.59-60"
    >
      <FormulaBox
        formula={"Binary: n ≥ (Z_α + Z_β)²·(p₁(1−p₁)+p₂(1−p₂)/r) / (margin−|δ|)²\nContinuous: n ≥ (Z_α + Z_β)²·σ²·(1+1/r) / (margin−|δ|)²\nwhere δ = p₁−p₂ (or mean difference). Uses ONE-SIDED alpha."}
        reference="Negida Handbook Part IV, p.60"
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <TabButton active={outcomeType === "binary"} onClick={() => setOutcomeType("binary")}>Binary</TabButton>
        <TabButton active={outcomeType === "continuous"} onClick={() => setOutcomeType("continuous")}>Continuous</TabButton>
      </div>
      {outcomeType === "binary" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <InputField label="Rate in treatment A (p₁)" value={p1} onChange={setP1} />
          <InputField label="Rate in treatment B (p₂)" value={p2} onChange={setP2} />
          <InputField label="NI margin" value={margin} onChange={setMargin} hint="e.g. 0.20 for 20%" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <InputField label="Expected mean difference" value={meanDiff} onChange={setMeanDiff} hint="Can be 0" />
          <InputField label="Population SD (σ)" value={sd} onChange={setSD} />
          <InputField label="NI margin" value={margin} onChange={setMargin} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <SelectField label="Design" value={design} onChange={setDesign} options={[
          { value: "parallel", label: "Parallel" }, { value: "crossover", label: "Crossover" },
        ]} />
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha (one-sided)" value={alpha} onChange={setAlpha} options={[
          { value: "0.025", label: "2.5% (one-sided)" }, { value: "0.05", label: "5% (one-sided)" },
        ]} />
        <InputField label="Allocation ratio" value={ratio} onChange={setRatio} />
      </div>
      {res && (
        <ResultBox
          label="Required Sample Size"
          value={res.total}
          detail={`Group 1: ${res.n1} | Group 2: ${res.n2}`}
        />
      )}
    </Card>
  );
}

// ============================================================
// SCENARIO 10: Equivalence Trials (p.61)
// ============================================================
function Scenario10() {
  const [outcomeType, setOutcomeType] = useState("continuous");
  const [meanDiff, setMeanDiff] = useState("0");
  const [sd, setSD] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [margin, setMargin] = useState("");
  const [power, setPower] = useState("0.90");
  const [alpha, setAlpha] = useState("0.05");
  const [ratio, setRatio] = useState("1");
  const [design, setDesign] = useState("parallel");

  const calculate = () => {
    const pw = parseFloat(power), al = parseFloat(alpha), r = parseFloat(ratio);
    const m = parseFloat(margin);
    const z_a = getZ(al, true);
    const z_b = getZBeta(1 - pw);

    if (outcomeType === "continuous") {
      const md = parseFloat(meanDiff) || 0;
      const sdv = parseFloat(sd);
      if (isNaN(sdv) || isNaN(m) || m === 0) return null;
      const num = Math.pow(z_a + z_b, 2) * sdv * sdv * (1 + 1 / r);
      const den = Math.pow(m - Math.abs(md), 2);
      let n1 = Math.ceil(num / den);
      if (design === "crossover") n1 = Math.ceil(n1 / 2);
      const n2 = Math.ceil(n1 * r);
      return { n1, n2, total: n1 + n2 };
    } else {
      const pv1 = parseFloat(p1), pv2 = parseFloat(p2);
      if ([pv1, pv2, m].some(isNaN)) return null;
      const num = Math.pow(z_a + z_b, 2) * (pv1 * (1 - pv1) + pv2 * (1 - pv2) / r);
      let n1 = Math.ceil(num / Math.pow(m - Math.abs(pv1 - pv2), 2));
      if (design === "crossover") n1 = Math.ceil(n1 / 2);
      const n2 = Math.ceil(n1 * r);
      return { n1, n2, total: n1 + n2 };
    }
  };

  const res = calculate();
  return (
    <Card
      title="Scenario 10: Equivalence Trials"
      subtitle="Use for equivalence clinical trials. The hypothesis is that the difference between two treatments falls within the equivalence margin (−Δ, +Δ)."
      bookRef="Handbook p.61"
    >
      <FormulaBox
        formula={"Continuous: n ≥ (Z_{α/2}+Z_β)²·σ²·(1+1/r) / (Δ−|δ|)²\nBinary: n ≥ (Z_{α/2}+Z_β)²·(p₁(1−p₁)+p₂(1−p₂)/r) / (Δ−|p₁−p₂|)²"}
        reference="Negida Handbook Part IV, p.61"
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <TabButton active={outcomeType === "continuous"} onClick={() => setOutcomeType("continuous")}>Continuous</TabButton>
        <TabButton active={outcomeType === "binary"} onClick={() => setOutcomeType("binary")}>Binary</TabButton>
      </div>
      {outcomeType === "continuous" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <InputField label="Expected mean diff (δ)" value={meanDiff} onChange={setMeanDiff} hint="Often 0" />
          <InputField label="Population SD (σ)" value={sd} onChange={setSD} />
          <InputField label="Equivalence margin (Δ)" value={margin} onChange={setMargin} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <InputField label="Proportion group 1" value={p1} onChange={setP1} />
          <InputField label="Proportion group 2" value={p2} onChange={setP2} />
          <InputField label="Equivalence margin (Δ)" value={margin} onChange={setMargin} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <SelectField label="Design" value={design} onChange={setDesign} options={[
          { value: "parallel", label: "Parallel" }, { value: "crossover", label: "Crossover" },
        ]} />
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
        <InputField label="Allocation ratio" value={ratio} onChange={setRatio} />
      </div>
      {res && (
        <ResultBox
          label="Required Sample Size"
          value={res.total}
          detail={`Group 1: ${res.n1} | Group 2: ${res.n2}`}
        />
      )}
    </Card>
  );
}

// ============================================================
// SPECIAL SITUATIONS
// ============================================================

function SS1() {
  const [sd, setSD] = useState("");
  const [d, setD] = useState("");
  const [alpha, setAlpha] = useState("0.05");

  const calculate = () => {
    const sdv = parseFloat(sd), dv = parseFloat(d), al = parseFloat(alpha);
    if ([sdv, dv].some(isNaN) || dv === 0) return null;
    const z = getZ(al, true);
    const n = Math.ceil(Math.pow((z * sdv) / dv, 2));
    return { n };
  };

  const res = calculate();
  return (
    <Card title="SS1: Sample Size for a Single Mean" subtitle="For studies estimating the mean value of an outcome measure (cross-sectional, descriptive cohort, single-arm trial)." bookRef="Handbook p.66">
      <FormulaBox formula={"n ≥ (Z_{α/2}·σ / d)²"} reference="Negida Handbook Part IV, p.66" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <InputField label="Expected SD (σ)" value={sd} onChange={setSD} />
        <InputField label="Margin of error (d)" value={d} onChange={setD} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
      </div>
      {res && <ResultBox label="Required Sample Size" value={res.n} />}
    </Card>
  );
}

function SS2() {
  const [meanDiff, setMeanDiff] = useState("");
  const [sdDiff, setSDDiff] = useState("");
  const [power, setPower] = useState("0.80");
  const [alpha, setAlpha] = useState("0.05");

  const calculate = () => {
    const md = parseFloat(meanDiff), sd = parseFloat(sdDiff);
    const pw = parseFloat(power), al = parseFloat(alpha);
    if ([md, sd].some(isNaN) || md === 0) return null;
    const z_a = getZ(al, true), z_b = getZBeta(1 - pw);
    const d = md / sd;
    const n = Math.ceil(2 * Math.pow((z_a + z_b), 2) / Math.pow(d, 2) + (z_a * z_a) / 2);
    return { n };
  };

  const res = calculate();
  return (
    <Card title="SS2: Single Arm Pre/Post – Continuous Outcome" subtitle="For single-arm studies comparing before vs. after with a continuous measure (e.g., BMI change, HBA1C change)." bookRef="Handbook p.67">
      <FormulaBox formula={"n ≥ 2·(Z_{α/2}+Z_β)² / (δ_diff/σ_diff)² + Z²_{α/2}/2"} reference="Negida Handbook Part IV, p.67" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <InputField label="Mean of difference (δDiff)" value={meanDiff} onChange={setMeanDiff} />
        <InputField label="SD of difference (σDiff)" value={sdDiff} onChange={setSDDiff} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
      </div>
      {res && <ResultBox label="Required Sample Size" value={res.n} />}
    </Card>
  );
}

function SS3() {
  const [pBefore, setPBefore] = useState("");
  const [pAfter, setPAfter] = useState("");
  const [power, setPower] = useState("0.80");
  const [alpha, setAlpha] = useState("0.05");

  const calculate = () => {
    const pa = parseFloat(pBefore), pb = parseFloat(pAfter);
    const pw = parseFloat(power), al = parseFloat(alpha);
    if ([pa, pb].some(isNaN) || pa === pb) return null;
    const z_a = getZ(al, true), z_b = getZBeta(1 - pw);
    const phi = (pa * (1 - pb)) / (pb * (1 - pa));
    const piDisc = pa * (1 - pb) + pb * (1 - pa);
    const num = Math.pow(z_a * (phi + 1) + z_b * Math.sqrt(Math.pow(phi + 1, 2) - Math.pow(phi - 1, 2) * piDisc), 2);
    const den = Math.pow(phi - 1, 2) * piDisc;
    if (den === 0) return null;
    const n = Math.ceil(num / den);
    return { n };
  };

  const res = calculate();
  return (
    <Card title="SS3: Single Arm Pre/Post – Categorical Outcome" subtitle="For single-arm pre/post studies with a categorical/binary outcome (e.g., awareness before vs. after education program)." bookRef="Handbook p.68">
      <FormulaBox formula={"φ = πA(1−πB)/(πB(1−πA))\nπ_disc = πA(1−πB)+πB(1−πA)\nn_pair ≥ [Z_{α/2}(φ+1)+Z_β√((φ+1)²−(φ−1)²·π_disc)]²/((φ−1)²·π_disc)"} reference="Negida Handbook Part IV, p.68" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <InputField label="Proportion before (πA)" value={pBefore} onChange={setPBefore} />
        <InputField label="Proportion after (πB)" value={pAfter} onChange={setPAfter} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
      </div>
      {res && <ResultBox label="Required Number of Pairs" value={res.n} />}
    </Card>
  );
}

function SS4() {
  return (
    <Card title="SS4: Mean Difference Comparing 3 Groups" subtitle="Two approaches: (1) Multiple pairwise comparisons – take the largest n. (2) Use ANOVA-based calculation from SS5." bookRef="Handbook p.69-70">
      <div style={{ background: colors.infoBg, padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
        <p style={{ margin: "0 0 12px", fontWeight: 600, color: colors.info }}>Method 1: Pairwise Comparisons</p>
        <p style={{ margin: 0 }}>
          For 3 groups (A, B, C), calculate the sample size needed for each pairwise comparison (A vs B, A vs C, B vs C) using the Scenario 8 calculator. Take the largest calculated sample size for each arm.
        </p>
        <p style={{ margin: "12px 0 0", fontWeight: 600, color: colors.info }}>Method 2: ANOVA-based (SS5)</p>
        <p style={{ margin: "4px 0 0" }}>
          Use the "SS5: Mean Difference Comparing &gt;2 Groups" calculator with number of groups = 3.
        </p>
      </div>
    </Card>
  );
}

function SS5() {
  const [effectSize, setEffectSize] = useState("0.4");
  const [groups, setGroups] = useState("3");
  const [power, setPower] = useState("0.80");
  const [alpha, setAlpha] = useState("0.05");

  const calculate = () => {
    const d = parseFloat(effectSize), g = parseInt(groups);
    const pw = parseFloat(power), al = parseFloat(alpha);
    if ([d, g].some(isNaN) || d === 0 || g < 2) return null;
    const z_a = getZ(al, true), z_b = getZBeta(1 - pw);
    const sqrtGm1 = Math.sqrt(g - 1);
    const term1 = (1 + sqrtGm1) * Math.pow(z_a + z_b, 2) / (d * d);
    const term2 = (z_a * z_a * sqrtGm1) / (2 * (1 + sqrtGm1));
    const n_per_group = Math.ceil(term1 + term2);
    const total = n_per_group * g;
    return { n_per_group, total, g };
  };

  const res = calculate();
  return (
    <Card title="SS5: Mean Difference Comparing >2 Groups" subtitle="For studies comparing continuous outcomes across more than 2 groups using ANOVA-based effect size." bookRef="Handbook p.71">
      <FormulaBox formula={"n ≥ (1+√(g−1))·(Z_{α/2}+Z_β)²/d² + Z²_{α/2}·√(g−1)/(2(1+√(g−1)))"} reference="Negida Handbook Part IV, p.71 (SampSize App)" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <InputField label="Effect size (d)" value={effectSize} onChange={setEffectSize} hint="Small=0.2, Moderate=0.4, Large=0.6+" />
        <InputField label="Number of groups (g)" value={groups} onChange={setGroups} min="2" max="10" />
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
      </div>
      {res && (
        <ResultBox
          label="Required Sample Size"
          value={res.total}
          detail={`${res.n_per_group} per group × ${res.g} groups`}
        />
      )}
    </Card>
  );
}

function SS6() {
  const [metric, setMetric] = useState("sensitivity");
  const [value, setValue] = useState("0.90");
  const [prevalence, setPrevalence] = useState("0.10");
  const [d, setD] = useState("0.05");
  const [alpha, setAlpha] = useState("0.05");

  const calculate = () => {
    const v = parseFloat(value), prev = parseFloat(prevalence), dv = parseFloat(d), al = parseFloat(alpha);
    if ([v, prev, dv].some(isNaN) || dv === 0 || prev === 0) return null;
    const z = getZ(al, true);
    if (metric === "sensitivity") {
      const n = Math.ceil((z * z * v * (1 - v)) / (dv * dv * prev));
      return { n };
    } else {
      const n = Math.ceil((z * z * v * (1 - v)) / (dv * dv * (1 - prev)));
      return { n };
    }
  };

  const res = calculate();
  return (
    <Card title="SS6: Diagnostic Test Accuracy – Sensitivity & Specificity" subtitle="For diagnostic accuracy studies based on expected sensitivity or specificity, prevalence, and desired margin of error." bookRef="Handbook p.72">
      <FormulaBox
        formula={"Sensitivity: n ≥ Z²_{α/2}·Sens·(1−Sens) / (d²·Prev)\nSpecificity: n ≥ Z²_{α/2}·Spec·(1−Spec) / (d²·(1−Prev))"}
        reference="Negida Handbook Part IV, p.72; Negida et al. Adv J Emerg Med 2019"
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <TabButton active={metric === "sensitivity"} onClick={() => setMetric("sensitivity")}>Sensitivity</TabButton>
        <TabButton active={metric === "specificity"} onClick={() => setMetric("specificity")}>Specificity</TabButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <InputField label={metric === "sensitivity" ? "Expected Sensitivity" : "Expected Specificity"} value={value} onChange={setValue} />
        <InputField label="Disease Prevalence" value={prevalence} onChange={setPrevalence} />
        <InputField label="Margin of error (d)" value={d} onChange={setD} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
      </div>
      {res && <ResultBox label="Required Total Sample Size" value={res.n} />}
    </Card>
  );
}

function SS7() {
  const [auc, setAUC] = useState("0.80");
  const [nullAUC, setNullAUC] = useState("0.50");
  const [ratio, setRatio] = useState("1");
  const [power, setPower] = useState("0.80");
  const [alpha, setAlpha] = useState("0.05");

  const calculate = () => {
    const a = parseFloat(auc), a0 = parseFloat(nullAUC), r = parseFloat(ratio);
    const pw = parseFloat(power), al = parseFloat(alpha);
    if ([a, a0, r, pw, al].some(isNaN) || a === a0) return null;
    const z_a = getZ(al, true), z_b = getZBeta(1 - pw);
    const Q1 = a / (2 - a);
    const Q2 = (2 * a * a) / (1 + a);
    const varA = a * (1 - a) + (Q1 - a * a) + (Q2 - a * a) / r;
    const Q1_0 = a0 / (2 - a0);
    const Q2_0 = (2 * a0 * a0) / (1 + a0);
    const varNull = a0 * (1 - a0) + (Q1_0 - a0 * a0) + (Q2_0 - a0 * a0) / r;
    const n_pos = Math.ceil(Math.pow(z_a * Math.sqrt(varNull) + z_b * Math.sqrt(varA), 2) / Math.pow(a - a0, 2));
    const n_neg = Math.ceil(n_pos * r);
    return { n_pos, n_neg, total: n_pos + n_neg };
  };

  const res = calculate();
  return (
    <Card title="SS7: Area Under the Curve (AUC)" subtitle="For diagnostic accuracy studies testing a new biomarker where the goal is to establish a cut-off value." bookRef="Handbook p.73">
      <FormulaBox
        formula={"Based on Obuchowski/Hanley-McNeil method.\nNull hypothesis: AUC = 0.5 (biomarker is NOT discriminative)"}
        reference="Negida Handbook Part IV, p.73; Negida et al. Adv J Emerg Med 2019"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <InputField label="Expected AUC" value={auc} onChange={setAUC} hint="e.g. 0.80 or 0.90" />
        <InputField label="Null hypothesis AUC" value={nullAUC} onChange={setNullAUC} hint="Usually 0.50" />
        <InputField label="Ratio neg/pos groups" value={ratio} onChange={setRatio} hint="1 = equal groups" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <SelectField label="Power" value={power} onChange={setPower} options={[
          { value: "0.80", label: "80%" }, { value: "0.85", label: "85%" }, { value: "0.90", label: "90%" },
        ]} />
        <SelectField label="Alpha" value={alpha} onChange={setAlpha} options={[
          { value: "0.05", label: "5%" }, { value: "0.01", label: "1%" },
        ]} />
      </div>
      {res && (
        <ResultBox
          label="Required Sample Size"
          value={res.total}
          detail={`${res.n_pos} positive cases + ${res.n_neg} negative cases`}
        />
      )}
    </Card>
  );
}

// ============================================================
// GUIDE TABLE (p.23)
// ============================================================
function GuideTable() {
  const guideData = [
    { outcome: "One proportion", groups: "1 group", effect: "Proportion", scenario: "Scenario 1" },
    { outcome: "Two proportions", groups: "2 groups (unmatched)", effect: "OR", scenario: "Scenario 2 (Case-Control)" },
    { outcome: "Two proportions", groups: "2 groups (unmatched)", effect: "RR", scenario: "Scenario 3 (Cohort/Trial)" },
    { outcome: "Two proportions", groups: "2 groups (matched)", effect: "OR", scenario: "Scenario 4 (Matched CC)" },
    { outcome: "Two proportions", groups: "2 groups (paired)", effect: "RR/Rates", scenario: "Scenario 5 (Paired Cohort)" },
    { outcome: "Survival time", groups: "2 groups", effect: "HR", scenario: "Scenario 6" },
    { outcome: "Correlation", groups: "1+ groups", effect: "r", scenario: "Scenario 7" },
    { outcome: "Two means or proportions", groups: "2 groups (superiority)", effect: "Mean diff / Proportion diff", scenario: "Scenario 8" },
    { outcome: "Any", groups: "2 groups (non-inferiority)", effect: "ES + NI margin", scenario: "Scenario 9" },
    { outcome: "Any", groups: "2 groups (equivalence)", effect: "ES + Eq margin", scenario: "Scenario 10" },
  ];

  return (
    <Card title="Guide Table: How to Choose Your Scenario" subtitle="Based on the book's Step 4 – mapping your study characteristics to the correct scenario." bookRef="Handbook p.23">
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.primary, color: "#fff" }}>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Outcome Type</th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Groups</th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Effect Estimate</th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>→ Scenario</th>
            </tr>
          </thead>
          <tbody>
            {guideData.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc", borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: "8px 12px" }}>{row.outcome}</td>
                <td style={{ padding: "8px 12px" }}>{row.groups}</td>
                <td style={{ padding: "8px 12px" }}>{row.effect}</td>
                <td style={{ padding: "8px 12px", fontWeight: 600, color: colors.primaryLight }}>{row.scenario}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============================================================
// 7 STEPS Overview (Section C, p.14)
// ============================================================
function StepsOverview() {
  const steps = [
    { num: 1, title: "Understand your study design", desc: "Cross-sectional, case-control, cohort, or clinical trial?" },
    { num: 2, title: "How will the primary objective be assessed?", desc: "What is the type of outcome measure? (proportion, mean, survival, correlation)" },
    { num: 3, title: "Determine the type of effect size", desc: "OR, RR, HR, mean difference, correlation coefficient, or proportion?" },
    { num: 4, title: "Pick the right scenario", desc: "Use the Guide Table to map your outcome type, number of groups, and effect estimate to one of the 10 scenarios." },
    { num: 5, title: "Find the missing values", desc: "Estimate effect size from literature, determine power (≥80%), alpha (usually 0.05), and other required parameters." },
    { num: 6, title: "Run the calculation", desc: "Use this web app, SampSize, StatsDirect, EpiInfo, or other software." },
    { num: 7, title: "Report properly", desc: "Document the scenario, software, all input parameters, and the calculated sample size." },
  ];

  return (
    <Card title="The 7 Steps of Sample Size Calculation" bookRef="Handbook p.14-30">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s) => (
          <div key={s.num} style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            padding: 12, borderRadius: 8, background: s.num === 4 ? colors.warningBg : colors.bg,
            border: s.num === 4 ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`,
          }}>
            <div style={{
              minWidth: 32, height: 32, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14,
              background: colors.primary, color: "#fff",
            }}>
              {s.num}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>{s.title}</div>
              <div style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================
// MAIN APP
// ============================================================
const scenarios = [
  { id: "guide", label: "Guide Table", component: GuideTable },
  { id: "steps", label: "7 Steps", component: StepsOverview },
  { id: "s1", label: "S1: Single Proportion", component: Scenario1 },
  { id: "s2", label: "S2: Case-Control", component: Scenario2 },
  { id: "s3", label: "S3: Two Proportions (Cohort)", component: Scenario3 },
  { id: "s4", label: "S4: Matched Case-Control", component: Scenario4 },
  { id: "s5", label: "S5: Paired Cohort", component: Scenario5 },
  { id: "s6", label: "S6: Survival Time", component: Scenario6 },
  { id: "s7", label: "S7: Correlation", component: Scenario7 },
  { id: "s8", label: "S8: Superiority Trials", component: Scenario8 },
  { id: "s9", label: "S9: Non-Inferiority", component: Scenario9 },
  { id: "s10", label: "S10: Equivalence", component: Scenario10 },
  { id: "ss1", label: "SS1: Single Mean", component: SS1 },
  { id: "ss2", label: "SS2: Pre/Post Continuous", component: SS2 },
  { id: "ss3", label: "SS3: Pre/Post Categorical", component: SS3 },
  { id: "ss4", label: "SS4: 3-Group Comparison", component: SS4 },
  { id: "ss5", label: "SS5: >2 Groups (ANOVA)", component: SS5 },
  { id: "ss6", label: "SS6: Dx Accuracy (Sens/Spec)", component: SS6 },
  { id: "ss7", label: "SS7: AUC", component: SS7 },
];

export default function App() {
  const [active, setActive] = useState("guide");
  const ActiveComponent = scenarios.find((s) => s.id === active)?.component || GuideTable;

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
        color: "#fff", padding: "20px 24px",
      }}>
        <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, letterSpacing: "0.5px", opacity: 0.85 }}>EVIDENCIA Labs</p>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Sample Size Calculator</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>
          Sample Size · Course 3
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, opacity: 0.7 }}>Companion to the Negida Handbook of Clinical Research · Ahmed Negida, MD, PhD</p>
      </div>

      <div style={{ display: "flex", maxWidth: 1200, margin: "0 auto" }}>
        <nav style={{
          width: 240, minWidth: 240, padding: "12px 8px", borderRight: `1px solid ${colors.border}`,
          background: "#fff", height: "calc(100vh - 80px)", overflowY: "auto", position: "sticky", top: 0,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: colors.textLight, textTransform: "uppercase", letterSpacing: 1, padding: "8px 8px 4px", marginTop: 4 }}>
            Getting Started
          </div>
          {scenarios.slice(0, 2).map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 6,
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: active === s.id ? 700 : 400,
              background: active === s.id ? colors.infoBg : "transparent",
              color: active === s.id ? colors.info : colors.text, marginBottom: 2,
            }}>{s.label}</button>
          ))}

          <div style={{ fontSize: 10, fontWeight: 700, color: colors.textLight, textTransform: "uppercase", letterSpacing: 1, padding: "12px 8px 4px" }}>
            10 Scenarios
          </div>
          {scenarios.slice(2, 12).map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 6,
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: active === s.id ? 700 : 400,
              background: active === s.id ? colors.infoBg : "transparent",
              color: active === s.id ? colors.info : colors.text, marginBottom: 2,
            }}>{s.label}</button>
          ))}

          <div style={{ fontSize: 10, fontWeight: 700, color: colors.textLight, textTransform: "uppercase", letterSpacing: 1, padding: "12px 8px 4px" }}>
            7 Special Situations
          </div>
          {scenarios.slice(12).map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 6,
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: active === s.id ? 700 : 400,
              background: active === s.id ? colors.infoBg : "transparent",
              color: active === s.id ? colors.info : colors.text, marginBottom: 2,
            }}>{s.label}</button>
          ))}
        </nav>

        <main style={{ flex: 1, padding: 24, maxWidth: 800 }}>
          <ActiveComponent />
          <div style={{
            marginTop: 24, padding: 16, background: colors.warningBg, borderRadius: 8,
            border: `1px solid ${colors.accent}`, fontSize: 12, color: colors.text, lineHeight: 1.5,
          }}>
            <strong>Disclaimer:</strong> This calculator is designed as a companion educational tool for Course 3 (Sample Size).
            For final sample size calculations in research protocols, always verify results with established software
            (StatsDirect, G*Power, SampSize App, EpiInfo, MedCalc, R) and consult with a biostatistician.
            All formulas are from the <em>Negida Handbook of Clinical Research – Part IV</em>.
          </div>
        </main>
      </div>
    </div>
  );
}
