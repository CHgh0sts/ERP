import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

export const metadata: Metadata = {
  title: "ERP CMS",
  description: "Progiciel de gestion integre - Cartes electroniques / CMS",
};

const STRIP_EXT_ATTRS = `(function(){var A=['bis_skin_checked','bis_register','cz-shortcut-listen','data-new-gr-c-s-check-loaded','data-gr-ext-installed'];var P=['__processed_','bis_'];function s(e){if(!e||e.nodeType!==1||!e.getAttributeNames)return;var n=e.getAttributeNames();for(var i=0;i<n.length;i++){var x=n[i];if(A.indexOf(x)!==-1){e.removeAttribute(x);continue;}for(var j=0;j<P.length;j++){if(x.indexOf(P[j])===0){e.removeAttribute(x);break;}}}}function t(r){s(r);if(r&&r.querySelectorAll){var a=r.querySelectorAll('*');for(var i=0;i<a.length;i++)s(a[i]);}}try{t(document.documentElement);}catch(_){}try{new MutationObserver(function(m){for(var i=0;i<m.length;i++){var c=m[i];if(c.type==='attributes')s(c.target);else if(c.addedNodes)for(var k=0;k<c.addedNodes.length;k++)t(c.addedNodes[k]);}}).observe(document.documentElement,{attributes:true,subtree:true,childList:true});}catch(_){}})();`;

const APPLY_THEME = `(function(){try{var t=localStorage.getItem('erp-theme');if(t!=='light'&&t!=='dark'&&t!=='system')t='system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;if(d)e.classList.add('dark');else e.classList.remove('dark');e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: STRIP_EXT_ATTRS }} />
        <script dangerouslySetInnerHTML={{ __html: APPLY_THEME }} />
      </head>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
