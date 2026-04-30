"use client";

import React, { useState, useEffect, useRef, useCallback, CSSProperties, ReactNode, FC } from 'react';
import Link from 'next/link';
import './landing.css';

/* ── Preloader Words (Multi-language greetings like reference) ── */
const PRELOADER_WORDS = ['Namaste', 'नमस्ते', 'নমস্কার', 'నమస్తే', 'ನಮಸ್ಕಾರ', 'નમસ્તે', 'നമസ്കാരം', 'Hello'];

/* ── Infinite Scroll Logos ────────────────────────────────────── */
const SCROLL_LOGOS = [
    'Bill Analysis', 'Tariff Engine', 'Subsidy Navigator', 'Solar ROI',
    'AI Extraction', 'Kannada Voice', 'WhatsApp Bot', 'Privacy-First',
];

/* ── How It Works Steps Data ──────────────────────────────────── */
const HOW_IT_WORKS_STEPS = [
    {
        num: 1,
        title: 'Send Your Bill Photo',
        desc: "Send your MESCOM electricity bill via WhatsApp. Just take a clear photo — our AI extracts all details with precision. No manual data entry, no hassle.",
        en: [
            { from: 'user', text: 'Hi Vidyut Mitra' },
            { from: 'bot', text: '⚡ ನಮಸ್ತೆ! Send your MESCOM bill photo to analyze it.' },
            { from: 'bot', text: '🔊 Voice Reply', isVoice: true },
            { from: 'user', text: '📷 [Bill Photo]', isImage: true },
            { from: 'bot', text: '✅ Bill received! Analyzing your consumption...' },
        ],
        kn: [
            { from: 'user', text: 'Hi Vidyut Mitra' },
            { from: 'bot', text: '⚡ ನಮಸ್ತೆ! ನಿಮ್ಮ MESCOM ವಿದ್ಯುತ್ ಬಿಲ್ ಫೋಟೋ ಕಳುಹಿಸಿ.' },
            { from: 'bot', text: '🔊 ಧ್ವನಿ ಪ್ರತ್ಯುತ್ತರ', isVoice: true },
            { from: 'user', text: '📷 [ಬಿಲ್ ಫೋಟೋ]', isImage: true },
            { from: 'bot', text: '✅ ಬಿಲ್ ಸ್ವೀಕೃತ! ನಿಮ್ಮ ಬಳಕೆ ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ...' },
        ],
    },
    {
        num: 2,
        title: 'Get Tariff Breakdown',
        desc: 'Our AI instantly extracts your consumption and recalculates the bill using the latest KERC Tariff Orders. We detect anomalies, hidden charges, and alert you if your slab changed unexpectedly.',
        en: [
            { from: 'user', text: 'Why is my bill high this month?' },
            { from: 'bot', text: '📊 Tariff Breakdown\n\nYour consumption crossed the 100-unit slab to 115 units, increasing the per-unit rate from ₹4.75 to ₹7.00 for the extra units.' },
            { from: 'bot', text: '🔊 Voice Analysis', isVoice: true },
            { from: 'bot', text: 'View detailed calculation:', hasButton: 'View Report' },
        ],
        kn: [
            { from: 'user', text: 'ಈ ತಿಂಗಳು ನನ್ನ ಬಿಲ್ ಏಕೆ ಹೆಚ್ಚಾಗಿದೆ?' },
            { from: 'bot', text: '📊 ದರ ವಿಶ್ಲೇಷಣೆ\n\nನಿಮ್ಮ ಬಳಕೆಯು 100-ಯೂನಿಟ್ ಸ್ಲ್ಯಾಬ್ ದಾಟಿ 115 ಯೂನಿಟ್‌ಗಳಿಗೆ ತಲುಪಿದೆ. ಹೆಚ್ಚುವರಿ ಯೂನಿಟ್‌ಗಳಿಗೆ ದರ ₹4.75 ರಿಂದ ₹7.00 ಕ್ಕೆ ಹೆಚ್ಚಾಗಿದೆ.' },
            { from: 'bot', text: '🔊 ವಿಶ್ಲೇಷಣೆ ಆಲಿಸಿ', isVoice: true },
            { from: 'bot', text: 'ವಿವರವಾದ ವರದಿ ವೀಕ್ಷಿಸಿ:', hasButton: 'ವರದಿ ವೀಕ್ಷಿಸಿ' },
        ],
    },
    {
        num: 3,
        title: 'Discover Subsidies',
        desc: 'Check your eligibility for Gruha Jyothi, PM Surya Ghar Muft Bijli Yojana, and local solar rebates. Answer 2 simple questions and get exact steps to enroll directly on WhatsApp.',
        en: [
            { from: 'user', text: 'Subsidies' },
            { from: 'bot', text: '🔍 Subsidy Eligibility Check\n\nBased on your consumption (under 200 units), you qualify for the Gruha Jyothi scheme.' },
            { from: 'bot', text: 'Would you like the link to apply?' },
            { from: 'user', text: 'Yes please' },
            { from: 'bot', text: '🔗 Apply here: sevasindhuservices.karnataka.gov.in', hasButton: 'Apply Now' },
        ],
        kn: [
            { from: 'user', text: 'ಸಬ್ಸಿಡಿಗಳು' },
            { from: 'bot', text: '🔍 ಸಬ್ಸಿಡಿ ಅರ್ಹತೆ ಪರಿಶೀಲನೆ\n\nನಿಮ್ಮ ಬಳಕೆಯ ಆಧಾರದ ಮೇಲೆ (200 ಯೂನಿಟ್‌ಗಳ ಒಳಗೆ), ನೀವು ಗೃಹ ಜ್ಯೋತಿ ಯೋಜನೆಗೆ ಅರ್ಹರಾಗಿದ್ದೀರಿ.' },
            { from: 'bot', text: 'ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಲಿಂಕ್ ಬೇಕೇ?' },
            { from: 'user', text: 'ಹೌದು ದಯವಿಟ್ಟು' },
            { from: 'bot', text: '🔗 ಇಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ: sevasindhuservices.karnataka.gov.in', hasButton: 'ಈಗಲೇ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ' },
        ],
    },
    {
        num: 4,
        title: 'Solar ROI Calculator',
        desc: "Calculate rooftop solar payback period, 25-year lifetime savings, and CO₂ offset based on your actual consumption.",
        en: [
            { from: 'user', text: 'Tell me about solar' },
            { from: 'bot', text: '☀️ Solar ROI Analysis\n\n3.5 kW System\n4.2 year payback\n25Y Savings: ₹8,50,000\nCO₂: 145 tons' },
            { from: 'bot', text: '📥 Download solar report' },
            { from: 'bot', text: '🔊 Voice Reply', isVoice: true },
        ],
        kn: [
            { from: 'user', text: 'ಸೌರ ಬಗ್ಗೆ ತಿಳಿಸಿ' },
            { from: 'bot', text: '☀️ ಸೌರ ROI ವಿಶ್ಲೇಷಣೆ\n\n3.5 kW ಸಿಸ್ಟಮ್\n4.2 ವರ್ಷ ಹಿಂದುಳಿಗೆ\n25 ವರ್ಷ ಆದಿರುಷ್ಟಿ: ₹8,50,000\nCO₂: 145 ಟನ್‌ಗಳು' },
            { from: 'bot', text: '📥 ಸೌರ ವರದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ' },
            { from: 'bot', text: '🔊 ಧ್ವನಿ ಪ್ರತ್ಯುತ್ತರ', isVoice: true },
        ],
    },
];

