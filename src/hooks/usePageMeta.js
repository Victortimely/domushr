import { useEffect } from 'react';

/**
 * Custom hook that sets document title and meta description per page.
 * Since this is a React SPA (not Next.js), we dynamically update
 * the <title> and <meta name="description"> via DOM manipulation.
 *
 * @param {string} title - Page title (suffixed with " | DomusHR")
 * @param {string} description - Page meta description
 */
export function usePageMeta(title, description) {
  useEffect(() => {
    // Set document title
    const fullTitle = title ? `${title} | DomusHR` : 'DomusHR — Aplikasi Survey & Vetting Karyawan';
    document.title = fullTitle;

    // Set meta description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;
    }

    // Update OG title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = fullTitle;

    // Update OG description
    if (description) {
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.content = description;
    }

    // Cleanup: restore default on unmount
    return () => {
      document.title = 'DomusHR — Aplikasi Survey & Vetting Karyawan';
    };
  }, [title, description]);
}
