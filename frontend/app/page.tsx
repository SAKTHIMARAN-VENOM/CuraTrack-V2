"use client";

import React from "react";
import Link from "next/link";
import Spline from "@splinetool/react-spline";

// --- Sub-components ---

const Navbar = () => (
  <header className="fixed top-0 left-0 right-0 z-50 glass-nav flex justify-between items-center h-20 px-8 w-full font-['Manrope'] font-semibold">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white">
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          health_and_safety
        </span>
      </div>
      <span className="text-2xl font-bold tracking-tighter text-primary">
        CuraTrack
      </span>
    </div>
    <nav className="hidden md:flex items-center gap-10">
      <Link className="text-primary border-b-2 border-primary transition-all pb-1" href="#">
        Home
      </Link>
      <Link className="text-slate-400 hover:text-primary transition-all pb-1" href="#features">
        Features
      </Link>
      <Link className="text-slate-400 hover:text-primary transition-all pb-1" href="#doctors">
        Doctors
      </Link>
      <Link className="text-slate-400 hover:text-primary transition-all pb-1" href="#security">
        Security
      </Link>
    </nav>
    <div className="flex items-center gap-6">
<<<<<<< HEAD
=======
      <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-2 rounded-full ring-2 ring-transparent focus-within:ring-primary/20 transition-all">
        <span className="material-symbols-outlined text-outline text-sm mr-2">search</span>
        <input
          className="bg-transparent border-none focus:ring-0 p-0 text-sm w-48 placeholder:text-outline-variant outline-none"
          placeholder="Search records..."
          type="text"
        />
      </div>
>>>>>>> 927db80e1aef6181e7024aa64c7364312a81ec70
      <div className="flex items-center gap-4">
        <button className="material-symbols-outlined text-outline hover:text-primary transition-colors">
          notifications
        </button>
        <Link
          href="/login"
          className="bg-surface-container-high px-6 py-2.5 rounded-full text-on-surface font-semibold hover:bg-surface-container-highest transition-colors inline-block"
        >
          Login
        </Link>
      </div>
    </div>
  </header>
);