/* ── Carousel Views Data ──────────────────────────────────────── */
const CAROUSEL_VIEWS = [
    { title: 'Bill Photo Upload' },
    { title: 'AI Analysis' },
    { title: 'Tariff Breakdown' },
    { title: 'Savings Report' },
];

/* ── Display Card Data (Tech Specs) ──────────────────────────── */
const DISPLAY_CARDS = [
    { title: 'Gemini 2.5 Flash', desc: 'AI-powered bill photo extraction & field validation', tag: 'AI ENGINE', color: 'orange' },
    { title: 'KERC Tariff Orders', desc: 'Real-time tariff recalculation & anomaly detection', tag: 'DATA ENGINE', color: 'green' },
    { title: 'Kannada Voice AI', desc: 'Text-to-speech & voice responses in Kannada', tag: 'VOICE AI', color: 'blue' },
    { title: 'Privacy-First Design', desc: 'DPDPA-compliant: no bill images stored ever', tag: 'SECURITY', color: 'purple' },
];

/* ── Bridge Checklist Features ────────────────────────────────── */
const BRIDGE_FEATURES = [
    'Real-time bill analysis & tariff verification',
    'Voice-first subsidy discovery engine',
    'Privacy-first: Zero bill image storage',
];

/* ═══════════════════════════════════════════════════════════════
   Preloader Component
   ═══════════════════════════════════════════════════════════════ */
