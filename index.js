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
  if (req.path === "/" || req.path === "/login" || req.path === "/logout" || req.path === "/displayEvents" || req.path === "/health") {
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
    ssl: { rejectUnauthorized: false }
  },
  wrapIdentifier: (value, origImpl) => origImpl(value.toLowerCase())
});

// Helper: normalize a participant DB row (which may have lowercase keys from PG)
function normalizeParticipantRow(row) {
  if (!row) return null;
  return {
    ParticipantID: row.ParticipantID || row.participantid || row.participant_id || null,
    ParticipantEmail: row.ParticipantEmail || row.participantemail || row.participant_email || null,
    ParticipantFirstName: row.ParticipantFirstName || row.participantfirstname || row.participant_first_name || null,
    ParticipantLastName: row.ParticipantLastName || row.participantlastname || row.participant_last_name || null,
    ParticipantDOB: row.ParticipantDOB || row.participantdob || row.participant_dob || null,
    ParticipantRole: row.ParticipantRole || row.participantrole || row.participant_role || null,
    ParticipantPhone: row.ParticipantPhone || row.participantphone || row.participant_phone || null,
    ParticipantCity: row.ParticipantCity || row.participantcity || row.participant_city || null,
    ParticipantState: row.ParticipantState || row.participantstate || row.participant_state || null,
    ParticipantZip: row.ParticipantZip || row.participantzip || row.participant_zip || null,
    ParticipantSchoolOrEmployer:
      row.ParticipantSchoolOrEmployer || row.participantschooloremployer || row.participant_school_or_employer || null,
    ParticipantFieldOfInterest:
      row.ParticipantFieldOfInterest || row.participantfieldofinterest || row.participant_field_of_interest || null,
    TotalDonations: row.TotalDonations !== undefined ? row.TotalDonations : row.totaldonations !== undefined ? row.totaldonations : null,
  };
}

// Helper: normalize a survey DB row (which has lowercase keys from PG)
function normalizeSurveyRow(row) {
  if (!row) return null;
  return {
    SurveyID: row.surveyid || row.SurveyID || null,
    RegistrationID: row.registrationid || row.RegistrationID || null,
    SurveySatisfactionScore: row.surveysatisfactionscore || row.SurveySatisfactionScore || null,
    SurveyUsefulnessScore: row.surveyusefulnessscore || row.SurveyUsefulnessScore || null,
    SurveyInstructorScore: row.surveyinstructorscore || row.SurveyInstructorScore || null,
    SurveyRecommendationScore: row.surveyrecommendationscore || row.SurveyRecommendationScore || null,
    SurveyOverallScore: row.surveyoverallscore || row.SurveyOverallScore || null,
    SurveyNPSBucket: row.surveynpsbucket || row.SurveyNPSBucket || null,
    SurveyComments: row.surveycomments || row.SurveyComments || null,
    SurveySubmissionDate: row.surveysubmissiondate || row.SurveySubmissionDate || null,
    ParticipantEmail: row.participantemail || row.ParticipantEmail || null,
    ParticipantFirstName: row.participantfirstname || row.ParticipantFirstName || null,
    ParticipantLastName: row.participantlastname || row.ParticipantLastName || null,
    EventName: row.eventname || row.EventName || null,
  };
}

