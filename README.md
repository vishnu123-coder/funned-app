# ECE Confession (Expo + Firebase)

Anonymous confession page for Instagram.
- `web/index.html` - public page where people send confessions (pin its link in your Instagram bio)
- `App.js` + `src/` - the owner app: login, inbox, story card, share to Instagram Story
- `firestore.rules` - security rules (senders can only SEND; only you can read)
- `firebase.json` - lets you host `web/` and publish the rules with one command

## 1. Firebase (free plan is enough)
1. console.firebase.google.com > Add project.
2. Project settings > Your apps > add a **Web app** (`</>`). Copy the config.
   Paste it into **both** `src/firebase.js` and `web/index.html`.
3. Build > **Firestore Database** > Create database (production mode).
4. Build > Authentication > Get started > enable **Email/Password**.
   Users > Add user: email `ece@confession.app` (username `ece`), set a password. Copy the user's **UID**.
5. Firestore > Start collection `pages` > Document ID `ece` with fields:
   `owner` (string) = the UID, `title` (string) = ECE Confession, `insta_handle` (string) = your handle.
   Repeat steps 4-5 for each extra username (document ID = username).
6. Firestore > Rules > paste `firestore.rules` > Publish.

## 2. Host the web page (Firebase Hosting, free)
```
npm i -g firebase-tools
firebase login
firebase use --add        # pick your project
firebase deploy --only hosting,firestore:rules
```
Your link: `https://ece-confessions.web.app/?u=ece`. Put it in `src/consts.js` (PAGE_URL, keep the `?u=` at the end).

## 3. Run / build the app
```
npm install
npx expo install --fix      # aligns package versions with Expo
npx expo start
```
Sharing to Instagram Story needs a real build (it does not work in Expo Go):
`npx eas-cli build -p android --profile preview` -> install the APK on your phone.
(Everything else - login, inbox, favourite, delete - works in Expo Go.)

## Privacy
Senders only add text. No IP, device or name is stored, and senders cannot read anything back.