const Hero = () => (
  <section className="relative min-h-[921px] flex items-center px-8 lg:px-24 overflow-hidden">
    <div className="grid lg:grid-cols-2 gap-16 items-center w-full max-w-7xl mx-auto h-full">
      <div className="z-10 pt-20 lg:pt-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container rounded-full mb-6">
          <span
            className="material-symbols-outlined text-on-secondary-container text-sm"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          <span className="text-xs font-bold text-on-secondary-container tracking-wider uppercase">
            Next-Gen Patient Care
          </span>
        </div>
        <h1 className="font-headline text-6xl md:text-7xl font-extrabold tracking-tight text-on-surface mb-6 leading-[1.1]">
          Your Health, <span className="text-primary italic">Unified.</span>
        </h1>
        <p className="text-xl text-tertiary leading-relaxed mb-10 max-w-lg">
          Centralized health tracking for wearables, records, and telemedicine. Experience the precision of clinical data with the empathy of human-centric design.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/login"
            className="primary-gradient text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary/20 flex items-center gap-2 group transition-transform active:scale-95"
          >
            Get Started
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
          <button className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-8 py-4 rounded-xl font-bold text-lg hover:bg-surface-container-low transition-colors">
            View Demo
          </button>
        </div>
        <div className="mt-16 flex items-center gap-8">
          <div className="flex -space-x-4">
<<<<<<< HEAD
            <div className="w-12 h-12 rounded-full border-4 border-surface bg-slate-100 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-surface bg-slate-100 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-surface bg-slate-100 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>
=======
            <img
              alt="Doctor"
              className="w-12 h-12 rounded-full border-4 border-surface"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQvDb1HIygjTHH-Y8kDInthD1ed9W5aNvI6YpiHRnwP1oKzMiBrtXp5Z4YKDZOTE4FhpBEJyHpfYF-7xOuPuJP4IKwz-AF965Oh3XMeYC7lA-ZE8VL5ntqH0r9mKlKwRuEAm886GTwmGqwnPVdPuUfyt4hN6O6bA7ZU8KpcH737dgaj4DBHPTM_HPsoah2khqSZ6yJo2r6VAo7BTj3uSc2TWoc2ZZI7S6T1BjNcemZbBuRtm_ue2AlulaF5HV4EzB7yria8xSR2OZs"
            />
            <img
              alt="Patient"
              className="w-12 h-12 rounded-full border-4 border-surface"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrGTVyEL52qdzq_XsJxVfdq53bYC_LEk5aES3diiwlk_j8dAyEmJmYCbAyEFD0KZOVEDzoG8wklGQpsOAjAZPY-RGcYhS8YJnqiPuG9yTr_nfQj8h3BWxO0dVYgqqvovzhAA1xAOOdb1B2xe6wdy8jrKS1Q_yDEF3anF4hATbf-MG1fYI7X-eStga4_3vZQJ9-TGIw2BYjvEP63tBcivJhT66tLbmKjFY89NX-sdzIpeQiJPyR053H_x3B_XOyvJhaG86kDT8WFsQ7"
            />
            <img
              alt="Professional"
              className="w-12 h-12 rounded-full border-4 border-surface"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUWRfCftTcR76U60C-CtL_oGPCfJLIIviEfmJFcxag3ppQrJWNq6Bh5k925SwtB3e-mphheeizFFPQMzUNGPciyBi0MZn46YrvnSiD3UVvYT94k_IZQxS05Nx7JEaqPOa22AUhwwJSeNOe-SWqPwcZwQTM1U9kS7ZbzIhFfaibDoAfgbhT0SaI9o0sHswto6yohKGLweOA0HLbU8easg2e2pFZBJN7-MDEWfwrpjw7qpc3jQFXm9BFO6gRIxev2K15yJFxL3n9W8x2"
            />
>>>>>>> 927db80e1aef6181e7024aa64c7364312a81ec70
          </div>
          <div>
            <p className="text-on-surface font-bold">4.9/5 Rating</p>
            <p className="text-tertiary text-sm">Trusted by 20,000+ patients</p>
          </div>
        </div>
      </div>
      <div className="relative w-full h-[500px] lg:h-[800px] flex items-center justify-center">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 w-full h-full max-w-[600px] max-h-[600px]">
          <Spline scene="https://prod.spline.design/GsqIZvYkemIIKvGB/scene.splinecode" />
        </div>
      </div>
    </div>
  </section>
);

