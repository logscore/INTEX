// import express
const express = require("express");

// create express object
const app = express();

// import express-session to create a session variable
const session = require("express-session");

app.use(express.static("public"));

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
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === "production" ? true : false,
  },
});

// ==============================
// LOGIN
// ==============================
app.post("/login", (req, res) => {
  let sEmail = req.body.email ? req.body.email.toLowerCase().trim() : "";
  let sPassword = req.body.password || "";

  if (!sEmail || !sPassword) {
    return res.render("login", {
      error_message: "Please enter email and password",
    });
  }

  knex("Users")
    .select("Email", "Password", "Level")
    .where("Email", sEmail)
    .andWhere("Password", sPassword)
    .then((users) => {
      if (users.length > 0 && users[0].password === sPassword) {
        req.session.isLoggedIn = true;
        req.session.userId = users[0].id;
        req.session.email = users[0].email;
        req.session.userLevel = users[0].level;
        console.log(`User logged in: ${users[0].email} (ID: ${users[0].id})`);
        res.redirect("/userDashboard");
      } else {
        console.warn(`Failed login attempt for email: ${sEmail}`);
        res.render("login", { error_message: "Invalid email or password" });
      }
    })
    .catch((err) => {
      console.error("Login error:", err);
      res.render("login", {
        error_message: "Database error. Please try again.",
      });
    });
});

// ==============================
// USER DASHBOARD
// ==============================
app.get("/userDashboard", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  const userEmail = req.session.email;
  const userLevel = req.session.userLevel; // <-- grab user level from session

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

    const donationTotal = donationData?.total || 0;

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
    // 5. Get surveys for this participant (via registrations)
    // --------------------------------------------------------
    const surveys = await knex("Surveys as s")
      .join("Registrations as r", "r.RegistrationID", "s.RegistrationID")
      .join("participants as p", "p.ParticipantID", "r.ParticipantID")
      .leftJoin(
        "EventOccurences as e",
        "e.EventOccurrenceID",
        "r.EventOccurrenceID",
      )
      .select(
        "s.SurveyID",
        "s.SurveyOverallScore",
        "s.SurveyComments",
        "s.SurveySubmissionDate",
        "e.EventName",
        "r.RegistrationID",
      )
      .where("p.ParticipantEmail", userEmail)
      .orderBy("s.SurveySubmissionDate", "desc");

    // --------------------------------------------------------
    // 6. Render dashboard
    // --------------------------------------------------------
    res.render("userDashboard", {
      registeredEvents,
      donationTotal,
      milestoneCount,
    });
  } catch (err) {
    console.error(err);
    res.render("userDashboard", {
      registeredEvents: [],
      donationTotal: 0,
      milestoneCount: 0,
      userLevel, // even on error, pass the level
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
app.get("/displaySurveys", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  try {
    const userEmail = req.session.email;

    const registrations = await knex("registrations as r")
      .join("participants as p", "p.ParticipantID", "r.ParticipantID")
      .join(
        "EventOccurences as e",
        "e.EventOccurrenceID",
        "r.EventOccurrenceID",
      )
      .select("r.RegistrationID", "e.EventName", "e.EventDateTimeStart")
      .where("p.ParticipantEmail", userEmail)
      .orderBy("e.EventDateTimeStart", "asc");

    res.render("displaySurveys", { registrations });
  } catch (err) {
    console.error("Error loading surveys page:", err);
    res.render("displaySurveys", { registrations: [] });
  }
});

// Accept survey submissions
app.post("/submitSurvey", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  const registrationId = parseInt(req.body.registrationId, 10);
  const satisfaction = req.body.satisfaction
    ? parseFloat(req.body.satisfaction)
    : null;
  const usefulness = req.body.usefulness
    ? parseFloat(req.body.usefulness)
    : null;
  const instructor = req.body.instructor
    ? parseFloat(req.body.instructor)
    : null;
  const recommend = req.body.recommend ? parseFloat(req.body.recommend) : null;
  const comments = req.body.comments ? req.body.comments.trim() : null;

  try {
    // compute overall as average of provided numeric scores (ignore nulls)
    const scores = [satisfaction, usefulness, instructor, recommend].filter(
      (s) => s !== null && !isNaN(s),
    );
    const overall =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

    let npsBucket = null;
    if (overall !== null) {
      if (overall >= 4.5) npsBucket = "Promoter";
      else if (overall >= 3.0) npsBucket = "Passive";
      else npsBucket = "Detractor";
    }

    // Determine next SurveyID (table uses integer primary keys without sequence)
    const maxRow = await knex("Surveys").max("SurveyID as max").first();
    const nextId = maxRow && maxRow.max ? parseInt(maxRow.max, 10) + 1 : 1;

    await knex("Surveys").insert({
      SurveyID: nextId,
      RegistrationID: registrationId,
      SurveySatisfactionScore: satisfaction,
      SurveyUsefulnessScore: usefulness,
      SurveyInstructorScore: instructor,
      SurveyRecommendationScore: recommend,
      SurveyOverallScore: overall,
      SurveyNPSBucket: npsBucket,
      SurveyComments: comments,
      SurveySubmissionDate: new Date(),
    });

    res.redirect("/userDashboard");
  } catch (err) {
    console.error("Error saving survey:", err);
    res.redirect("/displaySurveys");
  }
});

// Display participants: if admin and ?all=true show all, otherwise show current user's participant record
app.get("/displayParticipants", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  try {
    const userEmail = req.session.email;

    // Admins can view all participants by visiting /displayParticipants?all=true
    if (
      req.session.userLevel &&
      req.session.userLevel === "admin" &&
      req.query.all === "true"
    ) {
      const participants = await knex("Participants")
        .select(
          "ParticipantID",
          "ParticipantEmail",
          "ParticipantFirstName",
          "ParticipantLastName",
          "ParticipantPhone",
          "ParticipantCity",
          "ParticipantState",
          "ParticipantSchoolOrEmployer",
          "ParticipantFieldOfInterest",
          "TotalDonations",
        )
        .orderBy("ParticipantLastName", "asc");

      return res.render("displayParticipants", { participants });
    }

    // Regular users: fetch their participant record by email
    const participant = await knex("Participants")
      .where("ParticipantEmail", userEmail)
      .first();

    res.render("displayParticipants", { participant });
  } catch (err) {
    console.error("Error loading participants:", err);
    res.render("displayParticipants", { participant: null });
  }
});

app.get("/displayUsers", (req, res) => {
  res.render("displayUsers");
});

app.get("/editUser", (req, res) => {
  res.render("editUser");
});
app.get("/tableauDashboard", (req, res) => {
  res.render("tableauDashboard");
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
