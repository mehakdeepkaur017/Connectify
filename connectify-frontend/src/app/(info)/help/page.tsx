export default function HelpPage() {
  return (
    <div className="prose prose-stone dark:prose-invert max-w-none">
      <h1 className="text-4xl font-bold mb-6">Help Center</h1>
      <p className="text-lg text-muted-foreground mb-12">
        How can we help you today? Browse our frequently asked questions below.
      </p>
      
      <div className="space-y-8">
        <div className="border border-border rounded-xl p-6 bg-card">
          <h3 className="text-xl font-semibold mb-3">How do I reset my password?</h3>
          <p className="text-muted-foreground">
            If you've forgotten your password, go to the login page and click on "Forgot Password". 
            Enter your email address, and we'll send you a link to securely reset your password.
          </p>
        </div>
        
        <div className="border border-border rounded-xl p-6 bg-card">
          <h3 className="text-xl font-semibold mb-3">How do I make my account private?</h3>
          <p className="text-muted-foreground">
            Go to your Profile, click on the Settings icon, navigate to the "Privacy" section, 
            and toggle the "Private Account" switch. Once enabled, only approved followers can see your posts.
          </p>
        </div>

        <div className="border border-border rounded-xl p-6 bg-card">
          <h3 className="text-xl font-semibold mb-3">How do I report inappropriate content?</h3>
          <p className="text-muted-foreground">
            Click on the three dots (...) in the top right corner of any post or comment, and select "Report". 
            Our moderation team will review the content within 24 hours.
          </p>
        </div>

        <div className="border border-border rounded-xl p-6 bg-card">
          <h3 className="text-xl font-semibold mb-3">Can I delete my account?</h3>
          <p className="text-muted-foreground">
            Yes, you can permanently delete your account by going to Settings &gt; Account &gt; Delete Account. 
            Please note that this action is irreversible and all your data will be permanently removed from our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
