// Mobile Navigation Icons Handler
document.addEventListener('DOMContentLoaded', function () {
    // Get all mobile nav icons
    const navIcons = document.querySelectorAll('.mobile-nav-icon');

    // Add click handlers
    navIcons.forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.preventDefault();

            // Remove active class from all icons
            navIcons.forEach(i => i.classList.remove('active'));

            // Add active class to clicked icon
            this.classList.add('active');

            // Get the target page
            const targetPage = this.getAttribute('data-page');

            if (targetPage) {
                // Hide all views
                document.querySelectorAll('.view').forEach(view => {
                    view.classList.remove('active');
                });

                // Show target view
                const targetView = document.getElementById(`${targetPage}-view`);
                if (targetView) {
                    targetView.classList.add('active');
                }

                // Update sidebar nav items (for desktop)
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('data-page') === targetPage) {
                        item.classList.add('active');
                    }
                });
            }
        });
    });
});