function Preloader({ onFinish }: { onFinish?: () => void }): React.ReactElement | null {
    const [index, setIndex] = useState(0);
    const [hidden, setHidden] = useState(false);
    const [removed, setRemoved] = useState(false);
    const wordRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        if (index < PRELOADER_WORDS.length - 1) {
            const timer = setTimeout(() => {
                if (wordRef.current) {
                    wordRef.current.style.opacity = '0';
                    setTimeout(() => {
                        setIndex(prev => prev + 1);
                        if (wordRef.current) wordRef.current.style.opacity = '1';
                    }, 200);
                }
            }, 600);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => {
                setHidden(true);
                setTimeout(() => {
                    setRemoved(true);
                    document.body.style.overflow = '';
                    onFinish?.();
                }, 1200);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [index, onFinish]);

    if (removed) return null;

    return (
        <div className={`preloader ${hidden ? 'preloader--hidden' : ''}`}>
            <p className="preloader__text" ref={wordRef} style={{ opacity: 1 }}>
                <span className="preloader__dot"></span>
                <span className="preloader__word">{PRELOADER_WORDS[index]}</span>
            </p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TextGradientScroll Component (Scroll-based word reveal)
   ═══════════════════════════════════════════════════════════════ */
function TextGradientScroll({ text }: { text: string }): React.ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);

    // Split into tokens, preserving \n as separate tokens
    const tokens: string[] = [];
    text.split('\n').forEach((line: string, li: number) => {
        if (li > 0) tokens.push('\n');
        line.split(' ').filter(Boolean).forEach((w: string) => tokens.push(w));
    });
    const wordTokens = tokens.filter(t => t !== '\n');
    const totalWords = wordTokens.length;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleScroll = (): void => {
            const rect = el.getBoundingClientRect();
            const viewH = window.innerHeight;
            // Spreading the progress over a larger scroll area
            const start = viewH * 0.9;
            const end = viewH * 0.1;
            const p = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
            setProgress(p);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    let wordIndex = 0;
    return (
        <div ref={containerRef} className="tgs-container">
            {tokens.map((token: string, i: number) => {
                if (token === '\n') {
                    return <div key={`br-${i}`} className="tgs-break" />;
                }
                const wi = wordIndex++;
                const wordStart = wi / totalWords;
                const wordEnd = wordStart + 1 / totalWords;
                const chars = token.split('');
                return (
                    <span key={i} className="tgs-word">
                        {chars.map((char: string, j: number) => {
                            const charStart = wordStart + (j / chars.length) * (wordEnd - wordStart);
                            const charEnd = wordStart + ((j + 1) / chars.length) * (wordEnd - wordStart);
                            const opacity = Math.min(1, Math.max(0.1, (progress - charStart) / (charEnd - charStart)));
                            return (
                                <span key={j} className="tgs-char" style={{ opacity }}>
                                    {char}
                                </span>
                            );
                        })}
                    </span>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   InfiniteScroll Logos Component
   ═══════════════════════════════════════════════════════════════ */
function InfiniteLogos(): React.ReactElement {
    const allLogos = [...SCROLL_LOGOS, ...SCROLL_LOGOS, ...SCROLL_LOGOS];
    return (
        <div className="logos-section">
            <p className="logos-label">POWERING VIDYUT MITRA</p>
            <div className="logos-track-wrapper">
                <div className="logos-track">
                    {allLogos.map((name: string, i: number) => (
                        <span key={i} className="logo-text">{name}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Feature Carousel Component
   ═══════════════════════════════════════════════════════════════ */
function FeatureCarousel(): React.ReactElement {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent(prev => (prev + 1) % CAROUSEL_VIEWS.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="carousel-wrapper">
            <div className="carousel-ring">
                <div className="carousel-slides" style={{ transform: `translateX(-${current * 100}%)` }}>
                    {CAROUSEL_VIEWS.map((view: typeof CAROUSEL_VIEWS[0], i: number) => (
                        <div key={i} className="carousel-slide">
                            <div className={`carousel-mockup mockup-${i}`}>
                                <div className="mockup-topbar">
                                    <div className="mockup-dots">
                                        <span /><span /><span />
                                    </div>
                                    <span className="mockup-title">{view.title}</span>
                                </div>
                                <div className="mockup-body">
                                    <div className="mockup-placeholder">
                                        <div className="mp-line w80" />
                                        <div className="mp-line w60" />
                                        <div className="mp-cards">
                                            <div className="mp-card" />
                                            <div className="mp-card" />
                                        </div>
                                        <div className="mp-line w40" />
                                        <div className="mp-line w70" />
                                    </div>
                                </div>
                            </div>
                            <div className="carousel-caption">{view.title}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="carousel-dots">
                {CAROUSEL_VIEWS.map((_: typeof CAROUSEL_VIEWS[0], i: number) => (
                    <button
                        key={i}
                        className={`carousel-dot ${i === current ? 'active' : ''}`}
                        onClick={() => setCurrent(i)}
                    />
                ))}
            </div>
            <div className="carousel-nav">
                <button className="carousel-btn" onClick={() => setCurrent(p => (p - 1 + CAROUSEL_VIEWS.length) % CAROUSEL_VIEWS.length)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    Previous
                </button>
                <button className="carousel-btn" onClick={() => setCurrent(p => (p + 1) % CAROUSEL_VIEWS.length)}>
                    Next
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   DisplayCards Component (Stacked skewed cards)
   ═══════════════════════════════════════════════════════════════ */
function DisplayCards(): React.ReactElement {
    const colors = {
        orange: { icon: '#fb923c', title: '#f97316', bg: 'rgba(251,146,60,0.12)' },
        green: { icon: '#4ade80', title: '#22c55e', bg: 'rgba(74,222,128,0.12)' },
        blue: { icon: '#FF9933', title: '#e86a33', bg: 'rgba(255,153,51,0.12)' },
        purple: { icon: '#c084fc', title: '#a855f7', bg: 'rgba(192,132,252,0.12)' },
    };

    return (
        <div className="dc-stack">
            {DISPLAY_CARDS.map((card: typeof DISPLAY_CARDS[0], i: number) => {
                const c = colors[card.color];
                return (
                    <div
                        key={i}
                        className={`dc-card dc-card-${i}`}
                        style={{ '--card-color': c.title, '--card-bg': c.bg } as CSSProperties & Record<string, string>}
                    >
                        <div className="dc-top">
                            <span className="dc-icon-badge" style={{ background: c.bg }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.8 5.6 21.2 8 14 2 9.2h7.6z" /></svg>
                            </span>
                            <span className="dc-title" style={{ color: c.title }}>{card.title}</span>
                        </div>
                        <p className="dc-desc">{card.desc}</p>
                        <span className="dc-tag">{card.tag}</span>
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   OrnateAudioPlayer Component (SVG flower + play button)
   ═══════════════════════════════════════════════════════════════ */
function OrnateAudioPlayer(): React.ReactElement {
    return (
        <div className="ornate-player">
            <div className="ornate-outer">
                <svg viewBox="0 0 200 200" className="ornate-svg ornate-spin">
                    <path fill="#F58220" d="M100 0 C110 40 160 40 160 100 C160 160 110 160 100 200 C90 160 40 160 40 100 C40 40 90 40 100 0 M100 30 C130 30 170 70 170 100 C170 130 130 170 100 170 C70 170 30 130 30 100 C30 70 70 30 100 30" opacity="0.2" />
                    <g transform="translate(100, 100)">
                        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                            <path key={angle} transform={`rotate(${angle})`} fill="#F58220" d="M0 -90 C15 -70 25 -40 0 -20 C-25 -40 -15 -70 0 -90" opacity="0.4" />
                        ))}
                        <circle cx="0" cy="0" r="70" fill="url(#ornGrad)" />
                    </g>
                    <defs>
                        <radialGradient id="ornGrad">
                            <stop offset="0%" stopColor="#F9A03F" />
                            <stop offset="100%" stopColor="#F58220" />
                        </radialGradient>
                    </defs>
                </svg>
            </div>
            <div className="ornate-inner">
                <svg viewBox="0 0 200 200" className="ornate-svg">
                    <path fill="#F58220" d="M100 20 C115 50 150 50 180 100 C150 150 115 150 100 180 C85 150 50 150 20 100 C50 50 85 50 100 20" opacity="0.9" />
                    <path fill="#F9A03F" d="M100 40 C110 65 140 65 160 100 C140 135 110 135 100 160 C90 135 60 135 40 100 C60 65 90 65 100 40" />
                </svg>
            </div>
            <div className="ornate-center">
                <a
                    href="https://api.whatsapp.com/send?phone=15551445754&text=Namaste%20Vidyut%20Mitra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ornate-btn"
                >
                    <div className="ornate-play-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#F58220"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                    <span>Try on WhatsApp</span>
                </a>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   WhatsApp Phone Mockup Component (Premium Redesign)
   ═══════════════════════════════════════════════════════════════ */
function WhatsAppMockup({ messages }: { messages: Array<{ from: string; text: string; isVoice?: boolean; isImage?: boolean; isCert?: boolean; hasButton?: string }> }): React.ReactElement {
    return (
        <div className="wa-phone-frame">
            <div className="wa-phone-glare"></div>
            <div className="wa-phone-notch">
                <div className="wa-camera-lens"></div>
                <div className="wa-speaker-grill"></div>
            </div>
            <div className="wa-phone-screen">
                {/* WhatsApp header */}
                <div className="wa-header">
                    <div className="wa-header-left">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                        <div className="wa-avatar">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        </div>
                        <div className="wa-header-info">
                            <span className="wa-contact-name">Vidyut Mitra</span>
                            <span className="wa-status-text">online</span>
                        </div>
                    </div>
                    <div className="wa-header-icons">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"/></svg>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </div>
                </div>
                {/* Chat area */}
                <div className="wa-chat-area">
                    <div className="wa-date-chip"><span>Today</span></div>
                    <div className="wa-security-notice">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#54656f"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.67-3.13 8.89-7 10.02-3.87-1.13-7-5.35-7-10.02v-4.7l7-3.12zM12 6a3 3 0 00-3 3v1H8v5h8v-5h-1V9a3 3 0 00-3-3zm0 1.5a1.5 1.5 0 011.5 1.5v1h-3V9A1.5 1.5 0 0112 7.5z"/></svg>
                        <span>Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.</span>
                    </div>
                    {messages.map((msg: typeof messages[0], i: number) => (
                        <div key={i} className={`wa-msg ${msg.from === 'user' ? 'wa-msg-out' : 'wa-msg-in'}`}>
                            {msg.isCert ? (
                                <div className="wa-cert-card">
                                    <div className="wa-cert-top">
                                        <div className="wa-cert-icon">📜</div>
                                        <div>
                                            <div className="wa-cert-title">Smart Certificate</div>
                                            <div className="wa-cert-meta">PDF · 1.2 MB · SHA-256 Verified</div>
                                        </div>
                                    </div>
                                    <div className="wa-cert-preview">
                                        <div className="wa-cert-preview-inner">
                                            <div className="wa-cert-badge">BOCW VERIFIED</div>
                                            <div className="wa-cert-name">Rajesh Kumar</div>
                                            <div className="wa-cert-days">90/90 Days Verified</div>
                                            <div className="wa-cert-qr">▣ QR</div>
                                        </div>
                                    </div>
                                </div>
                            ) : msg.isImage ? (
                                <div className="wa-img-placeholder">
                                    <div className="wa-img-icon">{msg.text.includes('Aadhaar') ? '📄' : msg.text.includes('Selfie') || msg.text.includes('selfie') ? '📸' : '🖼️'}</div>
                                    <span>{msg.text.replace(/[\u{1F4F7}\u{1F933}] /u, '')}</span>
                                </div>
                            ) : msg.isVoice ? (
                                <div className="wa-voice-bubble">
                                    <div className="wa-voice-avatar">{msg.from === 'user' ? '👤' : '🤖'}</div>
                                    <div className="wa-voice-wave">
                                        {[3,5,8,12,8,14,10,6,9,12,7,4,8,11,6,3].map((h: number, j: number) => (
                                            <div key={j} className="wa-wave-bar" style={{height: `${h}px`}} />
                                        ))}
                                    </div>
                                    <span className="wa-voice-dur">0:04</span>
                                </div>
                            ) : (
                                <>
                                    <span className="wa-msg-text">{msg.text}</span>
                                    {msg.hasButton && (
                                        <div className="wa-action-btn">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                            {msg.hasButton}
                                        </div>
                                    )}
                                </>
                            )}
                            <span className="wa-msg-time">{`${9 + i}:${String(i * 7 + 10).padStart(2, '0').slice(0,2)} AM`}</span>
                        </div>
                    ))}
                </div>
                {/* Input bar */}
                <div className="wa-input-bar-mock">
                    <div className="wa-input-row">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8696a0" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                        <div className="wa-input-field">Type a message</div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8696a0" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    </div>
                    <div className="wa-mic-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   HowItWorks Section — Sticky Scroll Design
   Left steps stay fixed, right phone mockup changes on scroll
   ═══════════════════════════════════════════════════════════════ */
function HowItWorksSection(): React.ReactElement {
    const [activeStep, setActiveStep] = useState(0);
    const [lang, setLang] = useState('en');

    const handleNext = (): void => {
        if (activeStep < HOW_IT_WORKS_STEPS.length - 1) {
            setActiveStep(prev => prev + 1);
        }
    };

    const handlePrev = (): void => {
        if (activeStep > 0) {
            setActiveStep(prev => prev - 1);
        }
    };

    return (
        <section id="platform" className="hiw-section">
            {/* Premium Background Elements */}
            <div className="hiw-bg-elements">
                <div className="hiw-bg-grid" />
                <div className="hiw-bg-mandala">
                    <svg viewBox="0 0 400 400" className="bg-mandala-svg">
                        <g opacity="0.08" fill="none" stroke="#A37E52" strokeWidth="1.5">
                            {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                                <path key={angle} transform={`translate(200, 200) rotate(${angle})`} d="M0 -50 C 40 -120 120 -40 50 0 C 120 40 40 120 0 50 C -40 120 -120 40 -50 0 C -120 -40 -40 -120 0 -50" />
                            ))}
                            <circle cx="200" cy="200" r="100" />
                            <circle cx="200" cy="200" r="120" strokeDasharray="4 4" />
                            <circle cx="200" cy="200" r="160" />
                        </g>
                    </svg>
                </div>
            </div>

            <div className="hiw-header">
                <span className="hiw-badge">HOW IT WORKS</span>
                <h2 className="hiw-main-title">From Hello to Smart Certificate<br />in <span className="text-saffron">4 Simple Steps</span></h2>
                <p className="hiw-main-desc">No apps, no forms, no literacy required — just WhatsApp.</p>
            </div>
            <div className="hiw-interactive-container">
                <div className="hiw-content-panel">
                    {/* Left: Steps navigation */}
                    <div className="hiw-left-panel">
                        <div className="hiw-steps-list">
                            {HOW_IT_WORKS_STEPS.map((step: typeof HOW_IT_WORKS_STEPS[0], i: number) => (
                                <div
                                    key={step.num}
                                    className={`hiw-step-item ${i === activeStep ? 'hiw-step-active' : ''}`}
                                    onClick={() => setActiveStep(i)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && setActiveStep(i)}
                                >
                                    <div className="hiw-step-indicator">
                                        <div className="hiw-step-circle-outer">
                                            <div className="hiw-step-circle">{step.num}</div>
                                        </div>
                                        {i < 3 && (
                                            <div className="hiw-step-connector">
                                                <div className="hiw-step-connector-fill" style={{ height: activeStep > i ? '100%' : '0%' }} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="hiw-step-content">
                                        <div className="hiw-step-label">STEP {step.num}</div>
                                        <h3 className="hiw-step-title">{step.title}</h3>
                                        <p className={`hiw-step-desc ${i === activeStep ? 'hiw-desc-show' : ''}`}>{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="hiw-nav-buttons">
                            <button
                                className="hiw-nav-btn hiw-nav-arrow"
                                onClick={handlePrev}
                                disabled={activeStep === 0}
                                aria-label="Previous step"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                            </button>
                            <div className="hiw-nav-dots">
                                {HOW_IT_WORKS_STEPS.map((_: typeof HOW_IT_WORKS_STEPS[0], i: number) => (
                                    <button
                                        key={i}
                                        className={`hiw-nav-dot ${i === activeStep ? 'hiw-dot-active' : ''}`}
                                        onClick={() => setActiveStep(i)}
                                        aria-label={`Step ${i + 1}`}
                                    />
                                ))}
                            </div>
                            <button
                                className="hiw-nav-btn hiw-nav-arrow"
                                onClick={handleNext}
                                disabled={activeStep === HOW_IT_WORKS_STEPS.length - 1}
                                aria-label="Next step"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                        </div>
                    </div>

                    {/* Right: Phone mockup — all steps pre-rendered, crossfade via CSS */}
                    <div className="hiw-right-panel">
                        <div className="hiw-device-stand"></div>
                        <div className="hiw-lang-tabs">
                            <button className={`hiw-tab ${lang === 'en' ? 'hiw-tab-active' : ''}`} onClick={() => setLang('en')}>English</button>
                            <button className={`hiw-tab ${lang === 'kn' ? 'hiw-tab-active' : ''}`} onClick={() => setLang('kn')}>ಕನ್ನಡ</button>
                        </div>
                        <div className="hiw-phone-stack">
                            {HOW_IT_WORKS_STEPS.map((step: typeof HOW_IT_WORKS_STEPS[0], i: number) => {
                                const msgs = lang === 'kn' ? step.kn : step.en;
                                return (
                                    <div key={i} className={`hiw-phone-slide ${i === activeStep ? 'hiw-phone-slide-active' : ''}`}>
                                        <WhatsAppMockup messages={msgs} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SVG Icons
   ═══════════════════════════════════════════════════════════════ */
const GithubIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>;
const TwitterIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
const LinkedInIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>;
const InstagramIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>;
const MapPinIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const MailIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
const PhoneIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>;
const CheckCircle = () => <div className="check-circle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>;

const ProductDemoSection: FC = () => {
    return (
        <section className="product-demo-section" id="demo-video">
            {/* Background Elements */}
            <div className="demo-bg-elements">
                <div className="demo-bg-grid" />
                <div className="demo-bg-mandala">
                    <svg viewBox="0 0 400 400" className="bg-mandala-svg">
                        <g opacity="0.12" fill="none" stroke="#A37E52" strokeWidth="1.5">
                            {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                                <path key={angle} transform={`translate(200, 200) rotate(${angle})`} d="M0 -50 C 40 -120 120 -40 50 0 C 120 40 40 120 0 50 C -40 120 -120 40 -50 0 C -120 -40 -40 -120 0 -50" />
                            ))}
                            {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(angle => (
                                <path key={angle} transform={`translate(200, 200) rotate(${angle})`} d="M0 -100 C 20 -180 80 -140 30 -50" opacity="0.5" />
                            ))}
                            <circle cx="200" cy="200" r="100" />
                            <circle cx="200" cy="200" r="120" strokeDasharray="4 4" />
                            <circle cx="200" cy="200" r="160" />
                        </g>
                    </svg>
                </div>
                <div className="demo-bg-crane">
                    <svg viewBox="0 0 200 200" opacity="0.10" stroke="#1f2937">
                        <line x1="160" y1="20" x2="160" y2="200" strokeWidth="2" />
                        <line x1="140" y1="20" x2="140" y2="200" strokeWidth="2" />
                        {[40, 60, 80, 100, 120, 140, 160, 180].map(y => (
                            <g key={y}>
                                <line x1="140" y1={y} x2="160" y2={y} strokeWidth="2"/>
                                <line x1="140" y1={y-20} x2="160" y2={y} strokeWidth="1"/>
                                <line x1="160" y1={y-20} x2="140" y2={y} strokeWidth="1"/>
                            </g>
                        ))}
                        <line x1="0" y1="20" x2="200" y2="20" strokeWidth="2" />
                        <line x1="0" y1="40" x2="200" y2="40" strokeWidth="2" />
                        {[0, 20, 40, 60, 80, 100, 120, 140].map(x => (
                            <g key={x}>
                                <line x1={x} y1="20" x2={x} y2="40" strokeWidth="2"/>
                                <line x1={x} y1="20" x2={x+20} y2="40" strokeWidth="1"/>
                                <line x1={x+20} y1="20" x2={x} y2="40" strokeWidth="1"/>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>

            {/* Main Content */}
            <div className="demo-card-container">
                <div className="demo-card">
                    <a href="#product-demo" className="demo-card-btn">Product Demo</a>
                    <div className="demo-card-logo">
                        <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="24" y="24" width="8" height="24" fill="#A37E52" />
                            <rect x="34" y="16" width="8" height="32" fill="#1A3C28" />
                            <rect x="44" y="28" width="6" height="20" fill="#A37E52" />
                            <rect x="26" y="30" width="4" height="4" fill="#fff" />
                            <rect x="36" y="22" width="4" height="4" fill="#fff" />
                            <rect x="36" y="30" width="4" height="4" fill="#fff" />
                            <path d="M12 48 V26 L24 38 L34 26" stroke="#A37E52" strokeWidth="4" fill="none" strokeLinejoin="bevel"/>
                            <path d="M12 48 H52" stroke="#A37E52" strokeWidth="3" fill="none"/>
                        </svg>
                        <div className="demo-logo-text">
                            <span className="nm-nirman">Vidyut</span> <span className="nm-mitra">Mitra</span>
                        </div>
                    </div>
                    
                    <h2 className="demo-card-title">AI Techno-Legal Concierge</h2>
                    <p className="demo-card-subtitle">Seamless Welfare Access via Voice & WhatsApp</p>
                    
                    <div className="demo-card-pills">
                        
                        
                        <div className="demo-pill">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b5e4c" strokeWidth="1.5"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
                            Voice AI
                        </div>
                    </div>
                </div>

                <div className="demo-play-area">
                    <svg viewBox="0 0 240 240" className="demo-sunburst-svg" style={{position: 'absolute', width: '280px', height: '280px', zIndex: 0}}>
                        <g transform="translate(120, 120)">
                            {[...Array(16)].map((_: any, i: number) => (
                                <g key={i} transform={`rotate(${i * 22.5})`}>
                                    <path d="M -15 -85 L 0 -115 L 15 -85 Z" fill="#D2B57E" opacity="0.5" />
                                    <path d="M -10 -90 L 0 -105 L 10 -90 Z" fill="#FDF3DB" opacity="0.9" />
                                </g>
                            ))}
                        </g>
                    </svg>
                    <a href="https://api.whatsapp.com/send?phone=15551445754&text=Namaste%20Vidyut%20Mitra" target="_blank" rel="noopener noreferrer" className="demo-play-circle">
                        <div className="play-circle-gold-ring">
                            <div className="play-circle-green-ring">
                                <div className="play-circle-inner-white">
                                    <div className="play-icon-outline">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#5F6D52" style={{marginLeft: '2px'}}>
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                    <span className="play-text">Try on WhatsApp ➔</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
            
            <div className="wa-demo-notice">
                <div className="wa-demo-notice-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#C68642"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
                </div>
                <p><strong>WhatsApp Bot Notice:</strong> We are currently in a restricted pilot phase. To experience the full registration-to-certification flow, please view the Product Demo above or contact us to pre-register your number.</p>
            </div>
        </section>
    );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage(): React.ReactElement {
    const [scrolled, setScrolled] = useState(false);
    const [alreadyVisited, setAlreadyVisited] = useState(false);
    const [preloaderDone, setPreloaderDone] = useState(false);

    // Skip preloader if user already visited this session
    useEffect(() => {
        const visited = !!sessionStorage.getItem('nm-visited');
        setAlreadyVisited(visited);
        if (visited) {
            setPreloaderDone(true);
        }
    }, []);

    /* Override body styles for light theme */
    useEffect(() => {
        const body = document.body;
        const html = document.documentElement;
        const origBodyBg = body.style.background;
        const origBodyColor = body.style.color;
        const origHtmlBg = html.style.background;
        body.style.background = '#fdfdfd';
        body.style.color = '#0f172a';
        html.style.background = '#fdfdfd';
        return () => {
            body.style.background = origBodyBg;
            body.style.color = origBodyColor;
            html.style.background = origHtmlBg;
        };
    }, []);

    /* Scroll detection for navbar */
    useEffect(() => {
        const onScroll = (): void => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="landing-root">
            {!alreadyVisited && <Preloader onFinish={() => {
                setPreloaderDone(true);
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('nm-visited', '1');
                }
            }} />}

            <div className={`landing-content ${preloaderDone ? 'landing-content--visible' : ''}`}>
            {/* ── Ambient Top Gradients & Background ───────────────── */}
            <div className="ambient-gradients">
                <div className="hero-bg-image" />
                <div className="grad-saffron" />
                <div className="grad-fade" />
            </div>

            {/* ── Fixed Pill Navbar ──────────────────────────────── */}
            <nav className={`landing-nav pill-nav ${scrolled ? 'nav-scrolled' : ''}`}>
                <div className="nav-inner nav-pill">
                <Link href="/home" className="nav-logo">
                        <span className="logo-text-nm">VIDYUT MITRA</span>
                    </Link>

                    <div className="nav-links">
                        <a href="#platform" className="nav-link">Platform <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></a>
                        <a href="#workers" className="nav-link">Workers <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></a>
                        <a href="#about" className="nav-link">About <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></a>
                    </div>

                    <div className="nav-actions">
                        <a href="https://api.whatsapp.com/send?phone=15551445754&text=Namaste%20Vidyut%20Mitra" target="_blank" rel="noopener noreferrer" className="nav-btn-outline">
                            Try on WhatsApp
                        </a>
                        <Link href="/dashboard" className="nav-btn-dark">
                            Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero Section ─────────────────────────────────── */}
            <main className="hero-section">
                
                {/* ── Top Mandala Decoration ─────────────────────── */}
                <div className="hero-mandala">
                    <svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g opacity="0.6" stroke="#9A7B4F" strokeWidth="0.5">
                            {/* Half-mandala pattern hanging from top */}
                            <path d="M 0,0 C 20,40 40,60 100,80 C 160,60 180,40 200,0" fill="rgba(255, 235, 200, 0.1)" strokeWidth="1.5" />
                            <path d="M 20,0 C 40,20 60,40 100,50 C 140,40 160,20 180,0" />
                            <path d="M 40,0 C 60,10 80,20 100,25 C 120,20 140,10 160,0" />
                            <circle cx="100" cy="15" r="5" fill="#9A7B4F" />
                            <circle cx="100" cy="35" r="3" fill="#9A7B4F" />
                            <circle cx="100" cy="80" r="2" fill="#9A7B4F" />
                            {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map(x => (
                                <path key={x} d={`M ${x},0 L 100,25`} opacity="0.2" />
                            ))}
                            <path d="M 85,80 L 115,80 L 100,95 Z" fill="rgba(154, 123, 79, 0.3)" strokeWidth="1" />
                        </g>
                    </svg>
                </div>

                <div className="hero-ribbon-banner">
                    <div className="ribbon-content">
                        <span>Built on KERC FY26 tariffs · DPDPA-compliant · Kannada-first</span>
                    </div>
                </div>

                <h1 className="hero-headline">
                    <span className="font-bold whitespace-nowrap block">ನಿಮ್ಮ ವಿದ್ಯುತ್ ಬಿಲ್, ಸರಳವಾಗಿ.</span>
                    <span className="block text-[0.85em] font-medium text-slate-800 mt-2 mb-6">Your electricity bill, simplified.</span>
                </h1>

                <div className="hero-sub space-y-2 mb-10">
                    <p className="text-slate-600">Built on KERC FY26 tariffs · DPDPA-compliant · Kannada-first</p>
                    <p className="text-sm text-slate-500">Built Into Whatsapp, Zero Friction!</p>
                </div>

                <div className="hero-cta-wrapper">
                    <Link href="/chat" className="hero-cta-ornate">
                        <div className="cta-content">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="cta-icon">
                                <path d="M5 21v-8M12 21V9M19 21v-8M3 21h18M8 21v-5M16 21v-5M5 6l7-3 7 3" />
                                <rect x="5" y="6" width="14" height="15" rx="1" />
                                <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
                            </svg>
                            <span>Experience Vidyut Mitra</span>
                        </div>
                    </Link>
                </div>

                {/* Infinite Scroll Logos */}
                <InfiniteLogos />

                {/* ── About / Mission Section ──────────────────── */}
                <section id="about" className="mission-section">
                    <div className="mission-label">OUR MISSION</div>
                    <TextGradientScroll
                        text={`Vidyut Mitra empowers MESCOM household consumers with AI-driven energy insights.\nWe break down complex electricity billing through voice-first interfaces in Kannada.\nOur mission is to help every household understand their energy consumption, discover applicable subsidies, and make informed decisions about solar adoption.\nThis is not just a bill analyzer; it's a movement towards energy awareness and affordability in India.`}
                    />
                </section>

                {/* ── How It Works Section ─────────────────────── */}
                <HowItWorksSection />

                {/* ── Tech Specs / Display Cards Section ───────── */}
                <section id="workers" className="tech-section">
                    {/* Background elements */}
                    <div className="tech-bg-elements">
                        <div className="tech-bg-gradient" />
                        <div className="tech-bg-pattern" />
                    </div>
                    <div className="tech-inner">
                        <div className="tech-left">
                            <span className="tech-badge">TECHNOLOGY</span>
                            <h2 className="tech-title">
                                Powered by <span className="text-saffron">Gemini AI</span><br />& Real Data
                            </h2>
                            <p className="tech-desc">
                                Advanced multimodal AI for bill analysis, integrated with live KERC tariff data for accurate recalculation and subsidy matching.
                            </p>

                            {/* Feature pills */}
                            <div className="tech-features">
                                <div className="tech-feature-pill">
                                    <div className="tech-pill-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                    </div>
                                    <div>
                                        <div className="tech-pill-title">Privacy-First</div>
                                        <div className="tech-pill-desc">DPDPA-compliant: Bill images never stored</div>
                                    </div>
                                </div>
                                <div className="tech-feature-pill">
                                    <div className="tech-pill-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </div>
                                    <div>
                                        <div className="tech-pill-title">Multi-Language</div>
                                        <div className="tech-pill-desc">English & Kannada voice interfaces</div>
                                    </div>
                                </div>
                                <div className="tech-feature-pill">
                                    <div className="tech-pill-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                                    </div>
                                    <div>
                                        <div className="tech-pill-title">Real-Time</div>
                                        <div className="tech-pill-desc">Live tariff data updates from KERC</div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="tech-stats">
                                <div className="tech-stat-card">
                                    <div className="stat-number stat-saffron">5M+</div>
                                    <div className="stat-label">MESCOM USERS</div>
                                </div>
                                <div className="tech-stat-divider" />
                                <div className="tech-stat-card">
                                    <div className="stat-number stat-green">₹2,500</div>
                                    <div className="stat-label">AVG SAVINGS</div>
                                </div>
                                <div className="tech-stat-divider" />
                                <div className="tech-stat-card">
                                    <div className="stat-number stat-saffron">2</div>
                                    <div className="stat-label">LANGUAGES</div>
                                </div>
                            </div>
                        </div>
                        <div className="tech-right">
                            <DisplayCards />
                        </div>
                    </div>
                </section>

                {/* ── Video & Audio Section ────────────────────── */}
                <ProductDemoSection />

            </main>

            {/* ── Footer — Modern Minimal ─────────────────────── */}
            <footer className="landing-footer">
                <div className="footer-main">
                    <div className="footer-container">
                        <div className="footer-grid">
                            {/* Brand */}
                            <div className="footer-brand">
                                <span className="footer-logo-text">VIDYUT MITRA</span>
                                <p className="footer-tagline">Energy Advisor for Every Home</p>
                                <p className="footer-brand-desc">
                                    AI-powered energy advisor helping MESCOM households analyze bills, discover subsidies, and calculate solar ROI through WhatsApp. Supporting Kannada & English speakers.
                                </p>
                            </div>

                            {/* Platform links */}
                            <div className="footer-col">
                                <h4>Platform</h4>
                                <ul>
                                    <li><a href="#platform">How It Works</a></li>
                                    <li><a href="#workers">For Workers</a></li>
                                    <li><Link href="/verify">Verify Certificate</Link></li>
                                    <li><Link href="/dashboard">Admin Dashboard</Link></li>
                                </ul>
                            </div>

                            {/* Resources */}
                            <div className="footer-col">
                                <h4>Resources</h4>
                                <ul>
                                    <li><a href="#about">About the Mission</a></li>
                                    <li><a href="https://github.com/Paetrix2026/Straw-Hats" target="_blank" rel="noopener noreferrer">GitHub Repo</a></li>
                                    <li><a href="https://aws.amazon.com" target="_blank" rel="noopener noreferrer">Powered by AWS</a></li>
                                </ul>
                            </div>

                            {/* Connect */}
                            <div className="footer-col">
                                <h4>Connect</h4>
                                <ul>
                                    <li>
                                        <a href="https://api.whatsapp.com/send?phone=15551445754&text=Hi" target="_blank" rel="noopener noreferrer" className="footer-link-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                            +1 (555) 144-5754
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://github.com/Paetrix2026/Straw-Hats" target="_blank" rel="noopener noreferrer" className="footer-link-icon">
                                            <GithubIcon />
                                            GitHub
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Bottom bar */}
                        <div className="footer-bottom">
                            <p>&copy; {new Date().getFullYear()} Vidyut Mitra. Built for Digital Bharat.</p>
                            <div className="footer-bottom-links">
                                <a href="#platform">Platform</a>
                                <span className="footer-dot"></span>
                                <a href="#about">About</a>
                                <span className="footer-dot"></span>
                                <a href="https://github.com/Paetrix2026/Straw-Hats" target="_blank" rel="noopener noreferrer">Source</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
            </div>
        </div>
    );
}