const Features = () => (
  <section className="px-8 lg:px-24 py-24 bg-surface-container-low" id="features">
    <div className="max-w-7xl mx-auto">
      <div className="mb-16 text-center max-w-2xl mx-auto">
        <h2 className="font-headline text-4xl font-extrabold text-on-surface mb-4 tracking-tight">
          Precision at every touchpoint.
        </h2>
        <p className="text-tertiary">
          Our platform integrates directly with your existing health ecosystem, bringing clinical clarity to your daily life.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface-container-lowest rounded-[2rem] p-10 border border-outline-variant/10 hover:shadow-xl transition-shadow group">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">monitoring</span>
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-4">Real-time Vitals</h3>
          <p className="text-tertiary leading-relaxed">
            Stream live data from your smartwatch. Our system detects anomalies in heart rate, oxygen saturation, and sleep cycles instantly.
          </p>
        </div>
        <div className="bg-surface-container-lowest rounded-[2rem] p-10 border border-outline-variant/10 hover:shadow-xl transition-shadow group">
          <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-8 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">shield_person</span>
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-4">Secure Health Records</h3>
          <p className="text-tertiary leading-relaxed">
            Your entire medical history, from lab results to radiology reports, organized and encrypted. Share with doctors at the tap of a button.
          </p>
        </div>
        <div className="bg-surface-container-lowest rounded-[2rem] p-10 border border-outline-variant/10 hover:shadow-xl transition-shadow group">
          <div className="w-14 h-14 bg-tertiary/10 rounded-2xl flex items-center justify-center text-tertiary mb-8 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">video_chat</span>
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-4">Telehealth Integration</h3>
          <p className="text-tertiary leading-relaxed">
            High-definition virtual visits integrated directly with your health profile. Doctors see your real-time data during the call for better diagnosis.
          </p>
        </div>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-primary-container text-white rounded-[2rem] p-10 flex flex-col md:flex-row items-center gap-10 overflow-hidden relative">
          <div className="z-10 w-full md:w-1/2">
            <h3 className="text-3xl font-bold mb-4">Universal Wearable Sync</h3>
            <p className="text-white/80 leading-relaxed mb-6">
              Connect Apple Health, Garmin, and Fitbit. View all your activity and sleep data in a single, beautiful dashboard.
            </p>
            <button className="bg-white text-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white/90 transition-colors">
              Sync Devices <span className="material-symbols-outlined">sync</span>
            </button>
          </div>
          <div className="w-full md:w-1/2 flex justify-center">
            <img
              alt="Smartwatch"
              className="w-48 object-contain drop-shadow-2xl rotate-12"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw-pgjH0bZgtEg59X7AQ3KC4KmZ3-KG2V8IxiaKngZu_iy4B8-5vpRElp74hkJ0ah95jDTei4c408WaUxZqjHzs1iWMKS3QvNLGNdyoPP6Mm5vvvR4PMtFdoTE5FRwUxSmWnFdPf7lsgAY_AfD0yDAdlh7ev7t_WKOQFxrFsil-r_L_PPXFDD0ov9NlO-9FIP1ahfFLCKzYUaK2ZqPtDEAeWU2t6hk0HXj3OZ_NMog6slPwGWyggMuKHAw84iYrbIZ_RXgGIQzZIXs"
            />
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-[2rem] p-10 border border-outline-variant/10 flex flex-col justify-center">
          <div className="w-12 h-12 bg-tertiary/10 rounded-2xl flex items-center justify-center text-tertiary mb-6">
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-3">Empathetic AI Insights</h3>
          <p className="text-tertiary leading-relaxed">
            Our AI interprets numbers into actionable wellness nudges. "You seem stressed, your HRV is lower than usual. Try a 5-minute breathing session."
          </p>
          <div className="mt-8 flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
            <div className="w-10 h-10 primary-gradient rounded-full flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
            </div>
            <span className="text-sm font-semibold text-on-surface">
              AI is analyzing your sleep patterns...
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Doctors = () => (
  <section className="px-8 lg:px-24 py-24 bg-surface" id="doctors">
    <div className="max-w-7xl mx-auto">
      <div className="mb-16">
        <h2 className="font-headline text-4xl font-extrabold text-on-surface mb-4 tracking-tight">
          World-class expertise.
        </h2>
        <p className="text-tertiary max-w-2xl">
          Connect with leading specialists who use CuraTrack to provide proactive, data-driven healthcare tailored to you.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            name: "Dr. Sarah Mitchell",
            role: "Cardiologist",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDauRZCtuVdQYia0S25_LvQ4depBG9oePHeqV6Dyi-H9T1hQZ_e7X8snLiDdrLJqiwYlYNEbIcFwn7ZGycufQvdtPJx6nsU4g7cmSeBC-mHksUmBQwuFC1ITmhSH7s8JLGXwu5-6wWsHndx1rYiWY4jmgQv5ymJTuyOJljDJY0VeKr46dbs5WS1Pc-wG7yKzkDcBI2y2KVklwuzqefNkkiWvyMRCzSItR6rpyQ__qZUz2dbk00-y_bKTxGvwncEBFddWSYviw4LpUlG",
          },
          {
            name: "Dr. James Wilson",
            role: "Internal Medicine",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDQvDb1HIygjTHH-Y8kDInthD1ed9W5aNvI6YpiHRnwP1oKzMiBrtXp5Z4YKDZOTE4FhpBEJyHpfYF-7xOuPuJP4IKwz-AF965Oh3XMeYC7lA-ZE8VL5ntqH0r9mKlKwRuEAm886GTwmGqwnPVdPuUfyt4hN6O6bA7ZU8KpcH737dgaj4DBHPTM_HPsoah2khqSZ6yJo2r6VAo7BTj3uSc2TWoc2ZZI7S6T1BjNcemZbBuRtm_ue2AlulaF5HV4EzB7yria8xSR2OZs",
          },
          {
            name: "Dr. Elena Rodriguez",
            role: "Neurologist",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDUWRfCftTcR76U60C-CtL_oGPCfJLIIviEfmJFcxag3ppQrJWNq6Bh5k925SwtB3e-mphheeizFFPQMzUNGPciyBi0MZn46YrvnSiD3UVvYT94k_IZQxS05Nx7JEaqPOa22AUhwwJSeNOe-SWqPwcZwQTM1U9kS7ZbzIhFfaibDoAfgbhT0SaI9o0sHswto6yohKGLweOA0HLbU8easg2e2pFZBJN7-MDEWfwrpjw7qpc3jQFXm9BFO6gRIxev2K15yJFxL3n9W8x2",
          },
        ].map((doctor) => (
          <div key={doctor.name} className="bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant/10 group">
<<<<<<< HEAD
            <div className="aspect-[4/5] overflow-hidden bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 transition-colors">
              <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
=======
            <div className="aspect-[4/5] overflow-hidden">
              <img
                alt={doctor.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                src={doctor.img}
              />
>>>>>>> 927db80e1aef6181e7024aa64c7364312a81ec70
            </div>
            <div className="p-6">
              <p className="text-primary font-bold text-xs tracking-widest uppercase mb-1">{doctor.role}</p>
              <h3 className="text-xl font-bold text-on-surface mb-4">{doctor.name}</h3>
              <a className="text-sm font-semibold text-secondary flex items-center gap-1 hover:gap-2 transition-all" href="#">
                View Profile <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
            </div>
          </div>
        ))}
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant/10 group">
          <div className="aspect-[4/5] overflow-hidden bg-primary/5 flex items-center justify-center p-8">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-primary/30 mb-4">add_circle</span>
              <p className="font-headline font-bold text-on-surface">500+ More Specialists</p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-primary font-bold text-xs tracking-widest uppercase mb-1">Network</p>
            <h3 className="text-xl font-bold text-on-surface mb-4">Global Access</h3>
            <a className="text-sm font-semibold text-secondary flex items-center gap-1 hover:gap-2 transition-all" href="#">
              Explore Directory <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Security = () => (
  <section className="px-8 lg:px-24 py-24 bg-surface-container-low" id="security">
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full mb-6">
            <span
              className="material-symbols-outlined text-primary text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock
            </span>
            <span className="text-xs font-bold text-primary tracking-wider uppercase">
              Privacy First Architecture
            </span>
          </div>
          <h2 className="font-headline text-4xl font-extrabold text-on-surface mb-6 tracking-tight">
            Your health data is a fortress.
          </h2>
          <p className="text-xl text-tertiary leading-relaxed mb-10">
            We employ bank-grade security protocols to ensure your sensitive medical information stays between you and your healthcare providers.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                <span className="material-symbols-outlined">enhanced_encryption</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface text-lg">End-to-End Encryption</h4>
                <p className="text-tertiary text-sm">
                  Data is encrypted at rest and in transit using AES-256 bit encryption, the gold standard for global security.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface text-lg">HIPAA & GDPR Compliance</h4>
                <p className="text-tertiary text-sm">
                  Fully compliant with international healthcare data regulations, ensuring your rights are protected everywhere.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden w-24 h-24">
                <span className="material-symbols-outlined text-6xl text-primary">fingerprint</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface text-lg">Multi-Factor Authentication</h4>
                <p className="text-tertiary text-sm">
                  Biometric login and 2FA options provide an extra layer of protection against unauthorized access.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="bg-surface-container-lowest rounded-[3rem] p-12 shadow-2xl border border-outline-variant/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <span className="material-symbols-outlined text-[10rem]">verified</span>
            </div>
            <div className="relative z-10 text-center">
              <div className="w-20 h-20 primary-gradient rounded-3xl mx-auto flex items-center justify-center text-white mb-8 shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-4xl">security</span>
              </div>
              <h3 className="text-2xl font-bold text-on-surface mb-8">Trust Badges</h3>
              <div className="flex flex-wrap justify-center gap-6">
                <div className="px-4 py-2 bg-surface-container rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-xs font-bold text-on-surface">SOC2 TYPE II</span>
                </div>
                <div className="px-4 py-2 bg-surface-container rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-xs font-bold text-on-surface">HIPAA COMPLIANT</span>
                </div>
                <div className="px-4 py-2 bg-surface-container rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-xs font-bold text-on-surface">ISO 27001</span>
                </div>
              </div>
              <p className="mt-8 text-sm text-tertiary italic">
                Audited quarterly by independent security firms to ensure maximum uptime and data integrity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-surface-container-lowest border-t border-outline-variant/10 py-20 px-8 lg:px-24">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
      <div className="col-span-1 md:col-span-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 primary-gradient rounded-lg flex items-center justify-center text-white">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              health_and_safety
            </span>
          </div>
          <span className="text-xl font-bold tracking-tighter text-primary">CuraTrack</span>
        </div>
        <p className="text-tertiary text-sm leading-relaxed mb-8">
          Empathetic precision in healthcare management. Unifying your world of wellness.
        </p>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-tertiary hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-lg">language</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-tertiary hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-lg">share</span>
          </div>
        </div>
      </div>
      <div>
        <h4 className="font-bold text-on-surface mb-6">Product</h4>
        <ul className="space-y-4 text-tertiary text-sm">
          <li><a className="hover:text-primary transition-colors" href="#">Wearable Sync</a></li>
          <li><a className="hover:text-primary transition-colors" href="#">Telemedicine</a></li>
          <li><a className="hover:text-primary transition-colors" href="#">Encrypted Records</a></li>
          <li><a className="hover:text-primary transition-colors" href="#">Pricing</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-on-surface mb-6">Company</h4>
        <ul className="space-y-4 text-tertiary text-sm">
          <li><a className="hover:text-primary transition-colors" href="#">About Us</a></li>
          <li><a className="hover:text-primary transition-colors" href="#">Careers</a></li>
          <li><a className="hover:text-primary transition-colors" href="#">Press Kit</a></li>
          <li><a className="hover:text-primary transition-colors" href="#">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-on-surface mb-6">Legal</h4>
        <ul className="space-y-4 text-tertiary text-sm">
          <li><a className="hover:text-primary transition-colors" href="#">Privacy Policy</a></li>
          <li><a className="hover:text-primary transition-colors" href="#">Terms of Service</a></li>
          <li><a className="hover:text-primary transition-colors" href="#">HIPAA Compliance</a></li>
          <li><a className="hover:text-primary transition-colors" href="#">Security</a></li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
      <p className="text-tertiary text-xs">© 2024 CuraTrack. All rights reserved.</p>
      <div className="flex gap-8 text-xs text-tertiary">
        <span>Designed with Empathetic Precision</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          Systems Operational
        </div>
      </div>
    </div>
  </footer>
);

