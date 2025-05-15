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
                this.nextPage.querySelectorAll('.content > *').forEach(el => {
                    el.classList.add('fade-in');
                });
            }, 800);
        });
    }
}

// PDF viewer functionality
class PDFViewer {
    constructor() {
        this.pdfsContainer = document.querySelector('.pdf-collection-container');
        this.pdfGrid = document.querySelector('.pdf-grid');
        this.pdfViewerContainer = document.querySelector('.pdf-viewer-container');
        this.pdfCanvas = document.getElementById('pdf-canvas');
        this.ctx = this.pdfCanvas.getContext('2d');
        this.pageNum = document.getElementById('page-num');
        this.pageCount = document.getElementById('page-count');
        this.prevButton = document.getElementById('prev-page');
        this.nextButton = document.getElementById('next-page');
        this.closeButton = document.getElementById('close-pdf');
        
        this.currentPDF = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.pdfScale = 1.5;
        
        this.init();
    }
    
    init() {
        // Load PDF.js script
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
        
        // Load PDFs from directory
        this.loadPDFThumbnails();
        
        // Event listeners
        document.getElementById('1st-year-collection-card').addEventListener('click', () => {
            this.pdfsContainer.classList.add('active');
        });
        
        document.querySelector('.close-pdf-collection').addEventListener('click', () => {
            this.pdfsContainer.classList.remove('active');
        });
        
        this.prevButton.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderPage(this.currentPage);
            }
        });
        
        this.nextButton.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.renderPage(this.currentPage);
            }
        });
        
        this.closeButton.addEventListener('click', () => {
            this.closePDFViewer();
        });
    }
    
    async loadPDFThumbnails() {
        // For demonstration purposes, we'll use a predefined number of PDFs
        // In a real application, you might want to fetch a directory listing
        const pdfNames = {
            "pdf1.pdf": "RuTAG Logo Submission",
            "pdf2.pdf": "IISc Calander 2025",
            "pdf4.pdf": "Rubric: A stop-motion innovation",
            "pdf6.pdf": "Amul Chocolate: Stakeholder Analysis and BMC", 
            "pdf7.pdf": "Micro Project: 'Tangled Wires???'",
            "pdf8.pdf": "Creative Engineering Design: Chair",
            "pdf9.pdf": "Storyboarding",
            "pdf10.pdf": "Cigarette Packaging, Semiotics and Design",
        };
    
        for (const [filename, displayName] of Object.entries(pdfNames)) {
            const pdfPath = `pdfs/${filename}`;
            
            try {
                // Create PDF item
                const pdfItem = document.createElement('div');
                pdfItem.className = 'pdf-item';
                
                const thumbnail = document.createElement('div');
                thumbnail.className = 'pdf-thumbnail';
                
                const title = document.createElement('div');
                title.className = 'pdf-title';
                title.textContent = displayName;
                
                pdfItem.appendChild(thumbnail);
                pdfItem.appendChild(title);
                this.pdfGrid.appendChild(pdfItem);
                
                // Load PDF thumbnail
                const loadingTask = pdfjsLib.getDocument(pdfPath);
                loadingTask.promise.then(pdf => {
                    // Get the first page for the thumbnail
                    pdf.getPage(1).then(page => {
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        const viewport = page.getViewport({ scale: 0.5 });
                        
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        
                        // Render the PDF page on the canvas
                        page.render({
                            canvasContext: context,
                            viewport: viewport
                        }).promise.then(() => {
                            thumbnail.appendChild(canvas);
                        });
                    });
                    
                    // Add click event to open PDF
                    pdfItem.addEventListener('click', () => {
                        this.openPDF(pdfPath);
                    });
                }).catch(error => {
                    console.error(`Error loading PDF: ${pdfPath}`, error);
                    // Show a placeholder for PDFs that fail to load
                    thumbnail.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #f0f0f0; color: #666;">PDF ${i}</div>`;
                });
            } catch (error) {
                console.error(`Error setting up PDF item: ${pdfPath}`, error);
            }
        }
    }


    
    async openPDF(pdfPath) {
        try {
            // Load the PDF
            const loadingTask = pdfjsLib.getDocument(pdfPath);
            this.currentPDF = await loadingTask.promise;
            this.totalPages = this.currentPDF.numPages;
            this.currentPage = 1;
            
            // Update page count
            this.pageCount.textContent = this.totalPages;
            
            // Render the first page
            this.renderPage(this.currentPage);
            
            // Show the PDF viewer
            this.pdfViewerContainer.style.display = 'flex';
        } catch (error) {
            console.error('Error opening PDF:', error);
        }
    }
    
    async renderPage(pageNumber) {
        try {
            // Get the page
            const page = await this.currentPDF.getPage(pageNumber);
            
            // Set scale based on viewport
            const viewport = page.getViewport({ scale: this.pdfScale });
            this.pdfCanvas.width = viewport.width;
            this.pdfCanvas.height = viewport.height;
            
            // Render the page
            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Update current page display
            this.pageNum.textContent = pageNumber;
        } catch (error) {
            console.error('Error rendering page:', error);
        }
    }
    
    closePDFViewer() {
        this.pdfViewerContainer.style.display = 'none';
        this.currentPDF = null;
    }
}



