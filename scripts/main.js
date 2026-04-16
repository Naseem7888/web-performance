(function () {
    function markActiveNavigation() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        document.querySelectorAll('nav a').forEach((link) => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    }

    document.addEventListener('DOMContentLoaded', markActiveNavigation);

    // Register Service Worker for offline support and caching
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('dist/sw.js')
                .then((registration) => {
                    console.log('✓ Service Worker registered:', registration);
                    
                    // Check for updates periodically
                    setInterval(() => {
                        registration.update();
                    }, 60000); // Check every minute
                })
                .catch((error) => {
                    console.warn('✗ Service Worker registration failed:', error);
                });
        });

        // Listen for service worker updates
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('✓ Service Worker updated');
        });
    }
})();