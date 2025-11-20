# Internationalization (i18n) Setup

This application supports multiple languages using `react-i18next`. Currently, English and Arabic are supported.

## Features

- Language switching between English and Arabic
- Right-to-Left (RTL) support for Arabic
- Persistent language selection (stored in localStorage)
- Dynamic theme direction based on selected language

## Usage

### Using translations in components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### Language Switcher

The language switcher is automatically integrated into:
- `PageHeader` component - appears in the top right of all pages using PageHeader
- `AppLayout` component - can be used for pages that need a full app layout

You can also import and use it directly:

```tsx
import { LanguageSwitcher } from './components/common/LanguageSwitcher';

function MyComponent() {
  return (
    <div>
      <LanguageSwitcher />
    </div>
  );
}
```

## Translation Files

Translation files are located in:
- `src/i18n/locales/en.json` - English translations
- `src/i18n/locales/ar.json` - Arabic translations

### Adding new translations

1. Add the key-value pair to both `en.json` and `ar.json`:

```json
// en.json
{
  "mySection": {
    "myKey": "My English Text"
  }
}

// ar.json
{
  "mySection": {
    "myKey": "النص العربي الخاص بي"
  }
}
```

2. Use it in your component:

```tsx
const { t } = useTranslation();
<div>{t('mySection.myKey')}</div>
```

## Translation Structure

Translations are organized by section:
- `common` - Common UI elements (buttons, labels, etc.)
- `navigation` - Navigation menu items
- `auth` - Authentication related text
- `wells` - Wells module
- `runs` - Runs module
- `jobs` - Jobs module
- `users` - Users module
- `survey` - Survey related text
- `validation` - Form validation messages
- `errors` - Error messages
- `language` - Language selection

## RTL Support

RTL (Right-to-Left) is automatically applied when Arabic is selected. The application will:
- Change text direction to RTL
- Flip the layout direction
- Update Material-UI theme direction
- Set the `dir="rtl"` attribute on the HTML element

## Configuration

The i18n configuration is in `src/i18n/config.ts`:
- Default language: English
- Fallback language: English
- Language detection: localStorage first, then browser language
- Language persistence: localStorage

## Testing

To test the language switching:
1. Open the application
2. Click the language icon (🌐) in the top right
3. Select your preferred language
4. The entire application should switch to the selected language
5. Refresh the page - the language selection should persist
