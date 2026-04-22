- Check node version with the following:

    node --version
    npm --version

- Install Node.js:

    On Windows:
    - Download installer from nodejs.org
    - Run installer

    On Mac (using Homebrew):
    - brew install node

    On Linux:
    - curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    - sudo apt-get install nodejs


- Verify installation:

    node --version
    npm --version

- After cloning the repo, please execute the below to install all the dependencies:

    npm install

- To create a build, go to the root directory and execute the following command:

    npm run build
  

  (This will create a build which can be executed using a server)

- To execute/run the build, use the command

    node server.js

