export default function TermsPage() {
  return (
    <div className="prose prose-stone dark:prose-invert max-w-none">
      <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: July 3, 2026</p>
      
      <div className="space-y-6 text-muted-foreground leading-relaxed">
        <p>
          Welcome to Connectify! These Terms of Service outline the rules and regulations for the use of our platform.
          By accessing this application, we assume you accept these terms and conditions. Do not continue to use Connectify 
          if you do not agree to take all of the terms and conditions stated on this page.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. License</h2>
        <p>
          Unless otherwise stated, Connectify and/or its licensors own the intellectual property rights for all material 
          on Connectify. All intellectual property rights are reserved. You may access this from Connectify for your own 
          personal use subjected to restrictions set in these terms and conditions.
        </p>
        
        <p>You must not:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Republish material from Connectify</li>
          <li>Sell, rent or sub-license material from Connectify</li>
          <li>Reproduce, duplicate or copy material from Connectify</li>
          <li>Redistribute content from Connectify</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. User Content</h2>
        <p>
          Parts of this app offer an opportunity for users to post and exchange opinions and information. Connectify does 
          not filter, edit, publish or review Comments prior to their presence on the website. Comments do not reflect 
          the views and opinions of Connectify, its agents and/or affiliates. Comments reflect the views and opinions of 
          the person who post their views and opinions.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. Content Liability</h2>
        <p>
          We shall not be hold responsible for any content that appears on your Website. You agree to protect and defend us 
          against all claims that is rising on your Website. No link(s) should appear on any Website that may be interpreted 
          as libelous, obscene or criminal, or which infringes, otherwise violates, or advocates the infringement or other 
          violation of, any third party rights.
        </p>
      </div>
    </div>
  );
}
