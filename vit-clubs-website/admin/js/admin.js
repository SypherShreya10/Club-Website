// Admin Dashboard Management
class AdminDashboard {
    constructor() {
        this.applicationSystem = applicationSystem;
        this.notificationSystem = notificationSystem;
        this.events = JSON.parse(localStorage.getItem('events') || '[]');
        this.members = JSON.parse(localStorage.getItem('members') || '[]');
        this.initializeEventListeners();
        this.updateDashboard();
    }

    initializeEventListeners() {
        // Applications
        $('.btn-group button').on('click', (e) => {
            const status = $(e.target).data('status');
            this.filterApplications(status);
        });

        // Events
        $('#saveEvent').on('click', () => this.saveEvent());
        
        // Notifications
        $('#sendNotification').on('click', () => this.sendNotification());

        // Tab changes
        $('a[data-bs-toggle="tab"]').on('shown.bs.tab', (e) => {
            const target = $(e.target).attr('href');
            this.updateTabContent(target);
        });
    }

    updateDashboard() {
        // Update statistics
        $('#totalApplications').text(this.applicationSystem.getApplications().length);
        $('#totalMembers').text(this.members.length);
        $('#upcomingEvents').text(this.getUpcomingEvents().length);

        // Update recent activity
        this.updateRecentActivity();

        // Update initial tab content
        this.updateTabContent('#dashboard');
    }

    updateRecentActivity() {
        const recentActivity = $('#recentActivity');
        recentActivity.empty();

        // Combine and sort all activities
        const activities = [
            ...this.applicationSystem.getApplications().map(app => ({
                type: 'application',
                date: new Date(app.submissionDate),
                text: `New application from ${app.name} for ${app.club}`
            })),
            ...this.events.map(event => ({
                type: 'event',
                date: new Date(event.datetime),
                text: `New event: ${event.title} by ${event.club}`
            })),
            ...this.notificationSystem.getNotifications().map(notif => ({
                type: 'notification',
                date: new Date(notif.timestamp),
                text: `${notif.clubName}: ${notif.title}`
            }))
        ];

        // Sort by date (newest first) and take last 10
        activities.sort((a, b) => b.date - a.date)
            .slice(0, 10)
            .forEach(activity => {
                const icon = this.getActivityIcon(activity.type);
                recentActivity.append(`
                    <div class="list-group-item">
                        <div class="d-flex w-100 justify-content-between">
                            <div>
                                <i class="${icon} me-2"></i>
                                ${activity.text}
                            </div>
                            <small class="text-muted">
                                ${activity.date.toLocaleDateString()}
                            </small>
                        </div>
                    </div>
                `);
            });
    }

    getActivityIcon(type) {
        switch(type) {
            case 'application': return 'bi bi-file-text';
            case 'event': return 'bi bi-calendar-event';
            case 'notification': return 'bi bi-bell';
            default: return 'bi bi-circle';
        }
    }

