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

export default function Terms() {
  useSEO({
    title: "Terms & Conditions | Apka Munim",
    description: "Apka Munim use karne ki terms and conditions padhein.",
    path: "/terms",
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

        <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Terms of Service</h1>
        <p className="text-xs text-[#78716C] mt-1">Last updated: February 2026</p>

        <H2>1. Acceptance</H2>
        <P>
          By registering for or using Apka Munim, you agree to these Terms of Service. If you do not agree, please do not use the app.
        </P>

        <H2>2. Service Description</H2>
        <P>
          Apka Munim is a personal finance tracking application that lets you record income, expenses, loans (udhaar), multiple accounts,
          budgets, recurring transactions and generate reports. All data is entered by you.
        </P>

        <H2>3. Not Financial Advice</H2>
        <P>
          <b>Important:</b> Apka Munim is a self-service tracking tool. The AI insights and reports are informational only and do not constitute
          investment, tax, legal, or financial advice. Always consult a qualified professional for material financial decisions.
        </P>

        <H2>4. Your Account</H2>
        <ul className="list-disc list-inside text-sm text-[#57534E] mt-2 space-y-1">
          <li>You must provide accurate registration information.</li>
          <li>You are responsible for maintaining the security of your password.</li>
          <li>You must be at least 13 years old to use the app.</li>
          <li>One account per person.</li>
        </ul>

        <H2>5. Acceptable Use</H2>
        <P>You agree NOT to:</P>
        <ul className="list-disc list-inside text-sm text-[#57534E] mt-2 space-y-1">
          <li>Use the app for any unlawful, fraudulent or harmful purpose.</li>
          <li>Attempt to gain unauthorized access to other users' data or the underlying servers.</li>
          <li>Reverse-engineer, scrape, or resell the service.</li>
          <li>Upload malware or spam through any field (notes, categories, etc.).</li>
        </ul>

        <H2>6. Shared Ledgers</H2>
        <P>
          When you join or create a shared (family) ledger, all members can view and add transactions in that ledger. You are responsible for
          only sharing invite codes with trusted people.
        </P>

        <H2>7. AI Features</H2>
        <P>
          AI-generated insights and SMS-parsed transaction fields may be incorrect. Always review before saving. We are not liable for decisions
          made based on AI output.
        </P>

        <H2>8. Availability</H2>
        <P>
          The service is provided "as-is" and "as available". We do not guarantee uninterrupted availability. Planned or unplanned downtime may occur.
        </P>

        <H2>9. Termination</H2>
        <P>
          You may delete your account at any time from Settings. We may suspend or terminate accounts that violate these Terms.
        </P>

        <H2>10. Limitation of Liability</H2>
        <P>
          To the fullest extent permitted by law, Apka Munim and its operators shall not be liable for any indirect, incidental, special or
          consequential damages arising from your use of the app, including data loss or financial loss.
        </P>

        <H2>11. Changes to Terms</H2>
        <P>We may update these Terms. Continued use after a change constitutes acceptance of the updated Terms.</P>

        <H2>12. Governing Law</H2>
        <P>These Terms are governed by the laws of India. Any disputes shall be resolved in the courts of your jurisdiction of residence.</P>

        <H2>13. Contact</H2>
        <P>Questions? Reach out at <a href="mailto:support@apkamunim.app" className="text-[#2A4F4F] underline">support@apkamunim.app</a></P>
      </div>
    </div>
  );
}
