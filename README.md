**Please note: This app is being developed. There may be bugs, and everything is subject to change.**

# Kino

This is a sample Video on demand (VOD) app to demonstrate media functionality in the context of a Progressive Web App (PWA).

## Running the site locally

Start by creating a new project from the [Firebase Console](https://console.firebase.google.com/) and then set up the Firebase CLI with NPM.

**Important**: This project uses a local Firebase emulator, which mean you need to install the Firebase CLI globally.

    npm install -g firebase-tools

Clone this repository:

    git clone git@github.com:GoogleChrome/kino.git

Go to the project folder:

    cd kino

Login to Firebase:

    firebase login

Initialize Firebase:

    firebase init hosting

Answer questions as follows:

    ? What do you want to use as your public directory? public
    ? Configure as a single-page app (rewrite all urls to /index.html)? Yes
    ? Set up automatic builds and deploys with GitHub? No
    ? File public/index.html already exists. Overwrite? No

Install the dependencies:

    npm install

Build the assets:

    npm run build

**Note**: This project uses Rollup to build the JavaScript assets. No transpilation is currently being done, the tooling exists mainly to resolve ES Modules in the Service Worker.

You can also have Rollup watch for changes in the `/src` directory and rebuild them on the fly.

Watch and build the assets:

    npm run watch

Finally, start the Firebase emulator:

    npm start

The videos are not included in the repo, but rather are served from a Google Cloud Storage bucket. They are served with CORS headers, meaning that you will need to run the local copy of the server at port 5000.
