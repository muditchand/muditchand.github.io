// PageTransitioner class to handle page transitions
class PageTransitioner {
    constructor() {
        this.currentPage = document.getElementById('current-page');
        this.nextPage = document.getElementById('next-page');
        this.cache = document.getElementById('page-cache');
        this.transitioning = false;
        this.init();
    }

    init() {
        this.preloadPages();
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && link.getAttribute('href').endsWith('.html')) {
                e.preventDefault();
                if (!this.transitioning) {
                    this.loadPage(link.getAttribute('href'));
                }
            }
        });
    }

    async preloadPages() {
        const links = document.querySelectorAll('a[href$=".html"]');
        for (const link of links) {
            const url = link.getAttribute('href');
            try {
                const response = await fetch(url);
                const html = await response.text();
                const div = document.createElement('div');
                div.innerHTML = html;

                const content = div.querySelector('main') || div.querySelector('.content');
                if (content) {
                    const cache = document.createElement('div');
                    cache.id = `cache-${url}`;
                    cache.innerHTML = content.innerHTML;
                    this.cache.appendChild(cache);
                }
            } catch (error) {
                console.error(`Failed to preload ${url}:`, error);
            }
        }
    }

    async loadPage(url) {
        this.transitioning = true;
        let content = this.cache.querySelector(`#cache-${url}`);

        if (!content) {
            try {
                const response = await fetch(url);
                const html = await response.text();
                const div = document.createElement('div');
                div.innerHTML = html;
                content = div.querySelector('main') || div.querySelector('.content');
            } catch (error) {
                console.error(`Failed to load ${url}:`, error);
                this.transitioning = false;
                return;
            }
        }

        this.nextPage.innerHTML = content.innerHTML;
        window.history.pushState({}, '', url);

        requestAnimationFrame(() => {
            this.currentPage.classList.add('prev');
            this.nextPage.classList.remove('next');
            this.nextPage.classList.add('current');

            setTimeout(() => {
                this.currentPage.innerHTML = this.nextPage.innerHTML;
                this.currentPage.classList.remove('prev');
                this.currentPage.classList.add('current');
                this.nextPage.classList.remove('current');
                this.nextPage.classList.add('next');
                this.nextPage.innerHTML = '';
                this.transitioning = false;
            }, 800);
        });
    }
}

// Initialize PageTransitioner on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.transitioner = new PageTransitioner();
});

// Browser Back/Forward Button Handler
window.addEventListener('popstate', () => {
    if (!window.transitioner.transitioning) {
        window.transitioner.loadPage(window.location.pathname);
    }
});

// Click Transition Handler for Page Links
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a.page-transition').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const nextPage = link.href;
            document.body.classList.add('transitioning-out');

            await new Promise(resolve => setTimeout(resolve, 500));
            window.location.href = nextPage;
        });
    });
});




    // Show the GIF on page load

   


    // Function to remove the GIF container from the DOM
    function removeGifContainer() {
        // Select the GIF container using querySelector
        const gifContainer = document.querySelector(".gif-container");
        
        if (gifContainer) {
            gifContainer.remove(); // Delete the entire div
            console.log("GIF container removed after 7000ms"); // Log message to console
        } else {
            console.log("GIF container not found."); // If no element found
        }
    }

    // gif removal
    window.onload = function() {
        console.log("Page loaded, starting timer for GIF removal...");
        setTimeout(removeGifContainer, 7000); // Call removeGifContainer after 7000ms
    };



//shifting the container for grid cards
    document.addEventListener('DOMContentLoaded', () => {
        const gridContainer = document.querySelector('.grid-container');
        const backArrow = document.querySelector('.back-arrow');
        const cards = document.querySelectorAll('.card');
    
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default navigation
                gridContainer.classList.add('slide-out');
                
                // Show the arrow with a slight delay
                setTimeout(() => {
                    backArrow.style.display = 'block';
                    setTimeout(() => {
                        backArrow.classList.add('visible');
                    }, 50);
                }, 300);
            });
        });
    
        // moving shifting the back arrow
        backArrow.addEventListener('click', () => {
            gridContainer.classList.remove('slide-out');
            backArrow.classList.remove('visible');
            
            // Hide the arrow completely after the fade out
            setTimeout(() => {
                backArrow.style.display = 'none';
            }, 300);
        });
    });
    


    