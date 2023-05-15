# ProTanki-Server

ProTanki-Server is a private server for a tank game called ProTanki. This server is developed in Node.js and is responsible for managing the game logic and communication between players.

## Features

- Management of tank matches in a multiplayer environment.
- Communication with game clients using a TCP connection on port 1337.
- Storage of game data in a local SQLite file named database.sqlite.
- Use of Sequelize for object-relational mapping (ORM) to manipulate the SQLite database.
- Using winston to monitor the system with logs

## System Requirements

Node.js 12.x or higher installed.
NPM (Node Package Manager) or Yarn installed.

## Installation

- Install NodeJs on your machine

  - ##### Using Ubuntu

    ```sh
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&\
    sudo apt-get install -y nodejs
    ```

  - ##### Using Debian, as root

    ```sh
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - &&\
    apt-get install -y nodejs
    ```

- Clone the ProTanki-Server repository to your local machine:

  ```bash
  git clone https://github.com/DaniloPalmeira/ProTanki-Server.git
  ```

- Access the project directory:

  ```bash
  cd protanki-server
  ```

- Install project dependencies:

  ```bash
  npm install
  ```

  or

  ```bash
  yarn
  ```

- Start the server:

  ```bash
  npm start
  ```

  or

  ```bash
  yarn start
  ```

The ProTanki server will start and be ready to receive client connections.

## Configuration

ProTanki-Server uses default configuration and does not require any additional configuration to function properly.

## Dependencies

ProTanki-Server has the following dependencies:

- sequelize - Version 6.29.3 or higher.
- sqlite3 - Version 5.1.4 or higher.
- winston - Version 3.8.2 or higher.

You can install these dependencies using npm or yarn, after cloning the repository and accessing the project directory.
Make sure that the installed versions match the versions mentioned above.

Note that ProTanki-Server may have other indirect dependencies not listed here. Make sure all dependencies are properly installed before running the server.

## Contribution

Contributions are welcome! Feel free to contribute to the project. To contribute, follow best development practices, fork the repository, create a branch for your contribution, and send a pull request with your changes.
