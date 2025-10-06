# OUCH - Overpriced Utilities & Costly Habits 👋

**Your Smart Expense Tracking Companion**

OUCH is a comprehensive expense tracking mobile app built with Expo and React Native that helps you monitor your spending habits, categorize expenses, and make informed financial decisions.

## Features

- 📊 **Multi-User Support**: Track expenses for yourself and your spouse separately
- 💰 **Expense Type Analytics**: Categorize spending as Needs, Wants, or Investments with visual breakdowns  
- 📱 **21 Categories**: Comprehensive categorization from groceries to investments
- 🎨 **Beautiful UI**: Modern design with dark mode support
- 🔄 **Real-Time Sync**: Instant updates across all screens
- 📈 **Visual Analytics**: Progress bars and charts for expense insights

## Tech Stack

- **Frontend**: Expo (React Native), TypeScript
- **Backend**: FastAPI (Python), MongoDB
- **State Management**: React Context API
- **UI Components**: React Native with Ionicons

## Get started

1. Install dependencies

   ```bash
   yarn install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a [development build](https://docs.expo.dev/develop/development-builds/introduction/), [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/), [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/), or [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo.

## Build Instructions

### Prerequisites

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Configure EAS Build** (if not already done)
   ```bash
   eas build:configure
   ```

### Development Builds

Development builds include developer tools and are perfect for testing during development.

**Create Development Build:**
```bash
# For Android (generates .apk)
eas build --platform android --profile development

# For iOS (generates .ipa) 
eas build --platform ios --profile development

# For both platforms
eas build --platform all --profile development
```

**Install on Device:**
- **Android**: Download the .apk file from EAS dashboard and install
- **iOS**: Use TestFlight or install via Xcode/Apple Configurator

**Connect to Dev Server:**
```bash
# Start metro bundler
npx expo start --dev-client

# Scan QR code with your development build app
```

### Preview Builds

Preview builds are optimized for sharing with testers and stakeholders.

**Create Preview Build:**
```bash
# For Android
eas build --platform android --profile preview

# For iOS  
eas build --platform ios --profile preview

# For both platforms
eas build --platform all --profile preview
```

**Share with Testers:**
- Use the EAS Dashboard to share download links
- Preview builds work independently without metro bundler

### Production Builds

Production builds are optimized and ready for app store submission.

**Create Production Build:**
```bash
# For Android (Google Play Store)
eas build --platform android --profile production

# For iOS (App Store)
eas build --platform ios --profile production

# For both platforms
eas build --platform all --profile production
```

### Submit to App Stores

**Submit to Google Play Store:**
```bash
eas submit --platform android
```

**Submit to Apple App Store:**
```bash
eas submit --platform ios
```

### Build Profiles Configuration

Your `eas.json` should include these profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Troubleshooting

**Common Issues:**

1. **Expo Doctor Warnings**
   ```bash
   npx expo-doctor
   ```

2. **Clear Cache**
   ```bash
   npx expo start --clear
   ```

3. **Reset Metro Cache**
   ```bash
   npx react-native start --reset-cache
   ```

4. **Check Build Status**
   ```bash
   eas build:list
   ```

### Environment Variables

Make sure your environment variables are properly configured:

```bash
# Frontend/.env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001

# Backend/.env  
MONGO_URL=mongodb://localhost:27017
DB_NAME=expense_tracker
```

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
