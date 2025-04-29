// Document Ready
$(document).ready(function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    // Smooth scrolling for anchor links
    $('a[href*="#"]').on('click', function(e) {
        e.preventDefault();
        $('html, body').animate({
            scrollTop: $($(this).attr('href')).offset().top - 70
        }, 500, 'linear');
    });

    // Notification System
    class NotificationSystem {
        constructor() {
            this.notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            this.subscribers = JSON.parse(localStorage.getItem('subscribers') || '[]');
        }

        addSubscriber(email, clubs) {
            const subscriber = {
                id: Date.now(),
                email,
                clubs,
                joinDate: new Date().toISOString()
            };
            this.subscribers.push(subscriber);
            localStorage.setItem('subscribers', JSON.stringify(this.subscribers));
            this.notify(email, 'Welcome to VIT Clubs! You will now receive notifications for club events.');
        }

        addNotification(clubName, title, message, date) {
            const notification = {
                id: Date.now(),
                clubName,
                title,
                message,
                date,
                timestamp: new Date().toISOString()
            };
            this.notifications.push(notification);
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
            
            // Notify subscribers
            const clubSubscribers = this.subscribers.filter(sub => sub.clubs.includes(clubName));
            clubSubscribers.forEach(subscriber => {
                this.notify(subscriber.email, `${clubName}: ${title}`);
            });
        }

        notify(email, message) {
            // Show notification on the website
            const toast = `
                <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                        <strong class="me-auto">VIT Clubs</strong>
                        <small>Just now</small>
                        <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                    </div>
                    <div class="toast-body">${message}</div>
                </div>
            `;
            
            const toastContainer = document.getElementById('toastContainer');
            if (toastContainer) {
                toastContainer.insertAdjacentHTML('beforeend', toast);
                setTimeout(() => {
                    const toasts = toastContainer.getElementsByClassName('toast');
                    if (toasts.length > 0) {
                        toasts[0].remove();
                    }
                }, 5000);
            }
        }

        getNotifications(clubName = null) {
            if (clubName) {
                return this.notifications.filter(n => n.clubName === clubName);
            }
            return this.notifications;
        }
    }

    // Application System
    class ApplicationSystem {
        constructor() {
            this.applications = JSON.parse(localStorage.getItem('applications') || '[]');
            this.notificationSystem = new NotificationSystem();
        }

        submitApplication(data) {
            const application = {
                id: Date.now(),
                ...data,
                status: 'pending',
                submissionDate: new Date().toISOString()
            };
            
            this.applications.push(application);
            localStorage.setItem('applications', JSON.stringify(this.applications));
            
            // Subscribe to notifications
            this.notificationSystem.addSubscriber(data.email, [data.club]);
            
            // Notify about successful application
            this.notificationSystem.notify(data.email, `Application submitted successfully for ${data.club}!`);
            
            return application;
        }

        getApplications(status = null) {
            if (status) {
                return this.applications.filter(app => app.status === status);
            }
            return this.applications;
        }

        updateApplicationStatus(id, newStatus) {
            const application = this.applications.find(app => app.id === id);
            if (application) {
                application.status = newStatus;
                application.updateDate = new Date().toISOString();
                localStorage.setItem('applications', JSON.stringify(this.applications));
                
                // Notify applicant about status change
                this.notificationSystem.notify(
                    application.email,
                    `Your application for ${application.club} has been ${newStatus}`
                );
            }
        }
    }

    // Initialize systems
    const notificationSystem = new NotificationSystem();
    const applicationSystem = new ApplicationSystem();

    // Application form submission
    $('#applicationForm').on('submit', function(e) {
        e.preventDefault();
        const formData = {
            name: $('#name').val(),
            email: $('#email').val(),
            club: $('#club').val(),
            reason: $('#reason').val()
        };
        
        // Submit application
        const application = applicationSystem.submitApplication(formData);
        
        // Show success message
        showNotification('Application submitted successfully! You will receive notifications about club events.');
        this.reset();
    });

    // Login form handling
    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        const username = $('#username').val();
        const password = $('#password').val();
        
        // Simple client-side validation
        if (username && password) {
            // Store login status
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
            window.location.href = 'index.html';
        }
    });

    // Check login status
    function checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const username = localStorage.getItem('username');
        
        if (isLoggedIn && username) {
            $('.login-link').text(`Welcome, ${username}`);
            $('.login-link').attr('href', '#');
        }
    }

    // Notification system
    function showNotification(message) {
        const notification = $('<div>')
            .addClass('alert alert-success animate__animated animate__fadeIn')
            .text(message);
        
        $('#notificationArea').append(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Initialize
    checkLoginStatus();
});

// Animation on scroll
window.addEventListener('scroll', function() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(element => {
        const position = element.getBoundingClientRect();
        if(position.top < window.innerHeight) {
            element.classList.add('animate__fadeIn');
        }
    });
});

// Add toast container to body if it doesn't exist
if (!document.getElementById('toastContainer')) {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="toastContainer" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1050">
        </div>
    `);
}
