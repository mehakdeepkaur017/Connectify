export default function PrivacyPage() {
  return (
    <div className="prose prose-stone dark:prose-invert max-w-none">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: July 3, 2026</p>
      
      <div className="space-y-6 text-muted-foreground leading-relaxed">
        <p>
          At Connectify, your privacy is our priority. This Privacy Policy explains how we collect, 
          use, disclose, and safeguard your information when you use our application.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Information We Collect</h2>
        <p>
          We collect personal information that you voluntarily provide to us when you register on the app, 
          express an interest in obtaining information about us or our products and services, when you participate 
          in activities on the app, or otherwise when you contact us. This includes your name, email address, 
          username, and profile picture.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. How We Use Your Information</h2>
        <p>
          We use personal information collected via our app for a variety of business purposes described below. 
          We process your personal information for these purposes in reliance on our legitimate business interests, 
          in order to enter into or perform a contract with you, with your consent, and/or for compliance with our 
          legal obligations.
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>To facilitate account creation and logon process.</li>
          <li>To post testimonials.</li>
          <li>Request feedback.</li>
          <li>To manage user accounts.</li>
          <li>To send administrative information to you.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. Data Security</h2>
        <p>
          We have implemented appropriate technical and organizational security measures designed to protect 
          the security of any personal information we process. However, please also remember that we cannot 
          guarantee that the internet itself is 100% secure.
        </p>
      </div>
    </div>
  );
}
