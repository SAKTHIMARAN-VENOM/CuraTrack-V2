"use client";

import Link from "next/link";
import Spline from "@splinetool/react-spline";

export default function Hero() {
  return (
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
}