// ==============================
// HOME PAGE (Public Landing Page)
// ==============================
app.get("/", async (req, res) => {
  try {
    const today = new Date();

    // Pull upcoming events for the homepage
    const events = await knex("EventOccurences")
      .select(
        "EventOccurrenceID",
        "EventName",
        "EventDateTimeStart",
        "EventDateTimeEnd",
        "EventLocation"
      )
      .where("EventDateTimeStart", ">", today)
      .orderBy("EventDateTimeStart", "asc")
      .limit(6);

    res.render("index", {
      events,
      isLoggedIn: req.session.isLoggedIn || false,
      userEmail: req.session.email || null,
      userLevel: req.session.userLevel || null
    });

  } catch (err) {
    console.error("Error loading homepage:", err);

    res.render("index", {
      events: [],
      isLoggedIn: req.session.isLoggedIn || false,
      userEmail: req.session.email || null,
      userLevel: req.session.userLevel || null
    });
  }
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
  const userLevel = req.session.userLevel;

  try {
    const registeredEvents = await knex("registrations as r")
      .join("EventOccurences as e", "e.EventOccurrenceID", "r.EventOccurrenceID")
      .join("participants as p", "p.ParticipantID", "r.ParticipantID")
      .select(
        "e.EventName",
        "e.EventDateTimeStart",
        "e.EventLocation",
        "e.EventOccurrenceID",
      )
      .where("p.ParticipantEmail", userEmail)
      .orderBy("e.EventDateTimeStart", "asc");

    const donationData = await knex("donations as d")
      .join("participants as p", "p.ParticipantID", "d.ParticipantID")
      .where("p.ParticipantEmail", userEmail)
      .sum({ total: "DonationAmount" })
      .first();

    const donationTotal = donationData?.total || 0;

    const milestones = await knex("milestones as m")
      .join("participants as p", "p.ParticipantID", "m.ParticipantID")
      .where("p.ParticipantEmail", userEmail)
      .count({ count: "*" })
      .first();

    const milestoneCount = milestones?.count || 0;

    const surveys = await knex("Surveys as s")
      .join("Registrations as r", "r.RegistrationID", "s.RegistrationID")
      .join("participants as p", "p.ParticipantID", "r.ParticipantID")
      .leftJoin("EventOccurences as e", "e.EventOccurrenceID", "r.EventOccurrenceID")
      .select(
        "s.SurveyID",
        "s.SurveyOverallScore",
        "s.SurveyComments",
        "s.SurveySubmissionDate",
        "e.EventName",
        "r.RegistrationID"
      )
      .where("p.ParticipantEmail", userEmail)
      .orderBy("s.SurveySubmissionDate", "desc");

    res.render("userDashboard", {
      registeredEvents,
      donationTotal,
      milestoneCount,
      surveys,
      userLevel,
    });

  } catch (err) { 
    console.error(err);
    res.render("userDashboard", {
      registeredEvents: [],
      donationTotal: 0,
      milestoneCount: 0,
      surveys: [],
      userLevel,
    });
  }
});


