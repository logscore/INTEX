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

// tells express how to read form data in the body of a request
app.use(express.urlencoded({ extended: true }));

// set the session variable
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
    return next();
  }

  // Check if user is logged in
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.render("login", { error_message: "Please log in to access this page" });
  }
});

// ==============================
// DATABASE CONNECTION (POSTGRES + KNEX)
// ==============================
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

// ==============================
// LOGIN
// ==============================
app.post("/login", (req, res) => {
  let sEmail = req.body.email;
  let sPassword = req.body.password;

  knex("Users")
    .select("Email", "Password", ":evel")
    .where("Email", sEmail)
    .andWhere("Password", sPassword)
    .then((users) => {
      if (users.length > 0) {
        req.session.isLoggedIn = true;
        req.session.email = sEmail;
        req.session.userLevel = users[0].level;
        res.redirect("/userDashboard");
      } else {
        res.render("login", { error_message: "Invalid login" });
      }
    })
    .catch((err) => {
      console.error("Login error:", err);
      res.render("login", { error_message: "Invalid login" });
    });
});

// ==============================
// USER DASHBOARD
// ==============================
app.get("/userDashboard", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  // TODO: Next step → Use the real participant table instead of the temp users table.
  // For now we only know email from req.session.

  const userEmail = req.session.email;

  try {
    // --------------------------------------------------------
    // 1. Get participant ID (TEMP: waiting for login migration)
    // --------------------------------------------------------
    // When login switches to participants, this becomes:
    // const participant = await knex("participants").where("ParticipantEmail", userEmail).first();

    // --------------------------------------------------------
    // 2. Get registered events
    // --------------------------------------------------------
    const registeredEvents = await knex("registrations as r")
      .join(
        "EventOccurences as e",
        "e.EventOccurrenceID",
        "r.EventOccurrenceID",
      )
      .join("participants as p", "p.ParticipantID", "r.ParticipantID")
      .select(
        "e.EventName",
        "e.EventDateTimeStart",
        "e.EventLocation",
        "e.EventDescription",
        "e.EventOccurrenceID",
      )
      .where("p.ParticipantEmail", userEmail)
      .orderBy("e.EventDateTimeStart", "asc");

    // --------------------------------------------------------
    // 3. Total Donations
    // --------------------------------------------------------
    const donationData = await knex("donations as d")
      .join("participants as p", "p.ParticipantID", "d.ParticipantID")
      .where("p.ParticipantEmail", userEmail)
      .sum({ total: "DonationAmount" })
      .first();

    const totalDonations = donationData?.total || 0;

    // --------------------------------------------------------
    // 4. Milestone Count
    // --------------------------------------------------------
    const milestones = await knex("milestones as m")
      .join("participants as p", "p.ParticipantID", "m.ParticipantID")
      .where("p.ParticipantEmail", userEmail)
      .count({ count: "*" })
      .first();

    const milestoneCount = milestones?.count || 0;

    // --------------------------------------------------------
    // 5. Render dashboard
    // --------------------------------------------------------
    res.render("userDashboard", {
      registeredEvents,
      totalDonations,
      milestoneCount,
    });
  } catch (err) {
    console.error(err);
    res.render("userDashboard", {
      registeredEvents: [],
      totalDonations: 0,
      milestoneCount: 0,
    });
  }
});

// ==============================
// DISPLAY FUTURE EVENTS
// ==============================
app.get("/displayEvents", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  try {
    const today = new Date();

    const futureEvents = await knex("EventOccurences")
      .select(
        "EventOccurrenceID",
        "EventName",
        "EventDateTimeStart",
        "EventDateTimeEnd",
        "EventLocation",
        "EventCapacity",
      )
      .where("EventDateTimeStart", ">", today)
      .orderBy("EventDateTimeStart", "asc");

    res.render("displayEvents", {
      events: futureEvents,
    });
  } catch (err) {
    console.error("Error loading events:", err);
    res.render("displayEvents", { events: [] });
  }
});

// ==============================
// MISC ROUTES
// ==============================
app.get("/displaySurveys", (req, res) => {
  res.render("displaySurveys");
});

app.get("/displayUsers", (req, res) => {
  res.render("displayUsers");
});

app.get("/login", (req, res) => {
  if (req.session.isLoggedIn) {
    res.redirect("userDashboard");
  } else {
    res.render("login", { error_message: "" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.log(err);
    res.redirect("/");
  });
});

// public landing page
app.get("/", (req, res) => {
  res.render("index", { isLoggedIn: req.session.isLoggedIn || false });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// start server
app.listen(port, "0.0.0.0", () => {
  console.log(`The server is listening port ${process.env.APP_PORT}`);
});
