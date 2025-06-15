# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Authentication System

This app includes a complete authentication system built with Redux Toolkit, Redux Persist, and RTK Query. The system includes:

- Login page with support for username, email, or phone number
- Registration page with validation
- Persistent authentication state using Redux Persist
- API integration using RTK Query

### Authentication Flow

1. Users can register with username, email, phone, and password
2. Users can login with username, email, or phone number
3. Authentication state is persisted across app restarts
4. Protected routes are only accessible to authenticated users

### API Endpoints

- Login: `https://hovapay-api.onrender.com/api/login`
- Register: `https://hovapay-api.onrender.com/api/register`

### Redux Store Structure

The Redux store is organized as follows:

- `auth`: Manages authentication state (user data, token, authentication status)
- `authApi`: Handles API requests for authentication

### Files

- `store/index.ts`: Redux store configuration with Redux Persist
- `store/slices/authSlice.ts`: Authentication state management
- `store/api/authApi.ts`: RTK Query API for authentication
- `store/provider.tsx`: Redux Provider component
- `app/login.tsx`: Login screen
- `app/register.tsx`: Registration screen

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