// ==============================
// DISPLAY FUTURE EVENTS
// ==============================
app.get("/displayEvents", async (req, res) => {
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
    const surveyId = req.query.id;

    // Normalize session level for comparison
    const userLevel = (req.session.userLevel || "").toString().toUpperCase();

    // If viewing a single survey detail (admin only)
    if (surveyId && userLevel === "M") {
      try {
        const survey = await knex("Surveys as s")
          .join("Registrations as r", "r.RegistrationID", "s.RegistrationID")
          .join("Participants as p", "p.ParticipantID", "r.ParticipantID")
          .leftJoin("EventOccurences as e", "e.EventOccurrenceID", "r.EventOccurrenceID")
          .select(
            "s.SurveyID",
            "s.RegistrationID",
            "s.SurveySatisfactionScore",
            "s.SurveyUsefulnessScore",
            "s.SurveyInstructorScore",
            "s.SurveyRecommendationScore",
            "s.SurveyOverallScore",
            "s.SurveyNPSBucket",
            "s.SurveyComments",
            "s.SurveySubmissionDate",
            "p.ParticipantID",
            "p.ParticipantEmail",
            "p.ParticipantFirstName",
            "p.ParticipantLastName",
            "p.ParticipantPhone",
            "e.EventName",
            "e.EventDateTimeStart"
          )
          .where("s.SurveyID", parseInt(surveyId, 10))
          .first();

        if (!survey) {
          return res.status(404).send("Survey not found");
        }

        const normalizedSurvey = normalizeSurveyRow(survey);
        return res.render("displaySurveys", { survey: normalizedSurvey, userLevel });
      } catch (err) {
        console.error("Error loading survey detail:", err);
        return res.status(500).send("Error loading survey");
      }
    }

    // If manager/admin, show all survey submissions with full details
    if (userLevel === "M") {
      const surveys = await knex("Surveys as s")
        .join("Registrations as r", "r.RegistrationID", "s.RegistrationID")
        .join("Participants as p", "p.ParticipantID", "r.ParticipantID")
        .leftJoin("EventOccurences as e", "e.EventOccurrenceID", "r.EventOccurrenceID")
        .select(
          "s.SurveyID",
          "s.RegistrationID",
          "s.SurveySatisfactionScore",
          "s.SurveyUsefulnessScore",
          "s.SurveyInstructorScore",
          "s.SurveyRecommendationScore",
          "s.SurveyOverallScore",
          "s.SurveyNPSBucket",
          "s.SurveyComments",
          "s.SurveySubmissionDate",
          "p.ParticipantEmail",
          "p.ParticipantFirstName",
          "p.ParticipantLastName",
          "e.EventName"
        )
        .orderBy("s.SurveySubmissionDate", "desc");

      // Normalize all survey rows to CamelCase for template consistency
      const normalizedSurveys = surveys.map(normalizeSurveyRow);

      // Group surveys by event and filter out ones with null scores
      const groupedByEvent = {};
      normalizedSurveys.forEach((survey) => {
        const eventName = survey.EventName || "Unknown Event";
        if (!groupedByEvent[eventName]) {
          groupedByEvent[eventName] = [];
        }

        // Only include surveys where all score fields are non-null
        const hasAllScores =
          survey.SurveySatisfactionScore !== null &&
          survey.SurveyUsefulnessScore !== null &&
          survey.SurveyInstructorScore !== null &&
          survey.SurveyRecommendationScore !== null;

        if (hasAllScores) {
          groupedByEvent[eventName].push(survey);
        }
      });

      return res.render("displaySurveys", { groupedSurveys: groupedByEvent, userLevel });
    }

    // Regular users: show their registrations so they can submit surveys
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

// Delete a survey (admin only)
app.post("/deleteSurvey", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  const userLevel = (req.session.userLevel || "").toString().toUpperCase();
  if (userLevel !== "M") return res.status(403).send("Forbidden");

  try {
    const { surveyId } = req.body;

    if (!surveyId) {
      return res.redirect("/displaySurveys");
    }

    // Delete the survey
    await knex("Surveys")
      .where("SurveyID", parseInt(surveyId, 10))
      .del();

    res.redirect("/displaySurveys");
  } catch (err) {
    console.error("Error deleting survey:", err);
    res.redirect("/displaySurveys");
  }
});

// Display participants: if admin and ?all=true show all, otherwise show current user's participant record
app.get("/displayParticipants", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  try {
    const userEmail = req.session.email;

    // no-op: proceed with session values (no debug output)

    // Normalize session level to uppercase for comparison (DB uses 'M' or 'U')
    const userLevel = (req.session.userLevel || "").toString().toUpperCase();

    // Admin/Manager users ('M') can view participants. Show all by default for 'M'.
    if (userLevel === "M") {
      // If an id is provided, show single participant detail
      if (req.query.id) {
        const id = parseInt(req.query.id, 10);
        if (!isNaN(id)) {
          let participantById = await knex("Participants")
            .where("ParticipantID", id)
            .first();

          participantById = normalizeParticipantRow(participantById);

          return res.render("displayParticipants", { participant: participantById, userLevel });
        }
      }

      // Otherwise show the full participant list for managers
      const participants = await knex("Participants")
        .select(
          "ParticipantID",
          "ParticipantEmail",
          "ParticipantFirstName",
          "ParticipantLastName",
          "ParticipantDOB",
          "ParticipantRole",
          "ParticipantPhone",
          "ParticipantCity",
          "ParticipantState",
          "ParticipantZip",
          "ParticipantSchoolOrEmployer",
          "ParticipantFieldOfInterest",
          "TotalDonations",
        )
        .orderBy("ParticipantLastName", "asc");

      const normalized = participants.map(normalizeParticipantRow);
      
      // Group participants by city
      const groupedByCity = {};
      normalized.forEach((p) => {
        const city = p.ParticipantCity || "Unknown City";
        if (!groupedByCity[city]) {
          groupedByCity[city] = [];
        }
        groupedByCity[city].push(p);
      });
      
      return res.render("displayParticipants", { groupedParticipants: groupedByCity, userLevel });
    }

    // Regular users: fetch their participant record by email
    let participant = await knex("Participants")
      .where("ParticipantEmail", userEmail)
      .first();

    participant = normalizeParticipantRow(participant);

    res.render("displayParticipants", { participant, userLevel });
  } catch (err) {
    console.error("Error loading participants:", err);
    res.render("displayParticipants", { participant: null, userLevel: (req.session.userLevel||"").toString().toUpperCase() });
  }
});

app.get("/displayUsers", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  
  try {
    const users = await knex("Participant").select("*");
    
    res.render("displayUsers", {
      userLevel: req.session.userLevel || null,
      users: users || []
    });
  } catch (err) {
    console.error("Error loading users:", err);
    res.render("displayUsers", {
      userLevel: req.session.userLevel || null,
      users: []
    });
  }
});

