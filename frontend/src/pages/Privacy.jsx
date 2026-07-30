import React from "react";
import { Link } from "react-router-dom";
import { Wallet, ArrowLeft } from "lucide-react";
import useSEO from "@/hooks/useSEO";

const H2 = ({ children }) => (
  <h2 className="font-heading text-xl font-semibold text-[#1C1917] mt-8 mb-2">{children}</h2>
);
const P = ({ children }) => (
  <p className="text-sm text-[#57534E] leading-relaxed mt-2">{children}</p>
);

export default function Privacy() {
  useSEO({
    title: "Privacy Policy | Apka Munim",
    description: "Apka Munim ki privacy policy — janiye hum aapka data kaise store, use aur protect karte hain.",
    path: "/privacy",
  });

  return (
    <div className="min-h-screen bg-[#F9F8F6] py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#2A4F4F] hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" /> Wapas Home
        </Link>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading text-xl font-bold text-[#1C1917]">Apka Munim</span>
        </div>

        <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Privacy Policy</h1>
        <p className="text-xs text-[#78716C] mt-1">Last updated: February 2026</p>

        <H2>1. Introduction</H2>
        <P>
          Apka Munim ("we", "us", "app") is a personal finance tracking application. This Privacy Policy explains
          what information we collect, how we use it, and the choices you have. By using the app you agree to this policy.
        </P>

        <H2>2. Information We Collect</H2>
        <P>We collect only what is necessary to provide the service:</P>
        <ul className="list-disc list-inside text-sm text-[#57534E] mt-2 space-y-1">
          <li><b>Account data:</b> name, email address, hashed password.</li>
          <li><b>Financial data you enter:</b> account names, balances, transactions, categories, notes, udhaar (loans), recurring rules, budgets. This data is entered by you and stored under your account.</li>
          <li><b>Ledger membership:</b> if you join or create a shared (family) ledger, your name and email are visible to other members of that ledger.</li>
          <li><b>Device / usage:</b> minimal browser cookies (session token) for authentication. We use PostHog for anonymous usage analytics.</li>
          <li><b>SMS text you paste:</b> only when you use the SMS Parser feature; the raw text is processed on our server (and optionally sent to Anthropic Claude via Emergent LLM Key) to extract transaction fields. We do NOT read your device SMS inbox — you paste the message manually.</li>
        </ul>

        <H2>3. What We Do NOT Collect</H2>
        <ul className="list-disc list-inside text-sm text-[#57534E] mt-2 space-y-1">
          <li>We do NOT collect bank account numbers, credit/debit card numbers, CVV, OTP, PIN, or netbanking credentials.</li>
          <li>We do NOT read your device SMS inbox, contacts, camera, microphone or location.</li>
          <li>We do NOT sell your data to advertisers.</li>
        </ul>

        <H2>4. How We Use Your Data</H2>
        <ul className="list-disc list-inside text-sm text-[#57534E] mt-2 space-y-1">
          <li>To provide and improve the service (dashboard, reports, AI insights).</li>
          <li>To generate personalized AI insights (via Anthropic Claude Sonnet).</li>
          <li>To send in-app budget breach notifications (only if you grant browser permission).</li>
        </ul>

        <H2>5. Third-Party Services</H2>
        <P>We use these processors:</P>
        <ul className="list-disc list-inside text-sm text-[#57534E] mt-2 space-y-1">
          <li><b>MongoDB Atlas / self-hosted MongoDB</b> — database storage.</li>
          <li><b>Anthropic (Claude Sonnet 4.5)</b> via Emergent LLM Key — used only when you click "Insights nikaalo" or paste an ambiguous SMS. Only the aggregated summary numbers or the pasted SMS text are shared.</li>
          <li><b>PostHog</b> — anonymous product analytics.</li>
        </ul>

        <H2>6. Data Retention & Deletion</H2>
        <P>
          You can export a full JSON copy of your data or permanently delete your account at any time from{" "}
          <Link to="/settings" className="text-[#2A4F4F] underline">Settings</Link>. Deleting your account removes
          all your accounts, transactions, udhaar, recurring rules, budgets and personal ledger from our database.
          If you are the sole owner of a shared ledger, that ledger is also deleted.
        </P>

        <H2>7. Security</H2>
        <P>
          Passwords are hashed with bcrypt. Sessions use httpOnly JWT cookies. Traffic is over HTTPS. Despite our
          best efforts no method of transmission over the internet is 100% secure — please use a strong password.
        </P>

        <H2>8. Children</H2>
        <P>Apka Munim is not directed at children under 13. If you believe a child has provided us data, contact us and we will delete it.</P>

        <H2>9. Changes to this Policy</H2>
        <P>We may update this policy from time to time. Material changes will be highlighted in-app.</P>

        <H2>10. Contact</H2>
        <P>Questions? Reach out at <a href="mailto:support@apkamunim.app" className="text-[#2A4F4F] underline">support@apkamunim.app</a></P>

        <div className="mt-12 pt-6 border-t border-[#E7E5DF] text-xs text-[#78716C]">
          Apka Munim is a personal tracking tool. It does <b>not</b> provide investment, tax, or legal advice.
          Always verify important financial decisions with a qualified professional.
        </div>
      </div>
    </div>
  );
}
