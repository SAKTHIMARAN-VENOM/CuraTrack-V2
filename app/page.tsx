import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Doctors from "@/components/Doctors";
import Security from "@/components/Security";
import Footer from "@/components/Footer";

export default function LandingPage() {
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