// Initialize everything on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    // Remove GIF after loading
    setTimeout(function() {
        const gifContainer = document.querySelector(".gif-container");
        if (gifContainer) {
            gifContainer.remove();
        }
    }, 7000);

    // Initialize page transitioner
    window.transitioner = new PageTransitioner();
    
    // Initialize PDF viewer
    window.pdfViewer = new PDFViewer();
    
    // Initialize flipbook
    $("#flipbook").turn({
        width: 500,
        height: 400,
        autoCenter: true,
        duration: 1500,
        gradients: true,
        acceleration: true,
        display: 'double',
        elevation: 50,
        pages: 8,
        turnCorners: 'bl,br',
        easing: function(x, t, b, c, d) {
            return c*((t=t/d-1)*t*t + 1) + b;
        },
        when: {
            turning: function(event, page, view) {
                $(this).css({
                    'transition': 'all 0.5s cubic-bezier(0.645, 0.045, 0.355, 1.000)'
                });
                $(this).turn('center');
            },
            turned: function(event, page, view) {
                $(this).css({
                    'transition': 'none'
                });
                $(this).turn('center');
            },
            start: function(event, pageObject, corner) {
                if (corner) {
                    $(this).css({
                        'transform-origin': corner === 'bl' ? '0% 50%' : '100% 50%'
                    });
                }
            }
        }
    });

    $("#flipbook").addClass('smooth-movement');
    $("#flipbook").turn('page', 1);

    // Opening the book
    $('#sketchbook-card').click(function() {
        $('.grid-container').addClass('slide-out');
        $('.back-arrow').addClass('visible');
        
        setTimeout(() => {
            $('.sketchbook-container').addClass('active');
            setTimeout(() => {
                $("#flipbook").turn('center');
            }, 50);
            $('.close-book').addClass('visible');
        }, 300);
    });

    $('#1st-year-collection-card').click(function() {
        $('.grid-container').addClass('slide-out');
        $('.back-arrow').addClass('visible');
    
        setTimeout(() => {
            $('.pdf-collection-container').addClass('active');
        }, 300);
    });

    $('.back-arrow').click(function() {
        if ($('.sketchbook-container').hasClass('active')) {
            closeSketchbook();
        }
    
        if ($('.pdf-collection-container').hasClass('active')) {
            $('.pdf-collection-container').removeClass('active');
        }
    
        setTimeout(() => {
            $('.grid-container').removeClass('slide-out');
        }, 150);
    
        $(this).removeClass('visible');
    });
    
    $('.close-pdf-collection').click(function() {
        $('.pdf-collection-container').removeClass('active');
    
        setTimeout(() => {
            $('.grid-container').removeClass('slide-out');
            $('.back-arrow').removeClass('visible');
        }, 150);
    });
    
    

    // Fixed close button click handler
    $('.close-book').click(function() {
        closeSketchbook();
        // Add delay before sliding grid back
        setTimeout(() => {
            $('.grid-container').removeClass('slide-out');
        }, 150);
    });

    // Back arrow click handler
    $('.back-arrow').click(function() {
        // Check if sketchbook is active
        if ($('.sketchbook-container').hasClass('active')) {
            closeSketchbook();
        }
        
        // Check if PDF collection is active
        if ($('.pdf-collection-container').hasClass('active')) {
            $('.pdf-collection-container').removeClass('active');
        }
        
        setTimeout(() => {
            $('.grid-container').removeClass('slide-out');
        }, 150);
        $(this).removeClass('visible');
    });

    function closeSketchbook() {
        $('.close-book').removeClass('visible');
        
        // Add transition before returning to first page
        $("#flipbook").css({
            'transition': 'all 0.5s cubic-bezier(0.645, 0.045, 0.355, 1.000)'
        });
        
        $("#flipbook").turn('page', 1);
        
        setTimeout(() => {
            $('.sketchbook-container').removeClass('active');
            // Reset transition
            $("#flipbook").css({
                'transition': 'none'
            });
        }, 500);
    }
});

// Browser Back/Forward Button Handler
window.addEventListener('popstate', () => {
    if (!window.transitioner.transitioning) {
        window.transitioner.loadPage(window.location.pathname);
    }
});

window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

