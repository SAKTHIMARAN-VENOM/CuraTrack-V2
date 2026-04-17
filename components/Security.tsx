export default function Security() {
  return (
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
              We employ bank-grade security protocols to ensure your sensitive medical
              information stays between you and your healthcare providers.
            </p>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined">enhanced_encryption</span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-lg">
                    End-to-End Encryption
                  </h4>
                  <p className="text-tertiary text-sm">
                    Data is encrypted at rest and in transit using AES-256 bit
                    encryption, the gold standard for global security.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined">verified_user</span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-lg">
                    HIPAA &amp; GDPR Compliance
                  </h4>
                  <p className="text-tertiary text-sm">
                    Fully compliant with international healthcare data regulations,
                    ensuring your rights are protected everywhere.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden w-24 h-24">
                  <span className="material-symbols-outlined text-6xl text-primary">
                    fingerprint
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-lg">
                    Multi-Factor Authentication
                  </h4>
                  <p className="text-tertiary text-sm">
                    Biometric login and 2FA options provide an extra layer of
                    protection against unauthorized access.
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
                    <span className="text-xs font-bold text-on-surface">
                      HIPAA COMPLIANT
                    </span>
                  </div>
                  <div className="px-4 py-2 bg-surface-container rounded-full flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    <span className="text-xs font-bold text-on-surface">ISO 27001</span>
                  </div>
                </div>
                <p className="mt-8 text-sm text-tertiary italic">
                  Audited quarterly by independent security firms to ensure maximum
                  uptime and data integrity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
