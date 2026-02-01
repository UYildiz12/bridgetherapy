import React from 'react';

export function BlueprintSecondarySvg() {
    return (
        <svg className="blueprint-svg blueprint-secondary" aria-hidden="true" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
            <defs>
                <marker id="arrow-soft" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="var(--blueprint-weak)" />
                </marker>
                <filter id="smudge-soft">
                    <feGaussianBlur stdDeviation="1" />
                </filter>
            </defs>
            <g fill="none" stroke="var(--blueprint-weak)" strokeWidth="1">
                <rect x="120" y="120" width="320" height="220" rx="28" />
                <rect x="460" y="160" width="220" height="140" rx="18" />
                <rect x="740" y="180" width="300" height="180" rx="22" />
                <circle cx="360" cy="720" r="140" />
                <circle cx="360" cy="720" r="90" />
                <circle cx="980" cy="760" r="180" />
                <circle cx="980" cy="760" r="120" />
                <line x1="180" y1="230" x2="520" y2="230" />
                <line x1="360" y1="580" x2="360" y2="860" />
                <line x1="800" y1="180" x2="800" y2="360" />
                <line x1="880" y1="640" x2="1080" y2="880" />
            </g>
            <g fill="none" stroke="var(--blueprint)" strokeWidth="1" opacity="0.65">
                <path d="M120 520 C240 460, 380 460, 500 520" />
                <path d="M500 520 C620 580, 760 580, 880 520" />
                <path d="M880 520 C1000 460, 1140 460, 1260 520" />
                <path d="M260 420 L520 420" markerEnd="url(#arrow-soft)" />
                <path d="M520 420 L520 620" markerEnd="url(#arrow-soft)" />
                <path d="M1040 300 L1240 300" markerEnd="url(#arrow-soft)" />
                <path d="M1240 300 L1240 500" markerEnd="url(#arrow-soft)" />
            </g>
            <g fill="none" stroke="var(--blueprint-weak)" strokeWidth="1" strokeDasharray="4 8">
                <path d="M200 140 L620 360" />
                <path d="M220 360 L640 140" />
                <path d="M980 220 L1320 420" />
                <path d="M980 420 L1320 220" />
                <path d="M120 820 L520 620" />
                <path d="M120 620 L520 820" />
            </g>
            <g fill="var(--sketch)" opacity="0.28" filter="url(#smudge-soft)">
                <path d="M720 720 C820 660, 940 660, 1040 720" />
                <path d="M260 260 C320 220, 420 220, 480 260" />
            </g>
            <g fill="var(--sketch)" fontFamily="var(--font-instrument-serif), serif" letterSpacing="1.6" opacity="0.35" filter="url(#smudge-soft)">
                <text x="140" y="460" fontSize="10">aₙ = a₀ · rⁿ</text>
                <text x="520" y="460" fontSize="10">Δ = 0.08</text>
                <text x="900" y="140" fontSize="10">scale: 1 / 8</text>
                <text x="1120" y="520" fontSize="10">n = 24</text>
                <text x="760" y="900" fontSize="10">flow grid</text>
            </g>
        </svg>
    );
}
