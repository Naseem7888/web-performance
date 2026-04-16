(function () {
    function enableLazyLoading() {
        document.querySelectorAll('img').forEach((image) => {
            if (!image.hasAttribute('loading')) {
                image.setAttribute('loading', 'lazy');
            }
        });
    }

    function revealContent() {
        const targets = document.querySelectorAll(
            'main section, .feature-card, .stat-card, .gallery-item, .about-section, .service-item, .testimonial-card, .faq-item'
        );

        if (!('IntersectionObserver' in window)) {
            targets.forEach((target) => target.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observerInstance.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12
        });

        targets.forEach((target) => {
            target.classList.add('reveal');
            observer.observe(target);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        enableLazyLoading();
        revealContent();
    });
})();