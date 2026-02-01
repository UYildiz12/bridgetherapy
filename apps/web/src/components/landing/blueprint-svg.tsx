import React from 'react';

export function BlueprintSvg() {
    return (
        <svg className="blueprint-svg" aria-hidden="true" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
            <defs>
                <pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                    <line x1="0" y1="0" x2="0" y2="12" stroke="var(--sketch)" strokeWidth="1" />
                </pattern>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="var(--blueprint)" />
                </marker>
                <marker id="arrow-weak" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="var(--blueprint-weak)" />
                </marker>
                <filter id="smudge">
                    <feGaussianBlur stdDeviation="0.6" />
                </filter>
            </defs>
            <g fill="none" stroke="var(--blueprint)" strokeWidth="1">
                <circle cx="340" cy="260" r="160" />
                <circle cx="340" cy="260" r="110" />
                <line x1="340" y1="80" x2="340" y2="440" />
                <line x1="180" y1="260" x2="500" y2="260" />
                <rect x="980" y="140" width="360" height="220" rx="24" />
                <path d="M980 360 L1340 140" />
                <path d="M1040 170 L1280 330" />
                <circle cx="1060" cy="260" r="42" />
                <circle cx="1060" cy="260" r="16" />
                <line x1="1060" y1="210" x2="1060" y2="310" />
                <line x1="1010" y1="260" x2="1110" y2="260" />
                <rect x="620" y="260" width="220" height="130" rx="16" />
                <line x1="620" y1="325" x2="840" y2="325" />
                <line x1="730" y1="260" x2="730" y2="390" />
            </g>
            <g fill="none" stroke="var(--blueprint-weak)" strokeWidth="1" strokeDasharray="6 8">
                <circle cx="1200" cy="640" r="180" />
                <circle cx="1200" cy="640" r="120" />
                <line x1="1020" y1="640" x2="1380" y2="640" />
                <line x1="1200" y1="460" x2="1200" y2="820" />
                <rect x="160" y="620" width="260" height="160" rx="18" />
                <ellipse cx="520" cy="620" rx="180" ry="120" />
                <ellipse cx="520" cy="620" rx="110" ry="70" />
                <line x1="340" y1="620" x2="700" y2="620" />
            </g>
            <g fill="none" stroke="var(--blueprint-weak)" strokeWidth="1">
                <path d="M160 700 L420 700" />
                <path d="M290 620 L290 780" />
                <path d="M620 520 L820 520" />
                <path d="M720 440 L720 600" />
                <path d="M900 540 L1120 540" />
                <path d="M1010 470 L1010 610" />
                <path d="M1260 520 L1420 520" />
                <path d="M1340 460 L1340 580" />
            </g>
            <g fill="none" stroke="var(--blueprint)" strokeWidth="1" opacity="0.7">
                <line x1="120" y1="170" x2="460" y2="170" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                <line x1="120" y1="180" x2="120" y2="340" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                <line x1="980" y1="400" x2="1340" y2="400" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                <line x1="980" y1="410" x2="980" y2="560" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
            </g>
            <g fill="none" stroke="var(--blueprint-weak)" strokeWidth="1" strokeDasharray="3 6">
                <line x1="520" y1="120" x2="520" y2="320" markerStart="url(#arrow-weak)" markerEnd="url(#arrow-weak)" />
                <line x1="520" y1="320" x2="700" y2="320" markerStart="url(#arrow-weak)" markerEnd="url(#arrow-weak)" />
                <line x1="760" y1="740" x2="980" y2="740" markerStart="url(#arrow-weak)" markerEnd="url(#arrow-weak)" />
            </g>
            <g fill="none" stroke="var(--blueprint-weak)" strokeWidth="1">
                <path d="M720 200 C760 220, 800 220, 840 200" />
                <path d="M860 200 C900 220, 940 220, 980 200" />
                <path d="M520 860 C600 820, 740 820, 820 860" />
                <path d="M980 120 C1080 160, 1200 160, 1300 120" />
            </g>
            <g fill="none" stroke="var(--blueprint-weak)" strokeWidth="1" strokeDasharray="2 10">
                <path d="M80 520 C180 480, 280 480, 380 520" />
                <path d="M380 520 C480 560, 580 560, 680 520" />
                <path d="M680 520 C780 480, 880 480, 980 520" />
            </g>
            <g fill="none" stroke="var(--sketch)" strokeWidth="1" filter="url(#smudge)" opacity="0.6">
                <path d="M220 680 C300 620, 420 620, 520 700" />
                <path d="M540 710 C620 770, 720 760, 820 700" />
                <path d="M980 460 C1040 520, 1120 520, 1180 470" />
            </g>
            <g fill="url(#hatch)" opacity="0.25">
                <rect x="700" y="140" width="160" height="120" rx="12" />
            </g>
            <g fill="var(--sketch)" fontFamily="var(--font-instrument-serif), serif" letterSpacing="2" opacity="0.5" filter="url(#smudge)">
                <text x="90" y="520" fontSize="12">RATIO 1.618</text>
                <text x="940" y="910" fontSize="11">BREATH CYCLE</text>
                <text x="220" y="110" fontSize="11">x² + y² = r²</text>
                <text x="360" y="148" fontSize="10">Δt = 1.4s</text>
                <text x="520" y="880" fontSize="11">θ = 34°</text>
                <text x="1080" y="320" fontSize="10">∫ calm dt</text>
                <text x="1220" y="370" fontSize="10">f(t) = e⁻ᵗ</text>
                <text x="114" y="780" fontSize="11">phase 03</text>
                <text x="640" y="110" fontSize="10">λ = 0.618</text>
                <text x="720" y="150" fontSize="10">Σ (σᵢ) / n</text>
                <text x="860" y="220" fontSize="10">R = 2πr</text>
                <text x="980" y="250" fontSize="10">rₙ = r₀ · φⁿ</text>
                <text x="1180" y="520" fontSize="10">Δψ = 0.07</text>
                <text x="128" y="240" fontSize="10">scale 1 : 12</text>
                <text x="260" y="320" fontSize="10">layer B</text>
                <text x="420" y="420" fontSize="10">micro timing</text>
                <text x="560" y="640" fontSize="10">τ = 5s</text>
                <text x="720" y="700" fontSize="10">curve fit</text>
                <text x="980" y="760" fontSize="10">Δ = 0.12</text>
                <text x="1160" y="840" fontSize="10">breath / reset</text>
                <text x="1340" y="620" fontSize="10">phase shift</text>
                <text x="220" y="910" fontSize="10">note: soften edge</text>
            </g>
            <g fill="var(--sketch)" fontFamily="var(--font-instrument-serif), serif" letterSpacing="1.5" opacity="0.35" filter="url(#smudge)">
                <text x="140" y="560" fontSize="9">Δx = 12</text>
                <text x="180" y="590" fontSize="9">Δy = 8</text>
                <text x="420" y="520" fontSize="9">v = 0.8</text>
                <text x="520" y="560" fontSize="9">t₀ = 0</text>
                <text x="620" y="600" fontSize="9">t₁ = 1.6</text>
                <text x="720" y="640" fontSize="9">t₂ = 3.2</text>
                <text x="820" y="680" fontSize="9">t₃ = 4.8</text>
                <text x="920" y="720" fontSize="9">t₄ = 6.4</text>
                <text x="1020" y="760" fontSize="9">t₅ = 8.0</text>
                <text x="1180" y="210" fontSize="9">Φ = 1.618</text>
                <text x="1260" y="250" fontSize="9">π ≈ 3.14</text>
                <text x="1320" y="290" fontSize="9">e ≈ 2.718</text>
                <text x="220" y="680" fontSize="9">grid lock</text>
                <text x="340" y="740" fontSize="9">smooth step</text>
            </g>
            <g fill="var(--blueprint-weak)" fontFamily="var(--font-instrument-sans), sans-serif" letterSpacing="3" opacity="0.55">
                <text x="1040" y="120" fontSize="10">SYSTEM 02</text>
                <text x="980" y="580" fontSize="9">CALIBRATION</text>
                <text x="260" y="350" fontSize="9">MODULE A</text>
            </g>
            <g fill="none" stroke="var(--smudge)" strokeWidth="2" opacity="0.45">
                <path d="M90 610 C180 560, 260 560, 340 600" />
                <path d="M360 600 C440 640, 520 640, 600 600" />
                <path d="M1040 720 C1120 760, 1240 760, 1320 700" />
                <path d="M620 240 C700 200, 820 200, 900 240" />
                <path d="M1000 520 C1080 560, 1180 560, 1260 520" />
                <path d="M260 460 C320 430, 420 430, 480 470" />
            </g>
            <g fill="var(--smudge)" opacity="0.2" filter="url(#smudge)">
                <rect x="120" y="200" width="220" height="36" rx="18" />
                <rect x="620" y="420" width="260" height="30" rx="15" />
                <rect x="980" y="300" width="220" height="28" rx="14" />
                <rect x="1080" y="820" width="240" height="32" rx="16" />
                <rect x="220" y="840" width="180" height="28" rx="14" />
            </g>
        </svg>
    );
}