app.get("/editUser", (req, res) => {
  res.render("editUser");
});
app.get("/tableauDashboard", (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  
  res.render("tableauDashboard", {
    isLoggedIn: req.session.isLoggedIn || false,
    userLevel: req.session.userLevel || null
  });
});

// Display milestones for current user
app.get("/displayMilestones", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  try {
    const userEmail = req.session.email;

    // Fetch participant by email
    const participant = await knex("Participants")
      .where("ParticipantEmail", userEmail)
      .first();

    if (!participant) {
      return res.render("displayMilestones", { milestones: [], participantName: "Unknown" });
    }

    const participantId = participant.participantid || participant.ParticipantID;

    // Fetch milestones for this participant
    const milestones = await knex("Milestones")
      .where("ParticipantID", participantId)
      .orderBy("MilestoneDate", "desc");

    // Normalize milestone keys (lowercase from DB)
    const normalizedMilestones = milestones.map((m) => ({
      MilestoneID: m.milestoneid || m.MilestoneID || null,
      ParticipantID: m.participantid || m.ParticipantID || null,
      MilestoneTitle: m.milestonetitle || m.MilestoneTitle || null,
      MilestoneDate: m.milestonedate || m.MilestoneDate || null,
    }));

    const participantName = participant.participantfirstname || participant.ParticipantFirstName
      ? `${participant.participantfirstname || participant.ParticipantFirstName} ${participant.participantlastname || participant.ParticipantLastName}`
      : "Your";

    res.render("displayMilestones", { milestones: normalizedMilestones, participantName, participantId });
  } catch (err) {
    console.error("Error loading milestones:", err);
    res.render("displayMilestones", { milestones: [], participantName: "Unknown" });
  }
});

// Add a new milestone (self-reported)
app.post("/addMilestone", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  try {
    const userEmail = req.session.email;
    const { milestoneTitle, milestoneDate } = req.body;

    console.log("DEBUG: Adding milestone - Email:", userEmail, "Title:", milestoneTitle, "Date:", milestoneDate);

    // Validate input
    if (!milestoneTitle || !milestoneDate) {
      console.log("DEBUG: Missing title or date");
      return res.redirect("/displayMilestones");
    }

    // Fetch participant by email
    const participant = await knex("Participants")
      .where("ParticipantEmail", userEmail)
      .first();

    console.log("DEBUG: Participant found:", participant ? "Yes" : "No");

    if (!participant) {
      return res.redirect("/displayMilestones");
    }

    const participantId = participant.participantid || participant.ParticipantID;
    console.log("DEBUG: Participant ID:", participantId);

    // Get next MilestoneID - find the actual maximum
    const maxMilestone = await knex("Milestones").max("MilestoneID").first();
    const currentMax = Object.values(maxMilestone)[0] || 0;
    const nextId = currentMax + 1;

    console.log("DEBUG: Max milestone result:", maxMilestone, "Current max:", currentMax, "Next ID:", nextId);

    // Insert new milestone
    const insertResult = await knex("Milestones").insert({
      MilestoneID: nextId,
      ParticipantID: participantId,
      MilestoneTitle: milestoneTitle.trim(),
      MilestoneDate: milestoneDate,
    });

    console.log("DEBUG: Insert result:", insertResult);

    res.redirect("/displayMilestones");
  } catch (err) {
    console.error("Error adding milestone:", err);
    res.redirect("/displayMilestones");
  }
});

