import React, { useState } from 'react';
import { CuraTrackLogoIcon, CuraTrackBrandHeader } from '../CuraTrackLogo';

// 1. Splash Screen Component
export function SplashScreen({ onNext }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#003d9b] to-[#07006c] text-white select-none">
      <div className="flex-1 flex flex-col items-center justify-center text-center w-full px-4">
        <CuraTrackLogoIcon size={120} variant="splash" className="mb-4 animate-pulse" />
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-center w-full">CuraTrack</h1>
        <p className="text-blue-100 text-sm font-medium tracking-wide text-center w-full max-w-[320px] mx-auto leading-relaxed">
          Smart Health Management & Emergency Response Suite
        </p>
      </div>

      <div className="w-full flex flex-col items-center gap-4 pb-2">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-[#6ffbbe] text-[#002113] font-bold text-base shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>Get Started</span>
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

// 2. Welcome Screen Component
export function WelcomeScreen({ onNavigate }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 bg-[#f8f9ff]">
      <div className="w-full flex flex-col items-center pt-6 text-center px-2">
        <CuraTrackLogoIcon size={96} variant="blue" className="mb-6" />
        <h2 className="text-2xl font-extrabold text-[#0b1c30] mb-3 text-center w-full leading-snug">
          Your Health, Seamlessly Connected
        </h2>
        <p className="text-sm text-[#434654] leading-relaxed text-center w-full max-w-[320px] mx-auto font-medium">
          Track vitals, manage prescriptions, schedule appointments, and stay protected with 24/7 SOS response.
        </p>
      </div>


      <div className="w-full bg-[#e5eeff] p-5 rounded-3xl border border-[#c3c6d6]/40 flex flex-col gap-3 my-auto">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#003d9b] text-2xl shrink-0">verified_user</span>
          <span className="text-xs text-[#0b1c30] font-semibold">HIPAA Compliant Data Encryption</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#006c49] text-2xl shrink-0">sos</span>
          <span className="text-xs text-[#0b1c30] font-semibold">Instant Emergency Dispatch Integration</span>
        </div>
      </div>

      <div className="w-full flex flex-col gap-3 pb-4">
        <button
          onClick={() => onNavigate('login_screen_updated')}
          className="w-full py-3.5 rounded-2xl bg-[#003d9b] text-white font-bold text-base shadow-md hover:bg-[#0052cc] active:scale-95 transition-all"
        >
          Sign In
        </button>
        <button
          onClick={() => onNavigate('register_screen')}
          className="w-full py-3.5 rounded-2xl bg-[#ffffff] text-[#003d9b] border border-[#003d9b] font-bold text-base hover:bg-slate-50 active:scale-95 transition-all"
        >
          Create New Account
        </button>
      </div>
    </div>
  );
}

// 3. Login Screen Component
export function LoginScreen({ onNavigate, onLogin }) {
  const [email, setEmail] = useState('sarah.jenkins@curatrack.health');
  const [password, setPassword] = useState('••••••••••••');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#f8f9ff]">
      <div className="pt-6">
        <div className="mb-6">
          <CuraTrackBrandHeader showSubtitle={true} subtitleText="Care Anytime, Anywhere" iconSize={44} darkText={true} />
        </div>
        <h2 className="text-2xl font-bold text-[#0b1c30] mb-1">Welcome Back</h2>
        <p className="text-sm text-[#434654] mb-5">Sign in to manage your medical dashboard.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Email Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#737685] text-xl">mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-white border border-[#c3c6d6] rounded-xl text-sm font-medium text-[#0b1c30] focus:outline-none focus:border-[#003d9b] focus:ring-1 focus:ring-[#003d9b]"
                placeholder="name@domain.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-[#0b1c30]">Password</label>
              <button
                type="button"
                onClick={() => onNavigate('forgot_password_screen')}
                className="text-xs font-semibold text-[#003d9b] hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#737685] text-xl">lock</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-white border border-[#c3c6d6] rounded-xl text-sm font-medium text-[#0b1c30] focus:outline-none focus:border-[#003d9b] focus:ring-1 focus:ring-[#003d9b]"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#003d9b] text-white font-bold text-base shadow-md hover:bg-[#0052cc] active:scale-95 transition-all mt-2"
          >
            Sign In
          </button>
        </form>

        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-[#c3c6d6] w-full absolute"></div>
          <span className="bg-[#f8f9ff] px-3 text-xs font-semibold text-[#737685] relative">OR</span>
        </div>

        <button
          type="button"
          onClick={onLogin}
          className="w-full py-3 rounded-2xl bg-white border border-[#c3c6d6] text-[#0b1c30] font-semibold text-sm shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>
      </div>

      <div className="text-center pb-4">
        <p className="text-xs text-[#434654]">
          Don't have an account?{' '}
          <button onClick={() => onNavigate('register_screen')} className="font-bold text-[#003d9b] hover:underline">
            Register Here
          </button>
        </p>
      </div>
    </div>
  );
}

// 4. Register Screen Component
export function RegisterScreen({ onNavigate, onRegister }) {
  const [fullName, setFullName] = useState('Sarah Jenkins');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Patient');

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister();
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#f8f9ff]">
      <div className="pt-4">
        <div className="flex items-center gap-3 mb-4">
          <CuraTrackLogoIcon size={38} />
          <span className="text-2xl font-bold text-[#003d9b]">CuraTrack</span>
        </div>
        <h2 className="text-2xl font-bold text-[#0b1c30] mb-1">Create Account</h2>
        <p className="text-sm text-[#434654] mb-6">Join CuraTrack for integrated patient care.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border border-[#c3c6d6] rounded-xl text-sm font-medium text-[#0b1c30] focus:outline-none focus:border-[#003d9b]"
              placeholder="e.g. Sarah Jenkins"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border border-[#c3c6d6] rounded-xl text-sm font-medium text-[#0b1c30] focus:outline-none focus:border-[#003d9b]"
              placeholder="name@domain.com"
            />
          </div>


          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#003d9b] text-white font-bold text-base shadow-md hover:bg-[#0052cc] active:scale-95 transition-all mt-2"
          >
            Create Account
          </button>
        </form>

        <div className="relative my-3 flex items-center justify-center">
          <div className="border-t border-[#c3c6d6] w-full absolute"></div>
          <span className="bg-[#f8f9ff] px-3 text-xs font-semibold text-[#737685] relative">OR</span>
        </div>

        <button
          type="button"
          onClick={onRegister}
          className="w-full py-3 rounded-2xl bg-white border border-[#c3c6d6] text-[#0b1c30] font-semibold text-sm shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign up with Google</span>
        </button>
      </div>

      <div className="text-center pb-4">
        <p className="text-xs text-[#434654]">
          Already have an account?{' '}
          <button onClick={() => onNavigate('login_screen_updated')} className="font-bold text-[#003d9b] hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

// 5. Forgot Password Screen Component
export function ForgotPasswordScreen({ onNavigate }) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#f8f9ff]">
      <div className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <CuraTrackLogoIcon size={38} />
          <span className="text-2xl font-bold text-[#003d9b]">CuraTrack</span>
        </div>
        <h2 className="text-2xl font-bold text-[#0b1c30] mb-1">Reset Password</h2>
        <p className="text-sm text-[#434654] mb-6">
          Enter your registered email address to receive password recovery instructions.
        </p>


        {!submitted ? (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Registered Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-white border border-[#c3c6d6] rounded-xl text-sm font-medium text-[#0b1c30] focus:outline-none focus:border-[#003d9b]"
                placeholder="name@domain.com"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#003d9b] text-white font-bold text-base shadow-md hover:bg-[#0052cc] active:scale-95 transition-all"
            >
              Send Reset Code
            </button>
          </form>
        ) : (
          <div className="bg-[#6ffbbe]/20 border border-[#006c49]/30 rounded-2xl p-4 text-center">
            <span className="material-symbols-outlined text-4xl text-[#006c49] mb-2">mark_email_read</span>
            <h3 className="font-bold text-[#006c49] text-base mb-1">Reset Link Sent!</h3>
            <p className="text-xs text-[#0b1c30] mb-4">Please check your inbox for instructions to reset your password.</p>
            <button
              onClick={() => onNavigate('login_screen_updated')}
              className="px-6 py-2 rounded-xl bg-[#003d9b] text-white text-xs font-bold"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>

      <div className="text-center pb-4">
        <button onClick={() => onNavigate('login_screen_updated')} className="text-xs font-bold text-[#003d9b] hover:underline">
          Return to Login Screen
        </button>
      </div>
    </div>
  );
}