// --- Main Page Component ---

export default function LandingPageBundle() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <Hero />
        <Features />
        <Doctors />
        <Security />

        {/* Proof Section */}
        <section className="py-24 px-8 lg:px-24 bg-surface">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-md">
              <h2 className="font-headline text-3xl font-extrabold text-on-surface mb-4">
                Empowering precision health for everyone.
              </h2>
              <p className="text-tertiary">
                Our partners include the world's leading medical institutions and wearable manufacturers.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale contrast-125">
              <span className="font-headline font-bold text-2xl tracking-tighter">MEDICORE</span>
              <span className="font-headline font-bold text-2xl tracking-tighter">HEALTHEON</span>
              <span className="font-headline font-bold text-2xl tracking-tighter">VITALIS</span>
              <span className="font-headline font-bold text-2xl tracking-tighter">PULSE</span>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-8 lg:px-24">
          <div className="max-w-7xl mx-auto primary-gradient rounded-[3rem] p-12 md:p-24 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            <div className="relative z-10">
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
                Ready to unify your health?
              </h2>
              <p className="text-white/80 text-xl max-w-2xl mx-auto mb-12">
                Join thousands of proactive individuals taking control of their medical journey today. Your first 30 days are on us.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button className="bg-white text-primary px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-white/10 transition-all w-full sm:w-auto active:scale-95">
                  Get Started for Free
                </button>
                <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all w-full sm:w-auto">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
