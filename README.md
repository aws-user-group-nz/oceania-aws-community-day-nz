# AWS Oceania Virtual Community Day 2026

![GitHub Pages](https://github.com/aws-user-group-nz/oceania-aws-community-day-nz/actions/workflows/pages.yml/badge.svg)

Website for the AWS Oceania Virtual Community Day - a user-run AWS technical conference in the Oceania region.

## 🌐 Live Site

The website is automatically deployed to GitHub Pages on every push to the `main` branch.

## ✨ Features

- **Dynamic Event Management**: Automatically shows relevant content based on event phase (CFP, Registration, Event Day)
- **Smart FAQ System**: Phase-specific FAQs that adapt to the current event status
- **Speaker Profiles**: Showcase speakers with their bios and profile pictures
- **Schedule Management**: Interactive schedule with timezone support
- **Registration System**: Built-in registration form with calendar integration
- **Dark/Light Mode**: User preference-based theme switching
- **Responsive Design**: Mobile-friendly layout that works on all devices
- **Social Media Integration**: Links to LinkedIn, GitHub, Meetup, Twitch, YouTube, and Discord

## ⚙️ Configuration

All website configuration is done through editing `data.json`. This file controls all aspects of the event website.

### Event Configuration

Update these fields to configure your event:

- `event_date`: Event date in ISO format (YYYY-MM-DD), e.g., `"2026-04-15"`
- `event_timezone`: Timezone for the event, e.g., `"Pacific/Auckland"`
- `hero_headline`: Main headline displayed on the homepage
- `hero_subheadline`: Subheadline text displayed below the headline
- `hero_date_text`: Human-readable event date text, e.g., `"April 15, 2026 | Virtual Event"`

### CFP (Call for Papers) Configuration

Configure the Call for Papers period:

- `cfp_start_date`: When CFP opens (ISO format: YYYY-MM-DD)
- `cfp_end_date`: When CFP closes (ISO format: YYYY-MM-DD)
- `cfp_link`: URL to the CFP submission form (e.g., Sessionize link)

**Note**: During the CFP period, the website automatically shows CFP-related content and FAQs.

### Registration Configuration

Control registration functionality:

- `registration_enabled`: Set to `true` to enable registration, `false` to disable
- `registration_api_url`: (Optional) AWS Lambda URL for handling registrations. Leave as `"YOUR_AWS_LAMBDA_URL_HERE"` if not using an API.

**Note**: When registration is enabled and CFP is closed, the registration button appears in the hero section.

### Social Media Links

Update social media links in the `socials` object:

```json
"socials": {
    "linkedin": "https://www.linkedin.com/company/aws-user-group-aotearoa",
    "github": "https://github.com/aws-user-group-nz/oceania-aws-community-day-nz",
    "meetup": "https://www.meetup.com/amazon-web-services-wellington-user-group",
    "twitch": "https://www.twitch.tv/awscdo",
    "youtube": "https://www.youtube.com/@awscdo",
    "discord": "https://discord.gg/awsugnz"
}
```

### Content Section Visibility

Control which sections are visible on the website:

- `show_speakers`: Set to `true` to show the Speakers page in navigation
- `show_schedule`: Set to `true` to show the Schedule page in navigation
- `show_sponsors`: Set to `true` to show the Sponsors section on the homepage

## 📝 Content Management

### Speakers

Add speakers to the `speakers` array in `data.json`:

```json
{
    "id": "unique-id",
    "fullName": "Speaker Name",
    "tagLine": "Title, Company",
    "bio": "Speaker biography...",
    "profilePicture": "URL to profile image"
}
```

### Schedule

Add sessions to the `schedule` array:

```json
{
    "id": "session-id",
    "title": "Session Title",
    "description": "Session description...",
    "startsAt": "2026-04-15T09:00:00",
    "endsAt": "2026-04-15T10:00:00",
    "speakers": ["speaker-id-1", "speaker-id-2"],
    "room": "Track A",
    "category": "Serverless"
}
```

### FAQ

Add FAQs with phase-specific visibility:

```json
{
    "question": "Your question?",
    "answer": "Your answer...",
    "phase": "cfp" | "registration" | "event" | "always"
}
```

## 🎨 Customization

### Styling

- Main stylesheet: `style.css`
- Uses CSS custom properties (variables) for easy theming
- Dark/light mode support built-in

### JavaScript

- Main script: `script.js`
- Vanilla JavaScript (no frameworks required)
- Handles dynamic content rendering and event logic

## 📦 Deployment

The site is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch.

### Manual Deployment

1. Ensure all changes are committed and pushed to `main`
2. GitHub Actions will automatically deploy
3. Check the Actions tab for deployment status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Please follow the format:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `style: formatting changes`
- `refactor: code restructuring`

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Made with ❤️ by the AWS Community for the AWS Community.
