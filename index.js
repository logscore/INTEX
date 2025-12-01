// import express
const express = require("express");

// create express object
const app = express();

// import express-session to create a session variable
const session = require("express-session");

// load environment variables from the .env file
require("dotenv").config();

// set the port using the .env file
const port = process.env.APP_PORT;

// use ejs for the webpages - refer to the views directory
app.set("view engine", "ejs");

// import body-parser to pull data from submitted forms
const bodyParser = require("body-parser");

// set up connection to database
const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
  },
});

// retrieve user login data from the database
app.post("/login", (req, res) => {
  let sName = req.body.username;
  let sPassword = req.body.password;

  // if the inputted username and password match a row in the database, create the session variable and allow user access to the website
  knex.select("username", "password", "level")
    .from('users')
    .where("username", sName)
    .andWhere("password", sPassword)
    .then(users => {
      if (users.length > 0) {
        req.session.isLoggedIn = true;
        req.session.username = sName;
        req.session.userLevel = users[0].level
        res.redirect("/");
      } else {
        res.render("login", { error_message: "Invaild login" });
      }
    })
    .catch(err => {
      console.error("Login error:", err);
      res.render("login", { error_message: "Invalid login" });
    });
});

// landing page route - check to make sure that the user is logged in first
app.get("/", (req, res) => {
  if (req.session.isLoggedIn) {
    res.render("index");
  } else {
    res.redirect("/login");
  }
});

// login route - if the user is already logged in, redirect to the landing page, otherwise have the user login
app.get("/login", (req, res) => {
  if (req.session.isLoggedIn) {
    res.render("index");
  } else {
    res.render("login", { error_message: ""});
  }
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`The server is listening port ${process.env.APP_PORT}`);
});
