export default function Footer() {
  return (
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
            <span className="text-xl font-bold tracking-tighter text-primary">
              CuraTrack
            </span>
          </div>
          <p className="text-tertiary text-sm leading-relaxed mb-8">
            Empathetic precision in healthcare management. Unifying your world of
            wellness.
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
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Wearable Sync
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Telemedicine
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Encrypted Records
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Pricing
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-on-surface mb-6">Company</h4>
          <ul className="space-y-4 text-tertiary text-sm">
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                About Us
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Careers
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Press Kit
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Contact
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-on-surface mb-6">Legal</h4>
          <ul className="space-y-4 text-tertiary text-sm">
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Privacy Policy
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Terms of Service
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                HIPAA Compliance
              </a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors" href="#">
                Security
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-tertiary text-xs">
          © 2024 CuraTrack. All rights reserved.
        </p>
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
}
