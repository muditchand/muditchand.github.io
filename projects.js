
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

document.addEventListener('mousemove', function(event) {
  const x = (event.clientX / window.innerWidth) * 100;
  const y = (event.clientY / window.innerHeight) * 100;
  console.log(`Cursor position: ${x}vw, ${y}vh`);
});