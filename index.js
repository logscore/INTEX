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

// tells express how to read form data in the body of a request
app.use(express.urlencoded({ extended: true }));

// set the session varible
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);

// global authentication middleware
app.use((req, res, next) => {
  // Skip authentication for login routes
  if (req.path === "/" || req.path === "/login" || req.path === "/logout") {
    //continue with the request path
    return next();
  }

  // Check if user is logged in for all other routes
  if (req.session.isLoggedIn) {
    //notice no return because nothing below it
    next(); // User is logged in, continue
  } else {
    res.render("login", { error_message: "Please log in to access this page" });
  }
});

// set up connection to database
const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    port: process.env.POSTGRES_PORT,
  },
});

// retrieve user login data from the database
app.post("/login", (req, res) => {
  let sEmail = req.body.email;
  let sPassword = req.body.password;

  // if the inputted username and password match a row in the database, create the session variable and allow user access to the website
  knex
    .select("email", "password", "level")
    .from("public.users")
    .where("email", sEmail)
    .andWhere("password", sPassword)
    .then((users) => {
      if (users.length > 0) {
        req.session.isLoggedIn = true;
        req.session.email = sEmail;
        req.session.userLevel = users[0].level;
        res.redirect("/");
      } else {
        res.render("login", { error_message: "Invaild login" });
      }
    })
    .catch((err) => {
      console.error("Login error:", err);
      res.render("login", { error_message: "Invalid login" });
    });
});

// userDashboard page route - check to make sure that the user is logged in first
app.get("/userDashboard", (req, res) => {
  if (req.session.isLoggedIn) {
    res.render("userDashboard");
  } else {
    res.redirect("/login");
  }
});

// displayEvents page route - check to make sure that the user is logged in first
app.get("/displayEvents", (req, res) => {
  if (req.session.isLoggedIn) {
    res.render("displayEvents");
  } else {
    res.redirect("/login");
  }
});

// displaySurveys page route - check to make sure that the user is logged in first
app.get("/displaySurveys", (req, res) => {
  if (req.session.isLoggedIn) {
    res.render("displaySurveys");
  } else {
    res.redirect("/login");
  }
});

// landing page route - check to make sure that the user is logged in first
app.get("/displayUsers", (req, res) => {
  if (req.session.isLoggedIn) {
    res.render("displayUsers");
  } else {
    res.redirect("/login");
  }
});

// login route - if the user is already logged in, redirect to the landing page, otherwise have the user login
app.get("/login", (req, res) => {
  if (req.session.isLoggedIn) {
    res.redirect("userDashboard");
  } else {
    res.render("login", { error_message: "" });
  }
});

// logout route - destroy session
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) console.log(err);
        res.redirect("/");
    });
});

// external public landing page route - does not need login
app.get("/", (req, res) => {
  res.render("index", { 
    isLoggedIn: req.session.isLoggedIn || false 
  });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`The server is listening port ${process.env.APP_PORT}`);
});
