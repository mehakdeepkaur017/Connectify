import * as React from 'react';
import { Logo } from './logo';

export const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-background/50 backdrop-blur-xl">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8 xl:col-span-1">
            <Logo />
            <p className="text-sm leading-6 text-muted-foreground max-w-xs">
              A premium social experience to connect, share, and inspire the world.
            </p>
            <div className="flex space-x-6">
              {/* Social icons could go here */}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-foreground">Product</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <a href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">Features</a>
                  </li>
                  <li>
                    <a href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">Pricing</a>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-foreground">Support</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <a href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">Help Center</a>
                  </li>
                  <li>
                    <a href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">Privacy</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-muted-foreground">
            &copy; {new Date().getFullYear()} Connectify, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