// Delete a milestone
app.post("/deleteMilestone", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  try {
    const { milestoneId } = req.body;

    if (!milestoneId) {
      return res.redirect("/displayMilestones");
    }

    // Delete the milestone
    await knex("Milestones")
      .where("MilestoneID", parseInt(milestoneId, 10))
      .del();

    res.redirect("/displayMilestones");
  } catch (err) {
    console.error("Error deleting milestone:", err);
    res.redirect("/displayMilestones");
  }
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

// Delete participant (admin only)
app.post('/deleteParticipant', async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');

  const userLevel = (req.session.userLevel || '').toString().toUpperCase();
  if (userLevel !== 'M') return res.status(403).send('Forbidden');

  const id = parseInt(req.body.participantId || req.body.id, 10);
  if (isNaN(id)) return res.redirect('/displayParticipants');

  // require explicit confirmation flag from the POST form
  const confirmed = req.body.confirm === 'on' || req.body.confirm === 'yes' || req.body.confirm === 'true';
  if (!confirmed) {
    // redirect to confirmation page if not confirmed
    return res.redirect(`/confirmDeleteParticipant?participantId=${id}`);
  }

  try {
    await knex.transaction(async (trx) => {
      // delete surveys linked to registrations for this participant
      const regs = await trx('Registrations').where('ParticipantID', id).select('RegistrationID');
      const regIds = regs.map(r => r.RegistrationID || r.registrationid).filter(Boolean);
      if (regIds.length) {
        await trx('Surveys').whereIn('RegistrationID', regIds).del();
      }

      // delete registrations
      await trx('Registrations').where('ParticipantID', id).del();

      // delete donations and milestones
      await trx('Donations').where('ParticipantID', id).del();
      await trx('Milestones').where('ParticipantID', id).del();

      // finally delete participant
      await trx('Participants').where('ParticipantID', id).del();
    });

    return res.redirect('/displayParticipants');
  } catch (err) {
    console.error('Error deleting participant:', err);
    return res.redirect('/displayParticipants');
  }
});

// Confirmation page for deletion
app.get('/confirmDeleteParticipant', async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');

  const userLevel = (req.session.userLevel || '').toString().toUpperCase();
  if (userLevel !== 'M') return res.status(403).send('Forbidden');

  const id = parseInt(req.query.participantId || req.query.id, 10);
  if (isNaN(id)) return res.redirect('/displayParticipants');

  try {
    let participant = await knex('Participants').where('ParticipantID', id).first();
    participant = normalizeParticipantRow(participant);
    if (!participant) return res.redirect('/displayParticipants');

    res.render('confirmDeleteParticipant', { participant, userLevel });
  } catch (err) {
    console.error('Error loading confirm delete page:', err);
    res.redirect('/displayParticipants');
  }
});

// View milestones (M-level users, grouped by title)
app.get("/viewMilestones", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  const userLevel = (req.session.userLevel || "").toString().toUpperCase();
  if (userLevel !== "M") return res.status(403).send("Forbidden");

  try {
    const titleQuery = req.query.title;
    // Fetch all milestones with participant info
    const milestones = await knex("Milestones as m")
      .join("Participants as p", "p.ParticipantID", "m.ParticipantID")
      .select(
        "m.MilestoneID",
        "m.MilestoneTitle",
        "m.MilestoneDate",
        "p.ParticipantID",
        "p.ParticipantFirstName",
        "p.ParticipantLastName",
        "p.ParticipantEmail"
      )
      .orderBy("m.MilestoneDate", "desc");

    // Normalize and group by title
    const grouped = {};
    milestones.forEach((m) => {
      const title = m.milestonetitle || m.MilestoneTitle || "Untitled";
      const participantName = (m.participantfirstname || m.ParticipantFirstName || "") + " " + (m.participantlastname || m.ParticipantLastName || "");
      const item = {
        MilestoneID: m.milestoneid || m.MilestoneID,
        MilestoneTitle: title,
        MilestoneDate: m.milestonedate || m.MilestoneDate,
        ParticipantID: m.participantid || m.ParticipantID,
        ParticipantName: participantName.trim(),
        ParticipantEmail: m.participantemail || m.ParticipantEmail,
      };
      if (!grouped[title]) grouped[title] = [];
      grouped[title].push(item);
    });

    // Focused view if title is selected
    if (titleQuery && grouped[titleQuery]) {
      return res.render("viewMilestones", {
        focusedMilestone: { title: titleQuery, items: grouped[titleQuery] },
        milestoneGroups: null,
        userLevel,
      });
    }

    // Otherwise show grouped list
    return res.render("viewMilestones", {
      milestoneGroups: grouped,
      focusedMilestone: null,
      userLevel,
    });
  } catch (err) {
    console.error("Error loading milestones for M-level:", err);
    res.render("viewMilestones", { milestoneGroups: {}, focusedMilestone: null, userLevel });
  }
});

app.get("/teapot", (req, res) => {
  res.status(418).render("teapot");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// start server
app.listen(port, "0.0.0.0", () => {
  console.log(`The server is listening port ${process.env.APP_PORT}`);
});