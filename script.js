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
        } catch (error) {
            console.error('Error fetching data.json:', error);
            const navUl = document.getElementById('nav-links');
            if (navUl) navUl.style.visibility = 'visible';
            return;
        }

        // Render header immediately after data.json — no need to wait for Sessionize
        initTheme();
        renderHeader();

        const sessionizeUrl = appData.config?.sessionize_api_url;
        if (sessionizeUrl) {
            try {
                const szResponse = await fetch(sessionizeUrl, { cache: 'no-store' });
                if (!szResponse.ok) throw new Error(`Sessionize responded ${szResponse.status}`);
                const raw = await szResponse.json();
                const { speakers, schedule } = mapSessionizeAll(raw);
                appData.speakers = speakers;
                appData.schedule = schedule;
            } catch (error) {
                console.error('Error fetching Sessionize data:', error);
                appData.speakers = [];
                appData.schedule = [];
            }
        } else {
            appData.speakers = appData.speakers || [];
            appData.schedule = appData.schedule || [];
        }

        initApp();
    }

    function mapSessionizeAll(raw) {
        const roomMap = {};
        if (Array.isArray(raw.rooms)) {
            raw.rooms.forEach(r => { roomMap[r.id] = r.name; });
        }

        const categoryMap = {};
        if (Array.isArray(raw.categories)) {
            raw.categories.forEach(cat => {
                if (Array.isArray(cat.items)) {
                    cat.items.forEach(item => { categoryMap[item.id] = item.name; });
                }
            });
        }

        const speakers = (raw.speakers || []).map(s => ({
            id: s.id,
            fullName: s.fullName || '',
            tagLine: s.tagLine || '',
            bio: s.bio || '',
            profilePicture: s.profilePicture || '',
        }));

        const keynoteIds = new Set((appData.config?.keynote_session_ids || []).map(String));

        const schedule = (raw.sessions || [])
            .filter(s => s.status === 'Accepted')
            .map(s => {
                const categoryNames = Array.isArray(s.categoryItems)
                    ? s.categoryItems.map(id => categoryMap[id]).filter(Boolean)
                    : [];
                const isKeynote = s.isPlenumSession === true
                    || categoryNames.some(n => n.toLowerCase() === 'keynote')
                    || keynoteIds.has(String(s.id));
                return {
                    id: String(s.id),
                    title: s.title || '',
                    description: s.description || '',
                    startsAt: s.startsAt || null,
                    endsAt: s.endsAt || null,
                    speakers: Array.isArray(s.speakers) ? s.speakers : [],
                    room: s.roomId != null ? (roomMap[s.roomId] || 'TBC') : 'TBC',
                    category: categoryNames.length > 0 ? categoryNames[0] : 'General',
                    isKeynote,
                };
            });

        // Sort: keynotes first, then chronologically; sessions with no time go last
        schedule.sort((a, b) => {
            if (a.isKeynote !== b.isKeynote) return a.isKeynote ? -1 : 1;
            if (!a.startsAt && !b.startsAt) return 0;
            if (!a.startsAt) return 1;
            if (!b.startsAt) return -1;
            return new Date(a.startsAt) - new Date(b.startsAt);
        });

        // Mark speakers who present a keynote
        const keynoteSpeakerIds = new Set(
            schedule.filter(s => s.isKeynote).flatMap(s => s.speakers)
        );
        speakers.forEach(sp => { sp.isKeynote = keynoteSpeakerIds.has(sp.id); });

        // Sort speakers: keynote speakers first, then original order
        speakers.sort((a, b) => (a.isKeynote === b.isKeynote ? 0 : a.isKeynote ? -1 : 1));

        return { speakers, schedule };
    }

    // 2. Initialize App
    function initApp() {
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

    function escapeHtml(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escapeAttr(str) {
        return escapeHtml(str).replace(/"/g, '&quot;');
    }

    function formatBio(bio) {
        if (!bio) return '';
        return escapeHtml(bio)
            .split(/\r?\n\r?\n/)
            .filter(p => p.trim())
            .map(p => `<p>${p.replace(/\r?\n/g, '<br>')}</p>`)
            .join('');
    }

    // --- Shared Speaker Modal (used on speakers page AND schedule page) ---

    function speakerSlug(name) {
        return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function ensureSpeakerModal() {
        if (document.getElementById('speaker-modal-overlay')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div id="speaker-modal-overlay" class="speaker-modal-overlay" role="dialog" aria-modal="true" aria-label="Speaker details">
                <div class="speaker-modal">
                    <button class="speaker-modal-close" id="speaker-modal-close" aria-label="Close">&times;</button>
                    <div class="speaker-modal-header">
                        <img class="speaker-modal-photo" id="speaker-modal-photo" src="" alt="">
                        <div class="speaker-modal-meta">
                            <div class="speaker-modal-name" id="speaker-modal-name"></div>
                            <div class="speaker-modal-tagline" id="speaker-modal-tagline"></div>
                        </div>
                    </div>
                    <div class="speaker-modal-bio" id="speaker-modal-bio"></div>
                    <div class="speaker-modal-sessions" id="speaker-modal-sessions" style="display:none;"></div>
                </div>
            </div>
        `);
        const overlay = document.getElementById('speaker-modal-overlay');
        document.getElementById('speaker-modal-close').addEventListener('click', closeSpeakerModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeSpeakerModal(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSpeakerModal(); });
    }

    function closeSpeakerModal() {
        const overlay = document.getElementById('speaker-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        // Clear hash without scrolling or adding to history
        if (window.location.hash.startsWith('#speaker-')) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    function openSpeakerModal(speaker, { updateHash = true } = {}) {
        ensureSpeakerModal();
        document.getElementById('speaker-modal-photo').src = speaker.profilePicture;
        document.getElementById('speaker-modal-photo').alt = speaker.fullName;
        document.getElementById('speaker-modal-name').textContent = speaker.fullName;
        document.getElementById('speaker-modal-tagline').textContent = speaker.tagLine;
        document.getElementById('speaker-modal-bio').innerHTML = formatBio(speaker.bio);

        const sessionsEl = document.getElementById('speaker-modal-sessions');
        const speakerSessions = (appData.schedule || []).filter(s =>
            Array.isArray(s.speakers) && s.speakers.includes(speaker.id)
        );
        if (speakerSessions.length > 0) {
            sessionsEl.innerHTML = speakerSessions
                .map(s => `<div class="speaker-modal-session-item">&ndash; ${escapeHtml(s.title)}</div>`)
                .join('');
            sessionsEl.style.display = '';
        } else {
            sessionsEl.innerHTML = '';
            sessionsEl.style.display = 'none';
        }

        document.getElementById('speaker-modal-overlay').classList.add('active');
        document.body.style.overflow = 'hidden';

        // Update URL hash so the link is shareable
        if (updateHash) {
            history.replaceState(null, '', `#speaker-${speakerSlug(speaker.fullName)}`);
        }
    }

    function renderSpeakers() {
        const container = document.getElementById('speakers-grid-container');
        if (!container || !appData.speakers) return;

        if (appData.speakers.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Speakers will be announced soon.</p>';
            return;
        }

        container.innerHTML = appData.speakers.map(speaker => `
            <div class="speaker-card-full${speaker.isKeynote ? ' speaker-card--keynote' : ''}" id="speaker-${escapeHtml(speakerSlug(speaker.fullName))}" data-speaker-id="${escapeHtml(speaker.id)}" role="button" tabindex="0" aria-label="View ${escapeHtml(speaker.fullName)} profile">
                <div class="speaker-img-wrapper${speaker.isKeynote ? ' speaker-img-wrapper--keynote' : ''}">
                    <img src="${escapeHtml(speaker.profilePicture)}" alt="${escapeHtml(speaker.fullName)}" loading="lazy">
                </div>
                <div class="speaker-name">${escapeHtml(speaker.fullName)}</div>
                <div class="speaker-title">${escapeHtml(speaker.tagLine)}</div>
                ${speaker.isKeynote ? '<div class="speaker-keynote-badge">&#9733; Keynote</div>' : ''}
            </div>
        `).join('');

        container.querySelectorAll('.speaker-card-full').forEach(card => {
            const speaker = appData.speakers.find(s => s.id === card.dataset.speakerId);
            if (!speaker) return;
            card.addEventListener('click', () => openSpeakerModal(speaker));
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSpeakerModal(speaker); }
            });
        });

        // Auto-open if URL has a matching speaker hash (e.g. shared link)
        const hash = window.location.hash.slice(1); // strip '#'
        if (hash.startsWith('speaker-')) {
            const speaker = appData.speakers.find(s => speakerSlug(s.fullName) === hash.slice('speaker-'.length));
            if (speaker) openSpeakerModal(speaker, { updateHash: false });
        }
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

        bindScheduleModalDelegation();
    }

    function sessionTimeFields(session, timezonePref, eventTimezone) {
        const parseDate = (dateString) => {
            if (dateString.includes('Z') || dateString.match(/[+-]\d{2}:\d{2}$/)) {
                return new Date(dateString);
            }
            const [datePart, timePart] = dateString.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute, second = 0] = (timePart || '').split(':').map(Number);
            let testDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
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
            const hourDiff = hour - fmtHour;
            const dayDiff = (day - fmtDay) * 24;
            const totalHours = hourDiff + dayDiff;
            return new Date(testDate.getTime() - totalHours * 60 * 60 * 1000);
        };

        const timesKnown = session.startsAt && session.endsAt;
        let timeStr = 'Time TBA';
        let dateStr = '';
        let timezoneAbbr = '';
        let timezoneSubtext = '';

        if (timesKnown) {
            const startDate = parseDate(session.startsAt);
            const endDate = parseDate(session.endsAt);
            let targetTimezone;
            if (timezonePref === 'local') {
                targetTimezone = undefined;
            } else if (timezonePref === 'custom') {
                targetTimezone = document.getElementById('custom-timezone')?.value || eventTimezone;
            } else {
                targetTimezone = eventTimezone;
            }

            const timeOpts = { hour: 'numeric', minute: '2-digit', timeZone: targetTimezone };
            const dateOpts = { month: 'short', day: 'numeric', timeZone: targetTimezone };

            if (timezonePref === 'local') {
                const startTime = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const endTime = endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const startDateLocal = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                const endDateLocal = endDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                timeStr = `${startTime} - ${endTime}`;
                dateStr = startDateLocal !== endDateLocal ? `${startDateLocal} - ${endDateLocal}` : startDateLocal;
                timezoneSubtext = 'Your Time';
            } else if (timezonePref === 'custom') {
                try {
                    const startTime = startDate.toLocaleTimeString([], timeOpts);
                    const endTime = endDate.toLocaleTimeString([], timeOpts);
                    const startDateTz = startDate.toLocaleDateString([], dateOpts);
                    const endDateTz = endDate.toLocaleDateString([], dateOpts);
                    timeStr = `${startTime} - ${endTime}`;
                    dateStr = startDateTz !== endDateTz ? `${startDateTz} - ${endDateTz}` : startDateTz;
                    const tzParts = Intl.DateTimeFormat('en', { timeZone: targetTimezone, timeZoneName: 'short' }).formatToParts(new Date());
                    const tzName = tzParts.find(part => part.type === 'timeZoneName')?.value || targetTimezone.split('/').pop();
                    timezoneAbbr = ` (${tzName})`;
                    timezoneSubtext = 'Custom Time';
                } catch (e) {
                    timeStr = `${startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
                    timezoneSubtext = 'Custom Time';
                }
            } else {
                try {
                    const startTime = startDate.toLocaleTimeString('en-NZ', timeOpts);
                    const endTime = endDate.toLocaleTimeString('en-NZ', timeOpts);
                    const startDateTz = startDate.toLocaleDateString('en-NZ', dateOpts);
                    const endDateTz = endDate.toLocaleDateString('en-NZ', dateOpts);
                    timeStr = `${startTime} - ${endTime} (NZT)`;
                    dateStr = startDateTz !== endDateTz ? `${startDateTz} - ${endDateTz}` : startDateTz;
                    timezoneSubtext = 'Event Time';
                } catch (e) {
                    timeStr = `${startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (Local)`;
                    timezoneSubtext = 'Event Time';
                }
            }
        }

        return { timeStr, dateStr, timezoneAbbr, timesKnown, timezoneSubtext };
    }

    function ensureScheduleModal() {
        if (document.getElementById('schedule-modal-overlay')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div id="schedule-modal-overlay" class="schedule-modal-overlay" role="dialog" aria-modal="true" aria-label="Session details">
                <div class="schedule-modal">
                    <button type="button" class="schedule-modal-close" id="schedule-modal-close" aria-label="Close">&times;</button>
                    <div class="schedule-modal-meta" id="schedule-modal-meta"></div>
                    <div class="schedule-modal-time" id="schedule-modal-time"></div>
                    <h2 class="schedule-modal-title" id="schedule-modal-title"></h2>
                    <div class="schedule-modal-description" id="schedule-modal-description"></div>
                    <div class="schedule-modal-speakers" id="schedule-modal-speakers"></div>
                </div>
            </div>
        `);
        const overlay = document.getElementById('schedule-modal-overlay');
        document.getElementById('schedule-modal-close').addEventListener('click', closeScheduleModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeScheduleModal(); });
    }

    function openScheduleModal(session) {
        ensureScheduleModal();
        const timezonePref = document.getElementById('filter-timezone')?.value || 'local';
        const eventTimezone = 'Pacific/Auckland';
        const t = sessionTimeFields(session, timezonePref, eventTimezone);

        document.getElementById('schedule-modal-meta').innerHTML = `
            <span class="tag">${escapeHtml(session.category)}</span>
            <span class="schedule-modal-room">${escapeHtml(session.room)}</span>
        `;
        document.getElementById('schedule-modal-time').innerHTML = `
            ${t.dateStr ? `<div class="schedule-modal-date">${escapeHtml(t.dateStr)}</div>` : ''}
            <div class="schedule-modal-time-main">${escapeHtml(t.timeStr)}${escapeHtml(t.timezoneAbbr)}</div>
            ${t.timesKnown && t.timezoneSubtext ? `<span class="schedule-modal-tz-hint">${escapeHtml(t.timezoneSubtext)}</span>` : ''}
        `;
        document.getElementById('schedule-modal-title').textContent = session.title || '';
        const descEl = document.getElementById('schedule-modal-description');
        if (session.description && session.description.trim()) {
            descEl.innerHTML = formatBio(session.description);
            descEl.style.display = '';
        } else {
            descEl.innerHTML = '';
            descEl.style.display = 'none';
        }
        const speakers = (session.speakers || []).map(id => appData.speakers.find(s => s.id === id)).filter(Boolean);
        const spEl = document.getElementById('schedule-modal-speakers');
        if (speakers.length) {
            spEl.innerHTML = speakers.map(s => `
                <div class="session-speaker session-speaker--clickable" data-speaker-id="${escapeHtml(s.id)}" role="button" tabindex="0" aria-label="View ${escapeAttr(s.fullName)} profile">
                    <img src="${escapeHtml(s.profilePicture)}" alt="${escapeHtml(s.fullName)}">
                    <span>${escapeHtml(s.fullName)}</span>
                </div>
            `).join('');
            spEl.querySelectorAll('.session-speaker--clickable').forEach(chip => {
                const speaker = speakers.find(s => String(s.id) === chip.dataset.speakerId);
                if (!speaker) return;
                chip.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeScheduleModal();
                    openSpeakerModal(speaker);
                });
            });
            spEl.style.display = '';
        } else {
            spEl.innerHTML = '';
            spEl.style.display = 'none';
        }

        document.getElementById('schedule-modal-overlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeScheduleModal() {
        const overlay = document.getElementById('schedule-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function bindScheduleModalDelegation() {
        const container = document.getElementById('schedule-container');
        if (!container || container.dataset.scheduleModalBound === '1') return;
        container.dataset.scheduleModalBound = '1';

        container.addEventListener('click', (e) => {
            // Speaker chip click → open speaker modal
            const speakerChip = e.target.closest('.session-speaker--clickable');
            if (speakerChip && container.contains(speakerChip)) {
                e.stopPropagation();
                const speakerId = speakerChip.dataset.speakerId;
                const speaker = appData.speakers?.find(s => String(s.id) === String(speakerId));
                if (speaker) openSpeakerModal(speaker);
                return;
            }

            // Session card click → open session modal
            const card = e.target.closest('.session-card');
            if (!card || !container.contains(card)) return;
            const id = card.dataset.sessionId;
            if (!id || !appData.schedule) return;
            const session = appData.schedule.find(s => String(s.id) === String(id));
            if (session) openScheduleModal(session);
        });

        container.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;

            const speakerChip = e.target.closest('.session-speaker--clickable');
            if (speakerChip && container.contains(speakerChip)) {
                e.preventDefault();
                const speakerId = speakerChip.dataset.speakerId;
                const speaker = appData.speakers?.find(s => String(s.id) === String(speakerId));
                if (speaker) openSpeakerModal(speaker);
                return;
            }

            const card = e.target.closest('.session-card');
            if (!card || !container.contains(card)) return;
            e.preventDefault();
            const id = card.dataset.sessionId;
            const session = appData.schedule?.find(s => String(s.id) === String(id));
            if (session) openScheduleModal(session);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeScheduleModal();
        });
    }

    function renderSchedule() {
        const container = document.getElementById('schedule-container');
        if (!container || !appData.schedule) return;

        const timezonePref = document.getElementById('filter-timezone')?.value || 'local';
        const trackPref = document.getElementById('filter-track')?.value || 'all';
        const eventTimezone = 'Pacific/Auckland';

        function normalizeCategory(category) {
            return category.toLowerCase().replace(/[\/\s]/g, '');
        }

        let sessions = appData.schedule;
        if (trackPref !== 'all') {
            sessions = sessions.filter(s => normalizeCategory(s.category) === trackPref);
        }

        if (sessions.length === 0) {
            container.innerHTML = '<p style="text-align: center; font-size: 1.2rem; margin-top: 2rem;">No sessions found for this active filter.</p>';
            return;
        }

        container.innerHTML = sessions.map(session => {
            const t = sessionTimeFields(session, timezonePref, eventTimezone);
            const speakers = (session.speakers || []).map(id => appData.speakers.find(s => s.id === id)).filter(Boolean);
            const speakerHtml = speakers.map(s => `
                <div class="session-speaker session-speaker--clickable" data-speaker-id="${escapeHtml(s.id)}" role="button" tabindex="0" aria-label="View ${escapeAttr(s.fullName)} profile">
                    <img src="${escapeHtml(s.profilePicture)}" alt="${escapeHtml(s.fullName)}">
                    <span>${escapeHtml(s.fullName)}</span>
                </div>
            `).join('');

            const keynoteClass = session.isKeynote ? ' session-card--keynote' : '';
            const keynoteTag = session.isKeynote ? '<span class="tag tag--keynote">&#9733; Keynote</span>' : '';
            return `
                <div class="session-card session-card--interactive${keynoteClass}" data-session-id="${escapeHtml(session.id)}" role="button" tabindex="0" aria-label="View details: ${escapeAttr(session.title)}">
                    <div class="session-time">
                        ${t.dateStr ? `<div class="session-time-date">${escapeHtml(t.dateStr)}</div>` : ''}
                        <div>${escapeHtml(t.timeStr)}${escapeHtml(t.timezoneAbbr)}</div>
                        ${t.timesKnown && t.timezoneSubtext ? `<span class="session-time-hint">${escapeHtml(t.timezoneSubtext)}</span>` : ''}
                    </div>
                    <div class="session-details">
                        <div class="session-meta">
                            ${keynoteTag}
                            <span class="tag">${escapeHtml(session.category)}</span>
                            <span>${escapeHtml(session.room)}</span>
                        </div>
                        <div class="session-title">${escapeHtml(session.title)}</div>
                        <p class="session-card-hint">View abstract &amp; details</p>
                        <div class="session-speakers-row">
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
                msg.textContent = 'Registration coming soon';
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
            const tierClass = (tier) =>
                String(tier || 'sponsor')
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

            const tierLabel = (tier) => {
                const normalized = String(tier || '').trim();
                return normalized ? normalized : 'Sponsors';
            };

            const tierPriority = ['platinum', 'gold', 'silver', 'bronze', 'community'];
            const groupedSponsors = appData.sponsors.reduce((acc, sponsor) => {
                const key = tierClass(sponsor.tier || 'sponsors');
                if (!acc[key]) {
                    acc[key] = {
                        tierKey: key,
                        tierName: tierLabel(sponsor.tier),
                        sponsors: []
                    };
                }
                acc[key].sponsors.push(sponsor);
                return acc;
            }, {});

            const sortedGroups = Object.values(groupedSponsors).sort((a, b) => {
                const aIndex = tierPriority.indexOf(a.tierKey);
                const bIndex = tierPriority.indexOf(b.tierKey);
                const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
                const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
                if (aRank !== bRank) return aRank - bRank;
                return a.tierName.localeCompare(b.tierName);
            });

            if (sponsorsSection) sponsorsSection.style.display = 'block';
            sponsorsContainer.classList.add('sponsors-grouped');
            sponsorsContainer.innerHTML = sortedGroups.map(group => `
                <div class="sponsors-tier-group">
                    <h3 class="sponsors-tier-title">${group.tierName} Sponsors</h3>
                    <div class="sponsors-grid">
                        ${group.sponsors.map((sponsor) => {
                            const tier = tierClass(sponsor.tier);
                            const title = `${sponsor.name} (${sponsor.tier})`;
                            const inner = `<img src="${sponsor.logo}" alt="${sponsor.name}">`;
                            const url = String(sponsor.url || '').trim();
                            if (!url) {
                                return `<div class="sponsor-card sponsor-card--no-link tier-${tier}" title="${title}">${inner}</div>`;
                            }
                            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="sponsor-card tier-${tier}" title="${title}">${inner}</a>`;
                        }).join('')}
                    </div>
                </div>
            `).join('');
        }

        // Render Organizers
        if (organizersContainer && appData.organizers) {
            const isLinkedInUrl = (u) => /(^|\/\/)(www\.)?linkedin\.com\//i.test(u || '');

            const organizerLinksHtml = (org) => {
                const links = [];
                const seen = new Set();

                const pushLink = ({ href, label, iconClass, ariaLabel }) => {
                    if (!href || seen.has(href)) return;
                    seen.add(href);
                    links.push(
                        `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${label}" aria-label="${ariaLabel}" style="color:var(--color-smile-orange); margin: 0 0.25rem;"><i class="${iconClass}"></i></a>`
                    );
                };

                // Backward-compatible: `linkedin` may be the only URL we have.
                if (org.linkedin) {
                    if (isLinkedInUrl(org.linkedin)) {
                        pushLink({
                            href: org.linkedin,
                            label: 'LinkedIn',
                            iconClass: 'fab fa-linkedin-in',
                            ariaLabel: `${org.name} on LinkedIn`
                        });
                    } else {
                        pushLink({
                            href: org.linkedin,
                            label: 'Website',
                            iconClass: 'fas fa-link',
                            ariaLabel: `${org.name} website`
                        });
                    }
                }

                // New optional field
                if (org.url) {
                    pushLink({
                        href: org.url,
                        label: 'Website',
                        iconClass: 'fas fa-link',
                        ariaLabel: `${org.name} website`
                    });
                }

                return links.length ? `<div style="margin-top: 0.25rem;">${links.join('')}</div>` : '';
            };

            organizersContainer.innerHTML = appData.organizers.map(org => `
                <div class="organizer-card">
                    <img src="${org.image}" alt="${org.name}" class="organizer-img">
                    <h4 style="margin-bottom:0.25rem;">${org.name}</h4>
                    <p style="color:var(--color-text-light); font-size:0.9rem; margin-bottom:0.5rem;">${org.role}</p>
                    ${organizerLinksHtml(org)}
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
        const navLinks = Array.from(navUl.querySelectorAll('a'));
        const homeLink = navLinks.find((link) => link.getAttribute('href') === 'index.html');
        const sponsorsLink = navLinks.find((link) => {
            const href = link.getAttribute('href') || '';
            return href === '#sponsors' || href.endsWith('index.html#sponsors');
        });

        const setActiveLink = (activeLink) => {
            navLinks.forEach((link) => link.classList.remove('active'));
            if (activeLink) activeLink.classList.add('active');
        };

        const isHomePage = currentPath === '' || currentPath === 'index.html';
        const applyActiveNavState = () => {
            if (!isHomePage) {
                const pageLink = navLinks.find((link) => link.getAttribute('href') === currentPath);
                setActiveLink(pageLink || homeLink || null);
                return;
            }

            const hash = (window.location.hash || '').toLowerCase();
            if (hash === '#sponsors' && sponsorsLink) {
                setActiveLink(sponsorsLink);
                return;
            }

            // Scroll-aware fallback: highlight Sponsors when section is in view.
            const sponsorsSection = document.getElementById('sponsors');
            if (sponsorsSection && sponsorsLink) {
                const rect = sponsorsSection.getBoundingClientRect();
                const viewportMid = window.innerHeight * 0.5;
                if (rect.top <= viewportMid && rect.bottom >= viewportMid) {
                    setActiveLink(sponsorsLink);
                    return;
                }
            }

            setActiveLink(homeLink || null);
        };

        // Keep nav state in sync across interactions.
        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                setTimeout(applyActiveNavState, 0);
            });
        });
        window.addEventListener('hashchange', applyActiveNavState);
        if (isHomePage) window.addEventListener('scroll', applyActiveNavState, { passive: true });
        applyActiveNavState();

        // Setup Header GitHub Button
        const headerGithubBtn = document.getElementById('header-github-btn');
        if (headerGithubBtn && appData.config.socials && appData.config.socials.github) {
            const ghUrl = appData.config.socials.github;
            headerGithubBtn.setAttribute('href', ghUrl);
            headerGithubBtn.style.display = 'inline-flex';
            console.log('GitHub Button Activated:', ghUrl);
        }

        // Reveal nav only after dynamic links are ready (prevents button flash).
        navUl.style.visibility = 'visible';
    }

    // --- Init ---
    fetchData();

});
