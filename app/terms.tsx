import React from "react";

import PageContainer from "@/components/PageContainer";

export default function TermsOfService() {
  return (
    <PageContainer>
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="mb-4">Last updated: July 2024</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">1. Acceptance of Terms</h2>
      <p className="mb-4">By accessing or using the Web3Quest Platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Platform.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">2. User Responsibilities</h2>
      <p className="mb-4">You are responsible for your use of the Platform and for any content you provide, including compliance with applicable laws, rules, and regulations. You must not use the Platform for any unlawful or prohibited purpose.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">3. Account Registration</h2>
      <p className="mb-4">To access certain features, you may be required to register an account using your email, wallet, or social login. You agree to provide accurate and complete information and to keep your account secure.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">4. Content</h2>
      <p className="mb-4">You retain ownership of any content you submit, but you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute such content on the Platform. You are solely responsible for your content.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">5. Prohibited Activities</h2>
      <ul className="list-disc pl-6 mb-4">
        <li>Violating any applicable law or regulation</li>
        <li>Infringing intellectual property rights</li>
        <li>Uploading harmful or malicious content</li>
        <li>Attempting to gain unauthorized access to the Platform</li>
        <li>Engaging in fraudulent or deceptive practices</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">6. Disclaimers</h2>
      <p className="mb-4">The Platform is provided "as is" and "as available" without warranties of any kind. We do not guarantee the accuracy, completeness, or reliability of any content or services.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">7. Limitation of Liability</h2>
      <p className="mb-4">To the fullest extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">8. Governing Law</h2>
      <p className="mb-4">These Terms are governed by the laws of your jurisdiction, without regard to its conflict of law principles.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">9. Changes to Terms</h2>
      <p className="mb-4">We may update these Terms from time to time. Continued use of the Platform after changes constitutes acceptance of the new Terms.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">10. Contact</h2>
      <p>If you have any questions about these Terms, please contact us at support@zaloyal.vercel.app.</p>
    </PageContainer>
  );
} 