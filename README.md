**Please note: This app is being developed. There may be bugs, and everything is subject to change.**

# Kino

Description @todo

## Running the site locally

Start by creating a new project from the [Firebase Console](https://console.firebase.google.com/) and then setup the Firebase CLI with NPM.

**Important**: This project uses a local Firebase emulator, which mean you need to install the Firebase CLI globally.

    npm install -g firebase-tools

Clone this repository:

    git clone git@github.com:xwp/kino.git

Go to the project folder:

    cd web-dev-media

Login to Firebase:

    firebase login

Initialize Firebase:

    firebase init

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
