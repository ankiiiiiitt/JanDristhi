import React, { useState } from 'react';
import {
  ArrowRight, CheckCircle2, Cpu, Crosshair, Gauge, MapPinned,
  Menu, ShieldCheck, Sparkles, X, Zap
} from 'lucide-react';

const features = [
  { icon: Crosshair, title: 'AI Detection', text: 'Detect potholes, cracks and surface failures from road imagery.' },
  { icon: MapPinned, title: 'Live GIS Mapping', text: 'Place every verified report precisely on the city map.' },
  { icon: Gauge, title: 'Health Intelligence', text: 'Turn field signals into a clear Infrastructure Health Score.' },
  { icon: ShieldCheck, title: 'Repair Verification', text: 'Confirm that completed work has genuinely restored the road.' }
];

const steps = [
  ['01', 'Capture', 'Citizens and field teams capture a road image with live GPS.'],
  ['02', 'Understand', 'YOLOv8 identifies road damage and assigns a severity.'],
  ['03', 'Prioritize', 'The platform maps the issue and scores infrastructure health.'],
  ['04', 'Verify', 'Teams close the loop with visual repair verification.']
];

export default function LandingPage({ onLogin, onSignup }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#f7faf9] text-slate-950 overflow-x-hidden">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="max-w-7xl h-[76px] mx-auto px-5 sm:px-8 flex items-center justify-between">
          <button onClick={() => scrollTo('home')} className="flex items-center gap-2 text-left">
            <span className="grid place-items-center size-9 rounded-xl bg-[#0d4d41] text-emerald-200"><Sparkles size={18} /></span>
            <span className="font-extrabold tracking-tight text-xl">Jan<span className="text-emerald-700">Drishti</span></span>
          </button>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button onClick={() => scrollTo('home')} className="hover:text-emerald-700">Home</button>
            <button onClick={() => scrollTo('about')} className="hover:text-emerald-700">About</button>
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-emerald-700">How it works</button>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={onLogin} className="px-5 py-2.5 text-sm font-bold border border-emerald-900/40 rounded-xl hover:bg-emerald-50">Login</button>
            <button onClick={onSignup} className="px-5 py-2.5 text-sm font-bold text-white bg-[#145547] rounded-xl shadow-lg shadow-emerald-950/15 hover:bg-[#0d4339]">Sign Up</button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-slate-100" aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <div className="md:hidden border-t border-slate-100 bg-white px-5 py-4 space-y-3 text-sm font-semibold"><button onClick={() => scrollTo('home')} className="block">Home</button><button onClick={() => scrollTo('about')} className="block">About</button><button onClick={() => scrollTo('how-it-works')} className="block">How it works</button><div className="flex gap-3 pt-2"><button onClick={onLogin} className="flex-1 py-2.5 border rounded-xl">Login</button><button onClick={onSignup} className="flex-1 py-2.5 text-white bg-[#145547] rounded-xl">Sign Up</button></div></div>}
      </nav>

      <section id="home" className="relative min-h-[690px] pt-[76px] flex items-center bg-slate-950">
        <img src="/images/roads/road_longitudinal_d20.jpg" alt="Urban road monitored by JanDrishti" className="absolute inset-0 w-full h-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,19,17,.96)_0%,rgba(4,25,22,.83)_43%,rgba(3,19,17,.22)_100%)]" />
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(118,255,212,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(118,255,212,.16) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative max-w-7xl w-full mx-auto px-5 sm:px-8 py-20 text-white">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-7 rounded-full border border-emerald-300/25 bg-emerald-200/10 text-emerald-100 text-xs font-bold"><span className="size-2 rounded-full bg-emerald-300 animate-pulse" /> AI for safer urban infrastructure</div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.02] tracking-tight">Seeing Problems <span className="block text-emerald-300">Before They Become Failures</span></h1>
            <p className="mt-7 max-w-xl text-base sm:text-lg leading-relaxed text-slate-200">JanDrishti brings together AI vision, citizen insight and real-time location intelligence to find road damage early and help cities act with confidence.</p>
            <div className="mt-9 flex flex-wrap gap-3"><button onClick={onSignup} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-300 text-emerald-950 font-extrabold shadow-xl shadow-emerald-400/20 hover:bg-emerald-200">Get Started <ArrowRight size={18} /></button><button onClick={() => scrollTo('about')} className="px-6 py-3.5 rounded-xl border border-white/60 font-bold hover:bg-white/10">Learn More</button></div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-1 bg-white border-y border-slate-100"><div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{features.map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-3 lg:border-r lg:last:border-0 lg:border-slate-200"><Icon className="shrink-0 text-emerald-700" size={28} /><div><p className="font-bold text-sm">{title}</p><p className="text-xs text-slate-500 mt-0.5">{text}</p></div></div>)}</div></section>

      <section id="about" className="max-w-7xl mx-auto px-5 sm:px-8 py-24 grid lg:grid-cols-2 gap-14 items-center">
        <div><p className="text-emerald-700 uppercase tracking-[.16em] text-xs font-extrabold">About JanDrishti</p><h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-slate-900">A smarter way to maintain our roads.</h2><p className="mt-6 text-slate-600 leading-relaxed">Road damage is often discovered too late—after it disrupts travel, causes accidents or becomes expensive to repair. JanDrishti gives cities an early-warning system that turns every road image into a practical maintenance signal.</p><div className="mt-7 grid sm:grid-cols-2 gap-4">{['YOLOv8 damage recognition', 'GPS-tagged reporting', 'Infrastructure Health Score', 'Visual repair verification'].map(item => <div key={item} className="flex gap-2 text-sm font-semibold text-slate-700"><CheckCircle2 size={18} className="shrink-0 text-emerald-600" />{item}</div>)}</div></div>
        <div className="relative"><div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-100 to-blue-100 -rotate-2" /><img src="/images/roads/road_pothole_d00.jpg" alt="Detected road damage" className="relative aspect-[1.25] w-full object-cover rounded-[1.5rem] shadow-2xl" /><div className="absolute bottom-5 left-5 bg-slate-950/90 rounded-xl px-4 py-3 text-white border border-white/10"><p className="text-[10px] uppercase tracking-wider text-emerald-300">AI signal</p><p className="font-bold text-sm">Pothole detected · 94% confidence</p></div></div>
      </section>

      <section id="how-it-works" className="bg-[#0b1f1b] text-white py-24"><div className="max-w-7xl mx-auto px-5 sm:px-8"><div className="max-w-2xl"><p className="text-emerald-300 uppercase tracking-[.16em] text-xs font-extrabold">How it works</p><h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight">From a photo to a better road.</h2></div><div className="mt-12 grid md:grid-cols-4 gap-5">{steps.map(([number, title, text]) => <div key={number} className="rounded-2xl border border-emerald-100/15 bg-white/5 p-6 hover:-translate-y-1 transition-transform"><span className="text-emerald-300 text-sm font-black">{number}</span><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-300">{text}</p></div>)}</div></div></section>

      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-24"><div className="rounded-[2rem] bg-gradient-to-br from-[#e8f8f0] to-[#e9f4ff] border border-emerald-100 p-8 sm:p-12"><div className="grid lg:grid-cols-[1.2fr_.8fr] gap-10 items-center"><div><p className="text-emerald-700 uppercase tracking-[.16em] text-xs font-extrabold">Built for practical action</p><h2 className="mt-4 text-4xl font-black tracking-tight">Technology that makes every report count.</h2><p className="mt-5 max-w-xl text-slate-600">A connected stack for citizen reporting, computer vision, GIS intelligence and accountable field operations.</p></div><div className="grid grid-cols-2 gap-3">{['React + Vite', 'FastAPI', 'YOLOv8', 'MongoDB', 'Leaflet GIS', 'GPS telemetry'].map(tech => <div key={tech} className="rounded-xl border border-white bg-white/70 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"><Cpu size={16} className="inline mr-2 text-blue-600" />{tech}</div>)}</div></div></div></section>

      <footer className="bg-slate-950 text-slate-300"><div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between"><div><p className="font-extrabold text-xl text-white">Jan<span className="text-emerald-400">Drishti</span></p><p className="mt-2 text-sm text-slate-400">Smarter roads. Safer cities.</p></div><div className="flex gap-5 text-sm"><button onClick={() => scrollTo('about')} className="hover:text-white">About</button><button onClick={() => scrollTo('how-it-works')} className="hover:text-white">How it works</button><button onClick={onLogin} className="hover:text-white">Login</button></div><p className="text-xs text-slate-500">© 2026 JanDrishti</p></div></footer>
    </main>
  );
}
