// Mobile Menu Functionality
// Add this to your existing script.js or create a separate mobile-menu.js

function setupMobileMenu() {
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    document.body.appendChild(overlay);

    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');

    if (!menuBtn || !sidebar) return;

    // Toggle menu
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-active');
        overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('mobile-active') ? 'hidden' : '';
    });

    // Close menu when clicking overlay
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close menu when clicking a nav item
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Only close if on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // Close menu on window resize if it's open
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('mobile-active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// Call this function in your DOMContentLoaded event
// Add to existing DOMContentLoaded or create new one:
document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
});
