export default function Features() {
  return (
    <section className="px-8 lg:px-24 py-24 bg-surface-container-low" id="features">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <h2 className="font-headline text-4xl font-extrabold text-on-surface mb-4 tracking-tight">
            Precision at every touchpoint.
          </h2>
          <p className="text-tertiary">
            Our platform integrates directly with your existing health ecosystem,
            bringing clinical clarity to your daily life.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-surface-container-lowest rounded-[2rem] p-10 border border-outline-variant/10 hover:shadow-xl transition-shadow group">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">monitoring</span>
            </div>
            <h3 className="text-2xl font-bold text-on-surface mb-4">Real-time Vitals</h3>
            <p className="text-tertiary leading-relaxed">
              Stream live data from your smartwatch. Our system detects anomalies in
              heart rate, oxygen saturation, and sleep cycles instantly.
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-[2rem] p-10 border border-outline-variant/10 hover:shadow-xl transition-shadow group">
            <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-8 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">shield_person</span>
            </div>
            <h3 className="text-2xl font-bold text-on-surface mb-4">Secure Health Records</h3>
            <p className="text-tertiary leading-relaxed">
              Your entire medical history, from lab results to radiology reports,
              organized and encrypted. Share with doctors at the tap of a button.
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-[2rem] p-10 border border-outline-variant/10 hover:shadow-xl transition-shadow group">
            <div className="w-14 h-14 bg-tertiary/10 rounded-2xl flex items-center justify-center text-tertiary mb-8 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">video_chat</span>
            </div>
            <h3 className="text-2xl font-bold text-on-surface mb-4">Telehealth Integration</h3>
            <p className="text-tertiary leading-relaxed">
              High-definition virtual visits integrated directly with your health
              profile. Doctors see your real-time data during the call for better
              diagnosis.
            </p>
          </div>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-primary-container text-white rounded-[2rem] p-10 flex flex-col md:flex-row items-center gap-10 overflow-hidden relative">
            <div className="z-10 w-full md:w-1/2">
              <h3 className="text-3xl font-bold mb-4">Universal Wearable Sync</h3>
              <p className="text-white/80 leading-relaxed mb-6">
                Connect Apple Health, Garmin, and Fitbit. View all your activity and
                sleep data in a single, beautiful dashboard.
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
              Our AI interprets numbers into actionable wellness nudges. "You seem
              stressed, your HRV is lower than usual. Try a 5-minute breathing
              session."
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
}
