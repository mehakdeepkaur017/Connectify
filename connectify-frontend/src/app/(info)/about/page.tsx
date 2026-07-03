export default function AboutPage() {
  return (
    <div className="prose prose-stone dark:prose-invert max-w-none">
      <h1 className="text-4xl font-bold mb-6">About Connectify</h1>
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        Connectify is a modern social media platform designed to bring people closer together. 
        Whether you are sharing your daily moments, connecting with friends, or discovering new content, 
        Connectify provides a seamless and beautiful experience.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-muted-foreground">
            Our mission is to foster authentic connections in a digital world. We believe that social media 
            should be a tool for empowerment, creativity, and community building, rather than just mindless scrolling.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li><strong>Authenticity:</strong> Be yourself, unapologetically.</li>
            <li><strong>Privacy First:</strong> Your data belongs to you.</li>
            <li><strong>Community:</strong> Foster safe and inclusive spaces.</li>
            <li><strong>Innovation:</strong> Constantly evolving for a better experience.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
