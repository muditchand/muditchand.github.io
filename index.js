// PageTransitioner Class for Smooth Page Transitions
class PageTransitioner {
    constructor() {
        this.currentPage = document.getElementById('current-page');
        this.nextPage = document.getElementById('next-page');
        this.cache = document.getElementById('page-cache');
        this.transitioning = false;

        this.init();
    }

    init() {
        this.preloadPages(); // Preload all pages
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
            }, 800); // Adjust to CSS transition duration
        });
    }
}

// Initialize PageTransitioner
document.addEventListener('DOMContentLoaded', () => {
    new PageTransitioner();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    if (!transitioner.transitioning) {
        transitioner.loadPage(window.location.pathname);
    }
});

// Click Transition Handler for Page Transitions
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

// Array of letters to be placed
const letters = ['A', 'R', 'T', 'I', 'S', 'D', 'E', 'A2', 'D2'];

// Random position function for letters
function getRandomPosition(element) {
    const container = document.querySelector('.letters-container');
    const x = Math.random() * (container.offsetWidth - element.offsetWidth);
    const y = Math.random() * (container.offsetHeight - element.offsetHeight);
    return [x, y];
}

// Check for overlapping positions
function checkOverlap(x, y, existingPositions) {
    const buffer = 80;
    return existingPositions.some(pos => {
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        return distance < buffer;
    });
}

// Place letters with collision detection
window.addEventListener('load', () => {
    const container = document.getElementById('letters');
    const existingPositions = [];

    letters.forEach(letter => {
        const letterDiv = document.createElement('div');
        letterDiv.className = 'letter';
        letterDiv.innerHTML = `<img src="home_Image/${letter}.png" alt="${letter}" style="width: 100%; height: 100%;">`;
        container.appendChild(letterDiv);

        let x, y;
        do {
            [x, y] = getRandomPosition(letterDiv);
        } while (checkOverlap(x, y, existingPositions));

        existingPositions.push({ x, y });
        letterDiv.style.left = `${x}px`;
        letterDiv.style.top = `${y}px`;
        
        const rotation = Math.random() * 30 - 15;
        letterDiv.style.transform = `rotate(${rotation}deg)`;
    });
});

// Make letters draggable (optional feature)
document.querySelectorAll('.letter').forEach(letter => {
    letter.addEventListener('click', () => {
        console.log('Letter clicked:', letter.innerHTML);
    });
});

// Handle resizing and repositioning letters
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const letters = document.querySelectorAll('.letter');
        const existingPositions = [];

        letters.forEach(letter => {
            let x, y;
            do {
                [x, y] = getRandomPosition(letter);
            } while (checkOverlap(x, y, existingPositions));

            existingPositions.push({ x, y });
            letter.style.left = `${x}px`;
            letter.style.top = `${y}px`;
        });
    }, 250);
});
