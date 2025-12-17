document.addEventListener('DOMContentLoaded', async () => {

    // --- Global State ---
    let appData = {};

    // --- Elements ---
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navUl = document.querySelector('nav ul');
    const heroHeadline = document.getElementById('hero-headline');
    const heroSub = document.getElementById('hero-subheadline');
    const heroDate = document.getElementById('hero-date');
    const countdownContainer = document.getElementById('countdown');
    const heroCtaContainer = document.getElementById('hero-cta-container');
    const cfpSection = document.getElementById('cfp-section');
    const sponsorsContainer = document.getElementById('sponsors-container');
    const organizersContainer = document.getElementById('organizers-container');
    const faqContainer = document.getElementById('faq-container');
    const socialContainer = document.getElementById('social-buttons-container');
    const themeToggle = document.getElementById('theme-toggle');

    // Modal Elements
    const regModal = document.getElementById('reg-modal');
    const regModalClose = document.getElementById('reg-modal-close');
    const regForm = document.getElementById('reg-form');
    const regFormContainer = document.getElementById('reg-form-container');
    const regSuccess = document.getElementById('reg-success');
    const btnGoogle = document.getElementById('cal-google');
    const btnIcs = document.getElementById('cal-ics');
    const cocLink = document.getElementById('footer-coc-link');
    const cocModal = document.getElementById('coc-modal');
    const cocModalClose = document.getElementById('coc-modal-close');

    // --- Core Functions ---

    // 0. Theme Logic
    function initTheme() {
        const storedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (storedTheme === 'dark' || (!storedTheme && systemDark)) {
            document.body.classList.add('dark-mode');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.classList.add('light-mode');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (document.body.classList.contains('dark-mode')) {
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            } else {
                document.body.classList.remove('light-mode');
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        });
    }

    // Date helpers (ensure comparisons use event timezone)
    function normalizeDateString(dateStr) {
        return (dateStr || '').split('T')[0];
    }

    function getDateStringInTimeZone(date, timeZone) {
        try {
            return new Intl.DateTimeFormat('en-CA', {
                timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(date);
        } catch (e) {
            return date.toISOString().split('T')[0];
        }
    }

    function getCurrentPhase() {
        const eventTimezone = appData.config?.event_timezone || 'Pacific/Auckland';
        const todayStr = getDateStringInTimeZone(new Date(), eventTimezone);
        const cfpStartStr = normalizeDateString(appData.config?.cfp_start_date);
        const cfpEndStr = normalizeDateString(appData.config?.cfp_end_date);
        const eventDateStr = normalizeDateString(appData.config?.event_date);

        if (cfpStartStr && cfpEndStr && todayStr >= cfpStartStr && todayStr <= cfpEndStr) {
            return 'cfp';
        }

        if (eventDateStr && todayStr === eventDateStr) {
            return 'event';
        }

        if (appData.config?.registration_enabled) {
            return 'registration';
        }

        return 'always';
    }

    // 1. Fetch Data
    async function fetchData() {
        try {
            const response = await fetch('data.json');
            appData = await response.json();
            initApp();
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // 2. Initialize App
    function initApp() {
        initTheme();
        renderHeader();

        // Page Specific Init
        if (heroHeadline) initHomePage(); // We are on Home

        // Speakers Page
        if (document.getElementById('speakers-grid-container')) {
            renderSpeakers();
        }

        // Schedule Page
        if (document.getElementById('schedule-container')) {
            initSchedulePage();
        }

        // Render Socials (Global)
        renderSocials();
    }

    function renderSocials() {
        if (!socialContainer || !appData.config.socials) return;

        const icons = {
            linkedin: 'fab fa-linkedin-in',
            github: 'fab fa-github',
            twitch: 'fab fa-twitch',
            youtube: 'fab fa-youtube',
            twitter: 'fab fa-twitter',
            facebook: 'fab fa-facebook',
            meetup: 'fab fa-meetup',
            discord: 'fab fa-discord'
        };

        const html = Object.keys(appData.config.socials).map(key => {
            const url = appData.config.socials[key];
            const icon = icons[key] || 'fas fa-link';
            return `<a href="${url}" target="_blank" class="social-btn" title="${key}"><i class="${icon}"></i></a>`;
        }).join('');

        socialContainer.innerHTML = html;
    }


    // 3. Navigation
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent immediate bubbling to document
            navUl.classList.toggle('is-open');
            // We rely on CSS for the transform now
            // Allow manual override clear just in case
            navUl.style.transform = '';
        });

        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            const isClickInsideMenu = navUl.contains(event.target);
            const isClickOnBtn = mobileMenuBtn.contains(event.target);

            if (navUl.classList.contains('is-open') && !isClickInsideMenu && !isClickOnBtn) {
                navUl.classList.remove('is-open');
            }
        });
    }

    // --- Render Functions ---

    function renderSpeakers() {
        const container = document.getElementById('speakers-grid-container');
        if (!container || !appData.speakers) return;

        container.innerHTML = appData.speakers.map(speaker => `
            <div class="speaker-card-full">
                <div class="speaker-img-wrapper">
                    <img src="${speaker.profilePicture}" alt="${speaker.fullName}" loading="lazy">
                </div>
                <div class="speaker-info">
                    <div class="speaker-name">${speaker.fullName}</div>
                    <div class="speaker-title">${speaker.tagLine}</div>
                    <div class="speaker-bio">${speaker.bio}</div>
                </div>
            </div>
        `).join('');
    }

    function initSchedulePage() {
        const timezoneSelect = document.getElementById('filter-timezone');
        const customTimezoneSelect = document.getElementById('custom-timezone');
        const trackSelect = document.getElementById('filter-track');

        // Populate custom timezone dropdown with common timezones
        if (customTimezoneSelect) {
            const commonTimezones = [
                { value: 'America/New_York', label: 'Eastern Time (ET)' },
                { value: 'America/Chicago', label: 'Central Time (CT)' },
                { value: 'America/Denver', label: 'Mountain Time (MT)' },
                { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                { value: 'America/Toronto', label: 'Toronto' },
                { value: 'America/Vancouver', label: 'Vancouver' },
                { value: 'Europe/London', label: 'London (GMT)' },
                { value: 'Europe/Paris', label: 'Paris (CET)' },
                { value: 'Europe/Berlin', label: 'Berlin (CET)' },
                { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
                { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
                { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
                { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
                { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
                { value: 'Australia/Melbourne', label: 'Melbourne (AEDT)' },
                { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
                { value: 'Pacific/Auckland', label: 'Auckland (NZT)' },
                { value: 'Pacific/Honolulu', label: 'Honolulu (HST)' }
            ];

            commonTimezones.forEach(tz => {
                const option = document.createElement('option');
                option.value = tz.value;
                option.textContent = tz.label;
                customTimezoneSelect.appendChild(option);
            });
        }

        // Dynamically populate track filter based on actual schedule categories
        if (trackSelect && appData.schedule) {
            // Get unique categories from schedule
            const categories = [...new Set(appData.schedule.map(s => s.category).filter(Boolean))];

            // Clear existing options except "All Tracks"
            trackSelect.innerHTML = '<option value="all">All Tracks</option>';

            // Add options for each category
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.toLowerCase().replace(/[\/\s]/g, '');
                option.textContent = category;
                trackSelect.appendChild(option);
            });
        }

        // Handle timezone selection change
        if (timezoneSelect) {
            timezoneSelect.addEventListener('change', (e) => {
                if (customTimezoneSelect) {
                    customTimezoneSelect.style.display = e.target.value === 'custom' ? 'block' : 'none';
                }
                renderSchedule();
            });
        }

        // Handle custom timezone change
        if (customTimezoneSelect) {
            customTimezoneSelect.addEventListener('change', renderSchedule);
        }

        // Initial Render
        renderSchedule();

        // Listeners
        if (trackSelect) trackSelect.addEventListener('change', renderSchedule);
    }

    function renderSchedule() {
        const container = document.getElementById('schedule-container');
        if (!container || !appData.schedule) return;

        const timezonePref = document.getElementById('filter-timezone')?.value || 'local';
        const trackPref = document.getElementById('filter-track')?.value || 'all';

        // Helper function to normalize category names for comparison (removes slashes, spaces, etc.)
        function normalizeCategory(category) {
            return category.toLowerCase().replace(/[\/\s]/g, '');
        }

        // Filter
        let sessions = appData.schedule;
        if (trackPref !== 'all') {
            // trackPref is already normalized (from dropdown value), so compare directly
            sessions = sessions.filter(s => normalizeCategory(s.category) === trackPref);
        }

        if (sessions.length === 0) {
            container.innerHTML = '<p style="text-align: center; font-size: 1.2rem; margin-top: 2rem;">No sessions found for this active filter.</p>';
            return;
        }

        container.innerHTML = sessions.map(session => {
            // Parse dates - if no timezone specified, assume they're in event timezone
            const eventTimezone = 'Pacific/Auckland';

            // Parse dates - if no timezone, assume event timezone
            // Since JS Date parsing doesn't support timezone, we'll use a workaround
            const parseDate = (dateString) => {
                if (dateString.includes('Z') || dateString.match(/[+-]\d{2}:\d{2}$/)) {
                    return new Date(dateString);
                }

                // Parse components - assume they represent time in event timezone
                const [datePart, timePart] = dateString.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hour, minute, second = 0] = (timePart || '').split(':').map(Number);

                // Create date as if it's UTC, then we'll adjust using timezone formatting
                // We need to find the UTC time that, when formatted in event timezone, gives us the desired time
                // Use iterative approach: try different UTC times until formatting matches

                // Start with UTC assumption
                let testDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

                // Check what this represents in event timezone
                let formatted = testDate.toLocaleString('en-US', {
                    timeZone: eventTimezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                const [fmtDate, fmtTime] = formatted.split(', ');
                const [fmtMonth, fmtDay, fmtYear] = fmtDate.split('/').map(Number);
                const [fmtHour, fmtMinute] = fmtTime.split(':').map(Number);

                // Calculate offset needed
                // If formatted time doesn't match desired time, adjust
                const hourDiff = hour - fmtHour;
                const dayDiff = (day - fmtDay) * 24;
                const totalHours = hourDiff + dayDiff;

                // Adjust UTC date
                return new Date(testDate.getTime() - totalHours * 60 * 60 * 1000);
            };

            const startDate = parseDate(session.startsAt);
            const endDate = parseDate(session.endsAt);

            // Determine target timezone
            let targetTimezone;
            if (timezonePref === 'local') {
                targetTimezone = undefined; // Use local timezone
            } else if (timezonePref === 'custom') {
                targetTimezone = document.getElementById('custom-timezone')?.value || eventTimezone;
            } else {
                targetTimezone = eventTimezone;
            }

            // Format dates and times with timezone handling
            let timeStr;
            let dateStr = '';
            let timezoneAbbr = '';

            const timeOpts = { hour: 'numeric', minute: '2-digit', timeZone: targetTimezone };
            const dateOpts = { month: 'short', day: 'numeric', timeZone: targetTimezone };

            if (timezonePref === 'local') {
                // User's Local Time
                const startTime = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const endTime = endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const startDateLocal = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                const endDateLocal = endDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

                timeStr = `${startTime} - ${endTime}`;

                // Always show date, or if it differs between start and end
                if (startDateLocal !== endDateLocal) {
                    dateStr = `${startDateLocal} - ${endDateLocal}`;
                } else {
                    // Show date (always display it)
                    dateStr = startDateLocal;
                }
            } else if (timezonePref === 'custom') {
                // Custom Timezone
                try {
                    const startTime = startDate.toLocaleTimeString([], timeOpts);
                    const endTime = endDate.toLocaleTimeString([], timeOpts);
                    const startDateTz = startDate.toLocaleDateString([], dateOpts);
                    const endDateTz = endDate.toLocaleDateString([], dateOpts);

                    timeStr = `${startTime} - ${endTime}`;

                    // Always show date, or if it differs between start and end
                    if (startDateTz !== endDateTz) {
                        dateStr = `${startDateTz} - ${endDateTz}`;
                    } else {
                        dateStr = startDateTz;
                    }

                    const tzParts = Intl.DateTimeFormat('en', { timeZone: targetTimezone, timeZoneName: 'short' }).formatToParts(new Date());
                    const tzName = tzParts.find(part => part.type === 'timeZoneName')?.value || targetTimezone.split('/').pop();
                    timezoneAbbr = ` (${tzName})`;
                } catch (e) {
                    timeStr = `${startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
                    timezoneAbbr = '';
                }
            } else {
                // Event Time (Pacific/Auckland)
                try {
                    const startTime = startDate.toLocaleTimeString('en-NZ', timeOpts);
                    const endTime = endDate.toLocaleTimeString('en-NZ', timeOpts);
                    const startDateTz = startDate.toLocaleDateString('en-NZ', dateOpts);
                    const endDateTz = endDate.toLocaleDateString('en-NZ', dateOpts);

                    timeStr = `${startTime} - ${endTime} (NZT)`;

                    // Always show date, or if it differs between start and end
                    if (startDateTz !== endDateTz) {
                        dateStr = `${startDateTz} - ${endDateTz}`;
                    } else {
                        dateStr = startDateTz;
                    }
                } catch (e) {
                    timeStr = `${startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (Local)`;
                }
            }

            // Find Speaker
            const speakers = session.speakers.map(id => appData.speakers.find(s => s.id === id)).filter(Boolean);
            const speakerHtml = speakers.map(s => `
                <div class="session-speaker">
                    <img src="${s.profilePicture}" alt="${s.fullName}">
                    <span>${s.fullName}</span>
                </div>
            `).join('');

            return `
                <div class="session-card">
                    <div class="session-time">
                        ${dateStr ? `<div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--color-text-light);">${dateStr}</div>` : ''}
                        <div>${timeStr}${timezoneAbbr}</div>
                        <span style="font-size: 0.8rem; font-weight: normal; color: var(--color-text-light); margin-top:5px;">${timezonePref === 'local' ? 'Your Time' : timezonePref === 'custom' ? 'Custom Time' : 'Event Time'}</span>
                    </div>
                    <div class="session-details">
                        <div class="session-meta">
                            <span class="tag">${session.category}</span>
                            <span>${session.room}</span>
                        </div>
                        <div class="session-title">${session.title}</div>
                        <p style="margin-bottom: 1rem; color: var(--color-text-light);">${session.description}</p>
                        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                            ${speakerHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    // 4. Home Page Logic
    function initHomePage() {
        // Hero Content
        if (appData.config.hero_headline) heroHeadline.textContent = appData.config.hero_headline;
        if (appData.config.hero_subheadline) heroSub.textContent = appData.config.hero_subheadline;
        if (appData.config.hero_date_text) heroDate.textContent = appData.config.hero_date_text;

        // Smart Logic: Dates (use event timezone for comparisons)
        const eventTimezone = appData.config.event_timezone || 'Pacific/Auckland';
        const eventDate = new Date(appData.config.event_date);
        const eventDateStr = normalizeDateString(appData.config.event_date);
        const todayStr = getDateStringInTimeZone(new Date(), eventTimezone);
        const cfpStartStr = normalizeDateString(appData.config.cfp_start_date);
        const cfpEndStr = normalizeDateString(appData.config.cfp_end_date);
        const currentPhase = getCurrentPhase();

        // Smart CTA Logic (Priority: CFP > Watch Live > Register)
        if (heroCtaContainer) {
            heroCtaContainer.innerHTML = ''; // Clear existing

            if (currentPhase === 'cfp' && cfpStartStr && cfpEndStr) {
                // 1. CFP is Active
                const btn = document.createElement('a');
                btn.href = appData.config.cfp_link;
                btn.className = 'btn btn-primary';
                btn.textContent = 'Submit a Talk 🎤';
                btn.target = '_blank';
                heroCtaContainer.appendChild(btn);

                // User requested "only one submit a talk", so let's hide the separate section if we have the button in hero
                if (cfpSection) cfpSection.style.display = 'none';

                // Also hide countdown if CFP is active (to avoid "Event Started" confusion if dates overlap)
                if (countdownContainer) countdownContainer.style.display = 'none';

            } else if (currentPhase === 'event') {
                // Event Day (Watch Live)
                const btn = document.createElement('a');
                btn.href = appData.config.live_stream_link;
                btn.className = 'btn btn-primary';
                btn.textContent = 'Watch Live Now 🔴';
                btn.target = '_blank';
                heroCtaContainer.appendChild(btn);
                if (cfpSection) cfpSection.style.display = 'none';

            } else if (currentPhase === 'registration' && appData.config.registration_enabled) {
                // Registration Open
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary';
                btn.textContent = 'Register Now';
                btn.addEventListener('click', openModal);
                heroCtaContainer.appendChild(btn);
                if (cfpSection) cfpSection.style.display = 'none';

                // Only start countdown if NOT in CFP mode
                startCountdown(eventDate);
            } else {
                // Not CFP phase, ensure countdown is visible
                if (countdownContainer) countdownContainer.style.display = 'flex';

                const msg = document.createElement('span');
                msg.textContent = 'Registration coming soon / Event ended';
                heroCtaContainer.appendChild(msg);
                if (cfpSection) cfpSection.style.display = 'none';

                // Only start countdown if NOT in CFP mode
                startCountdown(eventDate);
            }
        }

        // Render Sponsors
        const sponsorsSection = document.getElementById('sponsors');
        if (appData.config.show_sponsors === false) {
            if (sponsorsSection) sponsorsSection.style.display = 'none';
        } else if (sponsorsContainer && appData.sponsors) {
            if (sponsorsSection) sponsorsSection.style.display = 'block';
            sponsorsContainer.innerHTML = appData.sponsors.map(sponsor => `
                <a href="${sponsor.url}" target="_blank" class="sponsor-card" title="${sponsor.name} (${sponsor.tier})">
                    <img src="${sponsor.logo}" alt="${sponsor.name}">
                </a>
            `).join('');
        }

        // Render Organizers
        if (organizersContainer && appData.organizers) {
            organizersContainer.innerHTML = appData.organizers.map(org => `
                <div class="organizer-card">
                    <img src="${org.image}" alt="${org.name}" class="organizer-img">
                    <h4 style="margin-bottom:0.25rem;">${org.name}</h4>
                    <p style="color:var(--color-text-light); font-size:0.9rem; margin-bottom:0.5rem;">${org.role}</p>
                    <a href="${org.linkedin}" target="_blank" style="color:var(--color-smile-orange);"><i class="fab fa-linkedin"></i></a>
                </div>
            `).join('');
        }

        // Render FAQ
        if (faqContainer && appData.faq) {
            // Determine current phase (uses event timezone)
            const currentPhase = getCurrentPhase();

            // Filter FAQs based on phase
            const filteredFaqs = appData.faq.filter(item => {
                const itemPhase = item.phase || 'always'; // default to 'always' if no phase specified
                return itemPhase === 'always' || itemPhase === currentPhase;
            });

            const faqHtml = filteredFaqs.map(item => `
                <div style="margin-bottom: 2rem; border-bottom: 1px solid var(--color-border); padding-bottom: 1rem;">
                    <h4 style="margin-bottom: 0.5rem; font-size: 1.1rem;">${item.question}</h4>
                    <p style="color: var(--color-text-light);">${item.answer}</p>
                </div>
            `).join('');

            // Append Ask Button if link exists
            let askBtnHtml = '';
            if (appData.config.faq_ask_link) {
                const label = appData.config.faq_ask_link.startsWith('mailto') ? 'Email the Organizers' : 'Submit a Question';
                askBtnHtml = `
                    <div style="text-align: center; margin-top: 2rem;">
                        <p style="margin-bottom: 1rem; color: var(--color-text-light);">Have a question not listed here?</p>
                        <a href="${appData.config.faq_ask_link}" class="btn btn-outline" target="_blank">${label}</a>
                    </div>
                `;
            }

            faqContainer.innerHTML = faqHtml + askBtnHtml;
        }
    }

    // 5. Registration Modal
    function openOverlay(modalEl) {
        if (modalEl) modalEl.classList.add('open');
    }

    function closeOverlay(modalEl) {
        if (modalEl) modalEl.classList.remove('open');
    }

    function openModal() {
        openOverlay(regModal);
    }

    function closeModal() {
        if (regModal) {
            closeOverlay(regModal);
            // Reset form logic if needed, but keeping state showing success is fine
        }
    }

    if (regModalClose) regModalClose.addEventListener('click', closeModal);
    /* Close on outside click */
    window.addEventListener('click', (e) => {
        if (e.target === regModal) closeModal();
        if (e.target === cocModal) closeOverlay(cocModal);
    });

    if (cocLink) {
        cocLink.addEventListener('click', (e) => {
            e.preventDefault();
            openOverlay(cocModal);
        });
    }

    if (cocModalClose) {
        cocModalClose.addEventListener('click', () => closeOverlay(cocModal));
    }

    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = regForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Registering...';
            submitBtn.disabled = true;

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const role = document.getElementById('role').value;

            const registrationData = {
                name: name,
                email: email,
                role: role,
                timestamp: new Date().toISOString()
            };

            try {
                // If API URL is set, send data
                if (appData.config.registration_api_url && appData.config.registration_api_url !== "YOUR_AWS_LAMBDA_URL_HERE") {
                    const response = await fetch(appData.config.registration_api_url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(registrationData)
                    });

                    if (!response.ok) {
                        throw new Error('Registration failed');
                    }
                } else {
                    // Simulate delay if no API URL configured (for demo)
                    console.warn('No API URL configured. Simulating success.');
                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                // Success UI
                regFormContainer.style.display = 'none';
                regSuccess.classList.add('visible');

                // Generate Calendar Links
                const event = {
                    title: appData.config.hero_headline,
                    description: appData.config.hero_subheadline,
                    start: appData.config.event_date,
                    duration: "8h"
                };
                generateCalendarLinks(event);

            } catch (error) {
                console.error('Registration Error:', error);
                alert('There was an issue registering. Please try again or contact support.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // 6. Calendar Helpers
    function generateCalendarLinks(event) {
        // Google Url
        // https://calendar.google.com/calendar/render?action=TEMPLATE&text=Example+Event&dates=20251015T090000Z/20251015T170000Z&details=Details
        // Real implementation would need library or robust string building for dates
        const gLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(event.description)}`;
        if (btnGoogle) btnGoogle.href = gLink;

        // ICS Blob
        if (btnIcs) {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${event.title}
DESCRIPTION:${event.description}
DTSTART;VALUE=DATE:${event.start.replace(/-/g, '')}
DTEND;VALUE=DATE:${event.start.replace(/-/g, '')}
END:VEVENT
END:VCALENDAR`;
            const blob = new Blob([icsContent], { type: 'text/calendar' });
            btnIcs.href = URL.createObjectURL(blob);
            btnIcs.download = 'aws-community-day.ics';
        }
    }

    // 7. Countdown Timer
    function startCountdown(targetDate) {
        if (!countdownContainer) return;

        function update() {
            const now = new Date();
            const diff = targetDate - now;

            if (diff <= 0) {
                countdownContainer.innerHTML = '<div style="font-size: 2rem; font-weight:bold;">Event Started!</div>';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            // const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            countdownContainer.innerHTML = `
                <div class="countdown-item"><span class="countdown-number">${days}</span><span class="countdown-label">Days</span></div>
                <div class="countdown-item"><span class="countdown-number">${hours}</span><span class="countdown-label">Hours</span></div>
                <div class="countdown-item"><span class="countdown-number">${minutes}</span><span class="countdown-label">Minutes</span></div>
            `;
        }

        update();
        setInterval(update, 60000); // Minute update is sufficient
    }

    function renderHeader() {
        const navUl = document.getElementById('nav-links');
        if (!navUl) return;

        // Base Home Link
        let navHtml = '<li><a href="index.html">Home</a></li>';

        // Conditional Links based on config and active page
        if (appData.config.show_speakers) {
            navHtml += '<li><a href="speakers.html">Speakers</a></li>';
        }
        if (appData.config.show_schedule) {
            navHtml += '<li><a href="schedule.html">Schedule</a></li>';
        }
        if (appData.config.show_sponsors) {
            // For consistency across pages
            const href = window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/') ? '#sponsors' : 'index.html#sponsors';
            navHtml += `<li><a href="${href}">Sponsors</a></li>`;
        }

        navUl.innerHTML = navHtml;

        // Highlight active nav
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = navUl.querySelectorAll('a');
        navLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            // Check based on filename preference
            if (linkHref === currentPath || (linkHref.startsWith('index.html') && currentPath === '')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Setup Header GitHub Button
        const headerGithubBtn = document.getElementById('header-github-btn');
        if (headerGithubBtn && appData.config.socials && appData.config.socials.github) {
            const ghUrl = appData.config.socials.github;
            headerGithubBtn.setAttribute('href', ghUrl);
            headerGithubBtn.style.display = 'inline-flex';
            console.log('GitHub Button Activated:', ghUrl);
        }
    }

    // --- Init ---
    fetchData();

});