    filterApplications(status) {
        const applications = status === 'all' 
            ? this.applicationSystem.getApplications()
            : this.applicationSystem.getApplications(status);

        const tbody = $('#applicationsTable');
        tbody.empty();

        applications.forEach(app => {
            tbody.append(`
                <tr>
                    <td>${app.name}</td>
                    <td>${app.email}</td>
                    <td>${app.club}</td>
                    <td>
                        <span class="badge bg-${this.getStatusBadgeClass(app.status)}">
                            ${app.status}
                        </span>
                    </td>
                    <td>${new Date(app.submissionDate).toLocaleDateString()}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-success" onclick="adminDashboard.updateApplicationStatus(${app.id}, 'approved')">
                                <i class="bi bi-check"></i>
                            </button>
                            <button class="btn btn-danger" onclick="adminDashboard.updateApplicationStatus(${app.id}, 'rejected')">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        });
    }

    getStatusBadgeClass(status) {
        switch(status) {
            case 'pending': return 'warning';
            case 'approved': return 'success';
            case 'rejected': return 'danger';
            default: return 'secondary';
        }
    }

    updateApplicationStatus(id, status) {
        this.applicationSystem.updateApplicationStatus(id, status);
        if (status === 'approved') {
            const application = this.applicationSystem.getApplications().find(app => app.id === id);
            if (application) {
                this.addMember(application);
            }
        }
        this.filterApplications('all');
        this.updateDashboard();
    }

    addMember(application) {
        const member = {
            id: Date.now(),
            name: application.name,
            email: application.email,
            club: application.club,
            joinDate: new Date().toISOString(),
            status: 'active'
        };
        this.members.push(member);
        localStorage.setItem('members', JSON.stringify(this.members));
    }

    saveEvent() {
        const form = $('#addEventForm');
        const event = {
            id: Date.now(),
            title: form.find('[name="title"]').val(),
            club: form.find('[name="club"]').val(),
            datetime: form.find('[name="datetime"]').val(),
            description: form.find('[name="description"]').val()
        };

        this.events.push(event);
        localStorage.setItem('events', JSON.stringify(this.events));

        // Send notification about new event
        this.notificationSystem.addNotification(
            event.club,
            'New Event: ' + event.title,
            event.description,
            event.datetime
        );

        $('#addEventModal').modal('hide');
        form[0].reset();
        this.updateDashboard();
    }

    sendNotification() {
        const form = $('#addNotificationForm');
        const notification = {
            title: form.find('[name="title"]').val(),
            club: form.find('[name="club"]').val(),
            message: form.find('[name="message"]').val()
        };

        this.notificationSystem.addNotification(
            notification.club,
            notification.title,
            notification.message,
            new Date().toISOString()
        );

        $('#addNotificationModal').modal('hide');
        form[0].reset();
        this.updateDashboard();
    }

    getUpcomingEvents() {
        const now = new Date();
        return this.events.filter(event => new Date(event.datetime) > now);
    }

    updateTabContent(target) {
        switch(target) {
            case '#applications':
                this.filterApplications('all');
                break;
            case '#events':
                this.updateEvents();
                break;
            case '#members':
                this.updateMembers();
                break;
            case '#notifications':
                this.updateNotifications();
                break;
        }
    }

    updateEvents() {
        const eventsList = $('#eventsList');
        eventsList.empty();

        this.getUpcomingEvents()
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
            .forEach(event => {
                eventsList.append(`
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title">${event.title}</h5>
                                <span class="badge bg-primary">${event.club}</span>
                            </div>
                            <p class="card-text">${event.description}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">
                                    ${new Date(event.datetime).toLocaleString()}
                                </small>
                                <button class="btn btn-danger btn-sm" onclick="adminDashboard.deleteEvent(${event.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `);
            });
    }

    deleteEvent(id) {
        this.events = this.events.filter(event => event.id !== id);
        localStorage.setItem('events', JSON.stringify(this.events));
        this.updateDashboard();
    }

    updateMembers() {
        const tbody = $('#membersTable');
        tbody.empty();

        this.members.forEach(member => {
            tbody.append(`
                <tr>
                    <td>${member.name}</td>
                    <td>${member.club}</td>
                    <td>${new Date(member.joinDate).toLocaleDateString()}</td>
                    <td>
                        <span class="badge bg-${member.status === 'active' ? 'success' : 'danger'}">
                            ${member.status}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-${member.status === 'active' ? 'danger' : 'success'}"
                                onclick="adminDashboard.toggleMemberStatus(${member.id})">
                            ${member.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    toggleMemberStatus(id) {
        const member = this.members.find(m => m.id === id);
        if (member) {
            member.status = member.status === 'active' ? 'inactive' : 'active';
            localStorage.setItem('members', JSON.stringify(this.members));
            this.updateMembers();
        }
    }

    updateNotifications() {
        const notificationsList = $('#notificationsList');
        notificationsList.empty();

        this.notificationSystem.getNotifications()
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .forEach(notification => {
                notificationsList.append(`
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title">${notification.title}</h5>
                                <span class="badge bg-primary">${notification.clubName}</span>
                            </div>
                            <p class="card-text">${notification.message}</p>
                            <small class="text-muted">
                                ${new Date(notification.timestamp).toLocaleString()}
                            </small>
                        </div>
                    </div>
                `);
            });
    }
}

// Initialize admin dashboard
const adminDashboard = new AdminDashboard();
