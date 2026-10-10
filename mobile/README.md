# InternSetu — Mobile (React Native + TypeScript, Expo)

    npm install
    npx expo install --fix     # aligns native package versions with your Expo SDK
    npx expo start             # scan the QR code with Expo Go, or press a / i for an emulator

Flow: Splash -> Login / Register / Forgot password -> Profile (1/3) -> Skills (2/3) -> Preferences (3/3) -> Recommendations.
Same palette, fonts (DM Sans + Manrope), copy and match-scoring logic as the web app (see src/theme.ts and src/data.ts).
Login is a demo (no backend); profile data is stored on-device with AsyncStorage.
