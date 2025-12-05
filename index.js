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
app.use(express.json());

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
  // Skip authentication for login routes and public donation routes
  if (req.path === "/" || req.path === "/login" || req.path === "/logout" || req.path === "/displayEvents" || req.path === "/health" || req.path === "/donate" || req.path === "/submitDonation" || req.path === "/registerParticipant" || req.path === "/submitParticipantRegistration" || req.path === "/completeDonation") {
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

// Helper: normalize a donation DB row (which has lowercase keys from PG)
function normalizeDonationRow(row) {
  if (!row) return null;
  return {
    DonationID: row.donationid || row.DonationID || null,
    ParticipantID: row.participantid || row.ParticipantID || null,
    DonationDate: row.donationdate || row.DonationDate || null,
    DonationAmount: row.donationamount || row.DonationAmount || null,
    ParticipantFirstName: row.participantfirstname || row.ParticipantFirstName || null,
    ParticipantLastName: row.participantlastname || row.ParticipantLastName || null,
    ParticipantEmail: row.participantemail || row.ParticipantEmail || null,
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
    const userLevel = req.session.userLevel || null;

    // If an id is provided, show single event detail
    if (req.query.id) {
      const id = parseInt(req.query.id, 10);
      if (!isNaN(id)) {
        const eventData = await knex("EventOccurences as eo")
          .join("EventTemplates as et", "eo.EventTemplateID", "et.EventTemplateID")
          .select(
            "eo.EventOccurrenceID",
            "eo.EventName",
            "eo.EventDateTimeStart",
            "eo.EventDateTimeEnd",
            "eo.EventLocation",
            "eo.EventCapacity",
            "eo.EventRegistrationDeadline",
            "et.EventType",
            "et.EventDescription"
          )
          .where("eo.EventOccurrenceID", id)
          .first();

        if (eventData) {
          const event = {
            EventOccurrenceID: eventData.eventoccurrenceid || eventData.EventOccurrenceID,
            EventName: eventData.eventname || eventData.EventName,
            EventDateTimeStart: eventData.eventdatetimestart || eventData.EventDateTimeStart,
            EventDateTimeEnd: eventData.eventdatetimeend || eventData.EventDateTimeEnd,
            EventLocation: eventData.eventlocation || eventData.EventLocation,
            EventCapacity: eventData.eventcapacity || eventData.EventCapacity,
            EventRegistrationDeadline: eventData.eventregistrationdeadline || eventData.EventRegistrationDeadline,
            EventType: eventData.eventtype || eventData.EventType,
            EventDescription: eventData.eventdescription || eventData.EventDescription
          };

          return res.render("displayEvents", {
            event: event,
            userLevel: userLevel
          });
        }
      }
    }

    // Otherwise show the full event list
    // Fetch all events with event template info
    const events = await knex("EventOccurences as eo")
      .join("EventTemplates as et", "eo.EventTemplateID", "et.EventTemplateID")
      .select(
        "eo.EventOccurrenceID",
        "eo.EventName",
        "eo.EventDateTimeStart",
        "eo.EventDateTimeEnd",
        "eo.EventLocation",
        "eo.EventCapacity",
        "eo.EventRegistrationDeadline",
        "et.EventType",
        "et.EventDescription"
      )
      .orderBy("eo.EventDateTimeStart", "asc");

    // Normalize the rows (handle lowercase column names from knex)
    const normalizedEvents = events.map(e => ({
      EventOccurrenceID: e.eventoccurrenceid || e.EventOccurrenceID,
      EventName: e.eventname || e.EventName,
      EventDateTimeStart: e.eventdatetimestart || e.EventDateTimeStart,
      EventDateTimeEnd: e.eventdatetimeend || e.EventDateTimeEnd,
      EventLocation: e.eventlocation || e.EventLocation,
      EventCapacity: e.eventcapacity || e.EventCapacity,
      EventRegistrationDeadline: e.eventregistrationdeadline || e.EventRegistrationDeadline,
      EventType: e.eventtype || e.EventType,
      EventDescription: e.eventdescription || e.EventDescription
    }));

    // Group events by EventType
    const groupedEvents = {};
    normalizedEvents.forEach(event => {
      const eventType = event.EventType || "Other";
      if (!groupedEvents[eventType]) {
        groupedEvents[eventType] = [];
      }
      groupedEvents[eventType].push(event);
    });

    res.render("displayEvents", {
      groupedEvents: groupedEvents,
      userLevel: userLevel
    });
  } catch (err) {
    console.error("Error loading events:", err);
    res.render("displayEvents", {
      groupedEvents: {},
      userLevel: req.session.userLevel || null
    });
  }
});

// Add new event form
app.get("/addEvent", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  
  try {
    // Fetch all event templates for dropdown
    const eventTemplates = await knex("EventTemplates").select("*");
    
    // Get unique event types to avoid duplicates in dropdown
    const uniqueTypes = [];
    const seenTypes = new Set();
    
    eventTemplates.forEach(template => {
      const eventType = template.eventtype || template.EventType;
      if (eventType && !seenTypes.has(eventType)) {
        seenTypes.add(eventType);
        uniqueTypes.push({
          EventType: eventType,
          // Find first template with this type for the ID
          EventTemplateID: eventTemplates.find(t => (t.eventtype || t.EventType) === eventType).eventtemplateid || eventTemplates.find(t => (t.eventtype || t.EventType) === eventType).EventTemplateID
        });
      }
    });
    
    res.render("addEvent", { eventTemplates: uniqueTypes });
  } catch (err) {
    console.error("Error loading add event form:", err);
    res.status(500).send("Error loading form");
  }
});

// Submit new event
app.post("/submitEvent", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  
  try {
    const {
      eventName,
      eventLocation,
      eventDateTimeStart,
      eventDateTimeEnd,
      eventCapacity,
      eventRegistrationDeadline,
      eventTemplateID
    } = req.body;

    // Get the next EventOccurrenceID
    const maxRow = await knex('EventOccurences').max('EventOccurrenceID as max').first();
    const nextId = maxRow && maxRow.max ? parseInt(maxRow.max, 10) + 1 : 1;

    const insertResult = await knex("EventOccurences").insert({
      EventOccurrenceID: nextId,
      EventName: eventName,
      EventLocation: eventLocation,
      EventDateTimeStart: eventDateTimeStart,
      EventDateTimeEnd: eventDateTimeEnd,
      EventCapacity: eventCapacity,
      EventRegistrationDeadline: eventRegistrationDeadline,
      EventTemplateID: eventTemplateID
    });

    res.json({ success: true, eventId: nextId });
  } catch (err) {
    console.error("Error creating event:", err);
    res.json({ success: false, message: err.message });
  }
});

// Edit event form
app.get("/editEvent", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  
  try {
    const eventId = req.query.id;
    const event = await knex("EventOccurences as eo")
      .join("EventTemplates as et", "eo.EventTemplateID", "et.EventTemplateID")
      .where("eo.EventOccurrenceID", eventId)
      .select(
        "eo.EventOccurrenceID",
        "eo.EventName",
        "eo.EventDateTimeStart",
        "eo.EventDateTimeEnd",
        "eo.EventLocation",
        "eo.EventCapacity",
        "eo.EventRegistrationDeadline",
        "eo.EventTemplateID",
        "et.EventType",
        "et.EventDescription"
      )
      .first();

    if (!event) {
      return res.status(404).send("Event not found");
    }

    const eventTemplates = await knex("EventTemplates").select("*");
    
    // Get unique event types to avoid duplicates in dropdown
    const uniqueTypes = [];
    const seenTypes = new Set();
    
    eventTemplates.forEach(template => {
      const eventType = template.eventtype || template.EventType;
      if (eventType && !seenTypes.has(eventType)) {
        seenTypes.add(eventType);
        uniqueTypes.push({
          EventType: eventType,
          // Find first template with this type for the ID
          EventTemplateID: eventTemplates.find(t => (t.eventtype || t.EventType) === eventType).eventtemplateid || eventTemplates.find(t => (t.eventtype || t.EventType) === eventType).EventTemplateID
        });
      }
    });
    
    // Normalize event data
    const normalizedEvent = {
      EventOccurrenceID: event.eventoccurrenceid || event.EventOccurrenceID,
      EventName: event.eventname || event.EventName,
      EventDateTimeStart: event.eventdatetimestart || event.EventDateTimeStart,
      EventDateTimeEnd: event.eventdatetimeend || event.EventDateTimeEnd,
      EventLocation: event.eventlocation || event.EventLocation,
      EventCapacity: event.eventcapacity || event.EventCapacity,
      EventRegistrationDeadline: event.eventregistrationdeadline || event.EventRegistrationDeadline,
      EventTemplateID: event.eventtemplateid || event.EventTemplateID
    };

    res.render("editEvent", { event: normalizedEvent, eventTemplates: uniqueTypes });
  } catch (err) {
    console.error("Error loading edit event form:", err);
    res.status(500).send("Error loading form");
  }
});

// Update event
app.post("/updateEvent", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  
  try {
    const {
      eventId,
      eventName,
      eventLocation,
      eventDateTimeStart,
      eventDateTimeEnd,
      eventCapacity,
      eventRegistrationDeadline,
      eventTemplateID
    } = req.body;

    await knex("EventOccurences")
      .where("EventOccurrenceID", eventId)
      .update({
        EventName: eventName,
        EventLocation: eventLocation,
        EventDateTimeStart: eventDateTimeStart,
        EventDateTimeEnd: eventDateTimeEnd,
        EventCapacity: eventCapacity,
        EventRegistrationDeadline: eventRegistrationDeadline,
        EventTemplateID: eventTemplateID
      });

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating event:", err);
    res.json({ success: false, message: err.message });
  }
});

// Delete event
app.post("/deleteEvent", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  
  try {
    const { eventId } = req.body;

    await knex("EventOccurences")
      .where("EventOccurrenceID", eventId)
      .del();

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.json({ success: false, message: err.message });
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

        // Fetch all participants and registrations for add survey form
        const participants = await knex("Participants")
          .select("ParticipantID", "ParticipantFirstName", "ParticipantLastName", "ParticipantEmail")
          .orderBy("ParticipantLastName", "asc");
      
        const registrations = await knex("Registrations as r")
          .join("Participants as p", "p.ParticipantID", "r.ParticipantID")
          .join("EventOccurences as e", "e.EventOccurrenceID", "r.EventOccurrenceID")
          .select(
            "r.RegistrationID",
            "p.ParticipantFirstName",
            "p.ParticipantLastName",
            "p.ParticipantEmail",
            "e.EventName",
            "e.EventDateTimeStart"
          )
          .orderBy("e.EventName", "asc");

        return res.render("displaySurveys", { 
          groupedSurveys: groupedByEvent, 
          participants: participants.map(normalizeParticipantRow),
          registrations,
          userLevel 
        });
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
// Create new survey (admin only)
app.post('/createSurvey', async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');

  const userLevel = (req.session.userLevel || '').toString().toUpperCase();
  if (userLevel !== 'M') return res.status(403).send('Forbidden');

  try {
    const { registrationId, satisfaction, usefulness, instructor, recommend, comments } = req.body;

    const satisfactionScore = satisfaction ? parseFloat(satisfaction) : null;
    const usefulnessScore = usefulness ? parseFloat(usefulness) : null;
    const instructorScore = instructor ? parseFloat(instructor) : null;
    const recommendScore = recommend ? parseFloat(recommend) : null;

    // Compute overall score
    const scores = [satisfactionScore, usefulnessScore, instructorScore, recommendScore].filter(
      (s) => s !== null && !isNaN(s)
    );
    const overall = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    // Determine NPS bucket
    let npsBucket = null;
    if (overall !== null) {
      if (overall >= 4.5) npsBucket = 'Promoter';
      else if (overall >= 3.0) npsBucket = 'Passive';
      else npsBucket = 'Detractor';
    }

    // Get next SurveyID
    const maxRow = await knex('Surveys').max('SurveyID as max').first();
    const nextId = maxRow && maxRow.max ? parseInt(maxRow.max, 10) + 1 : 1;

    await knex('Surveys').insert({
      SurveyID: nextId,
      RegistrationID: parseInt(registrationId, 10),
      SurveySatisfactionScore: satisfactionScore,
      SurveyUsefulnessScore: usefulnessScore,
      SurveyInstructorScore: instructorScore,
      SurveyRecommendationScore: recommendScore,
      SurveyOverallScore: overall,
      SurveyNPSBucket: npsBucket,
      SurveyComments: comments ? comments.trim() : null,
      SurveySubmissionDate: new Date(),
    });

    return res.redirect('/displaySurveys');
  } catch (err) {
    console.error('Error creating survey:', err);
    return res.redirect('/displaySurveys');
  }
});

// Update survey (admin only)
app.post('/updateSurvey', async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');

  const userLevel = (req.session.userLevel || '').toString().toUpperCase();
  if (userLevel !== 'M') return res.status(403).send('Forbidden');

  const surveyId = parseInt(req.body.surveyId, 10);
  if (isNaN(surveyId)) return res.redirect('/displaySurveys');

  try {
    const { satisfaction, usefulness, instructor, recommend, comments } = req.body;

    const satisfactionScore = satisfaction ? parseFloat(satisfaction) : null;
    const usefulnessScore = usefulness ? parseFloat(usefulness) : null;
    const instructorScore = instructor ? parseFloat(instructor) : null;
    const recommendScore = recommend ? parseFloat(recommend) : null;

    // Compute overall score
    const scores = [satisfactionScore, usefulnessScore, instructorScore, recommendScore].filter(
      (s) => s !== null && !isNaN(s)
    );
    const overall = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    // Determine NPS bucket
    let npsBucket = null;
    if (overall !== null) {
      if (overall >= 4.5) npsBucket = 'Promoter';
      else if (overall >= 3.0) npsBucket = 'Passive';
      else npsBucket = 'Detractor';
    }

    await knex('Surveys')
      .where('SurveyID', surveyId)
      .update({
        SurveySatisfactionScore: satisfactionScore,
        SurveyUsefulnessScore: usefulnessScore,
        SurveyInstructorScore: instructorScore,
        SurveyRecommendationScore: recommendScore,
        SurveyOverallScore: overall,
        SurveyNPSBucket: npsBucket,
        SurveyComments: comments ? comments.trim() : null,
      });

    return res.redirect(`/displaySurveys?id=${surveyId}`);
  } catch (err) {
    console.error('Error updating survey:', err);
    return res.redirect('/displaySurveys');
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

          // Fetch milestones for this participant
          const milestones = await knex("Milestones")
            .where("ParticipantID", id)
            .orderBy("MilestoneDate", "desc");

          const normalizedMilestones = milestones.map((m) => ({
            MilestoneID: m.milestoneid || m.MilestoneID || null,
            ParticipantID: m.participantid || m.ParticipantID || null,
            MilestoneTitle: m.milestonetitle || m.MilestoneTitle || null,
            MilestoneDate: m.milestonedate || m.MilestoneDate || null,
          }));

          // Fetch total donations for this participant
          const donationTotal = await knex("Donations")
            .where("ParticipantID", id)
            .sum("DonationAmount as totalAmount")
            .first();
          
          participantById.TotalDonations = donationTotal.totalamount || donationTotal.totalAmount || 0;

          return res.render("displayParticipants", { 
            participant: participantById, 
            milestones: normalizedMilestones,
            userLevel 
          });
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
          "ParticipantFieldOfInterest"
        )
        .orderBy("ParticipantLastName", "asc");

      // Fetch donation totals for each participant
      const donationTotals = await knex("Donations")
        .select("ParticipantID")
        .sum("DonationAmount as totalDonations")
        .groupBy("ParticipantID");

      // Create a map of participant ID to total donations
      const donationMap = {};
      donationTotals.forEach((row) => {
        donationMap[row.participantid || row.ParticipantID] = row.totaldonations || row.totalDonations || 0;
      });

      // Add total donations to each participant
      const normalized = participants.map((p) => {
        const normalized = normalizeParticipantRow(p);
        normalized.TotalDonations = donationMap[p.participantid || p.ParticipantID] || 0;
        return normalized;
      });
      
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
  if (req.session.userLevel !== "M") return res.redirect("/userDashboard");
  
  try {
    const users = await knex("Users").select("*").orderBy("ID", "asc");
    
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

// GET /addUser - Display form to add new user (M-level only)
app.get("/addUser", (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  if (req.session.userLevel !== "M") return res.redirect("/userDashboard");
  
  res.render("editUser", {
    user: { id: null, email: "", password: "", level: "U" },
    isNew: true,
    userLevel: req.session.userLevel
  });
});

// GET /editUser/:id - Display form to edit user (M-level only)
app.get("/editUser/:id", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  if (req.session.userLevel !== "M") return res.redirect("/userDashboard");
  
  try {
    const user = await knex("Users").where("ID", parseInt(req.params.id, 10)).first();
    if (!user) {
      return res.status(404).send("User not found");
    }
    
    res.render("editUser", {
      user: {
        id: user.id || user.ID,
        email: user.email || user.Email,
        password: user.password || user.Password,
        level: user.level || user.Level
      },
      isNew: false,
      userLevel: req.session.userLevel
    });
  } catch (err) {
    console.error("Error loading user:", err);
    res.status(500).send("Error loading user");
  }
});

// POST /editUser/:id - Update or create user (M-level only)
app.post("/editUser/:id", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  if (req.session.userLevel !== "M") return res.redirect("/userDashboard");
  
  try {
    const { email, password, level } = req.body;
    const userId = req.params.id === "null" || req.params.id === "undefined" ? null : parseInt(req.params.id, 10);
    
    if (!email || !password || !level) {
      return res.render("editUser", {
        error_message: "Email, password, and level are required",
        user: { id: userId, email, password, level },
        isNew: !userId,
        userLevel: req.session.userLevel
      });
    }
    
    if (userId) {
      // Update existing user
      await knex("Users")
        .where("ID", userId)
        .update({
          Email: email,
          Password: password,
          Level: level
        });
    } else {
      // Create new user - find next available ID
      const lastUser = await knex("Users").select("ID").orderBy("ID", "desc").first();
      const nextId = (lastUser?.ID || 0) + 1;
      
      await knex("Users").insert({
        ID: nextId,
        Email: email,
        Password: password,
        Level: level
      });
    }
    
    res.redirect("/displayUsers");
  } catch (err) {
    console.error("Error saving user:", err);
    res.status(500).send("Error saving user");
  }
});

// POST /deleteUser/:id - Delete user (M-level only)
app.post("/deleteUser/:id", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  if (req.session.userLevel !== "M") return res.redirect("/userDashboard");
  
  try {
    const userId = parseInt(req.params.id, 10);
    
    // Prevent deleting the current user
    if (userId === req.session.userId) {
      return res.status(400).send("Cannot delete your own user account");
    }
    
    await knex("Users").where("ID", userId).del();
    
    res.redirect("/displayUsers");
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).send("Error deleting user");
  }
});
app.get("/tableauDashboard", (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  
  res.render("tableauDashboard", {
    isLoggedIn: req.session.isLoggedIn || false,
    userLevel: req.session.userLevel || null
  });
});

// Display milestones for current user with optional focused view
app.get("/displayMilestones", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  try {
    const userEmail = req.session.email;
    const { id } = req.query;

    // Fetch participant by email
    const participant = await knex("Participants")
      .where("ParticipantEmail", userEmail)
      .first();

    if (!participant) {
      return res.render("displayMilestones", { milestones: [], focusedMilestone: null, participantName: "Unknown" });
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

    // Focused milestone when id is provided
    let focusedMilestone = null;
    if (id) {
      focusedMilestone = normalizedMilestones.find((m) => `${m.MilestoneID}` === `${id}`) || null;
    }

    const participantName = participant.participantfirstname || participant.ParticipantFirstName
      ? `${participant.participantfirstname || participant.ParticipantFirstName} ${participant.participantlastname || participant.ParticipantLastName}`
      : "Your";

    res.render("displayMilestones", { milestones: normalizedMilestones, focusedMilestone, participantName, participantId });
  } catch (err) {
    console.error("Error loading milestones:", err);
    res.render("displayMilestones", { milestones: [], focusedMilestone: null, participantName: "Unknown" });
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

// Update milestone (self-reported)
app.post("/updateMilestone", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  try {
    const userEmail = req.session.email;
    const { milestoneId, milestoneTitle, milestoneDate } = req.body;

    if (!milestoneId || !milestoneTitle || !milestoneDate) {
      return res.redirect("/displayMilestones");
    }

    // Fetch participant by email
    const participant = await knex("Participants")
      .where("ParticipantEmail", userEmail)
      .first();

    if (!participant) {
      return res.redirect("/displayMilestones");
    }

    const participantId = participant.participantid || participant.ParticipantID;

    // Ensure milestone belongs to this participant
    const milestone = await knex("Milestones")
      .where({ MilestoneID: parseInt(milestoneId, 10), ParticipantID: participantId })
      .first();

    if (!milestone) {
      return res.redirect("/displayMilestones");
    }

    await knex("Milestones")
      .where("MilestoneID", parseInt(milestoneId, 10))
      .update({
        MilestoneTitle: milestoneTitle.trim(),
        MilestoneDate: milestoneDate,
      });

    return res.redirect(`/displayMilestones?id=${milestoneId}`);
  } catch (err) {
    console.error("Error updating milestone:", err);
    return res.redirect("/displayMilestones");
  }
});

// Add milestone for a participant (admin only)
app.post("/addParticipantMilestone", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  const userLevel = (req.session.userLevel || "").toString().toUpperCase();
  if (userLevel !== "M") return res.status(403).send("Forbidden");

  try {
    const { participantId, milestoneTitle, milestoneDate } = req.body;

    if (!participantId || !milestoneTitle || !milestoneDate) {
      return res.redirect(`/displayParticipants?id=${participantId}`);
    }

    // Get next MilestoneID
    const maxMilestone = await knex("Milestones").max("MilestoneID").first();
    const currentMax = Object.values(maxMilestone)[0] || 0;
    const nextId = currentMax + 1;

    await knex("Milestones").insert({
      MilestoneID: nextId,
      ParticipantID: parseInt(participantId, 10),
      MilestoneTitle: milestoneTitle.trim(),
      MilestoneDate: milestoneDate,
    });

    res.redirect(`/displayParticipants?id=${participantId}`);
  } catch (err) {
    console.error("Error adding milestone:", err);
    res.redirect("/displayParticipants");
  }
});

// Edit milestone for a participant (admin only)
app.post("/editParticipantMilestone", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  const userLevel = (req.session.userLevel || "").toString().toUpperCase();
  if (userLevel !== "M") return res.status(403).send("Forbidden");

  try {
    const { milestoneId, participantId, milestoneTitle, milestoneDate } = req.body;

    if (!milestoneId || !participantId) {
      return res.redirect("/displayParticipants");
    }

    await knex("Milestones")
      .where("MilestoneID", parseInt(milestoneId, 10))
      .update({
        MilestoneTitle: milestoneTitle.trim(),
        MilestoneDate: milestoneDate,
      });

    res.redirect(`/displayParticipants?id=${participantId}`);
  } catch (err) {
    console.error("Error editing milestone:", err);
    res.redirect("/displayParticipants");
  }
});

// Delete a milestone
app.post("/deleteMilestone", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");

  try {
    const { milestoneId, participantId } = req.body;

    if (!milestoneId) {
      return res.redirect("/displayMilestones");
    }

    // Delete the milestone
    await knex("Milestones")
      .where("MilestoneID", parseInt(milestoneId, 10))
      .del();

    // Redirect to participant view if participantId is provided
    if (participantId) {
      return res.redirect(`/displayParticipants?id=${participantId}`);
    }

    res.redirect("/displayMilestones");
  } catch (err) {
    console.error("Error deleting milestone:", err);
    if (req.body.participantId) {
      return res.redirect(`/displayParticipants?id=${req.body.participantId}`);
    }
    res.redirect("/displayMilestones");
  }
});

// Admin: add milestone for any participant
app.post("/addMilestoneAdmin", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  const userLevel = (req.session.userLevel || "").toString().toUpperCase();
  if (userLevel !== "M") return res.status(403).send("Forbidden");

  try {
    const { participantId, milestoneTitle, milestoneDate } = req.body;
    if (!participantId || !milestoneTitle || !milestoneDate) {
      return res.redirect("/viewMilestones");
    }

    const maxMilestone = await knex("Milestones").max("MilestoneID").first();
    const currentMax = Object.values(maxMilestone)[0] || 0;
    const nextId = currentMax + 1;

    await knex("Milestones").insert({
      MilestoneID: nextId,
      ParticipantID: parseInt(participantId, 10),
      MilestoneTitle: milestoneTitle.trim(),
      MilestoneDate: milestoneDate,
    });

    return res.redirect("/viewMilestones");
  } catch (err) {
    console.error("Error adding milestone (admin):", err);
    return res.redirect("/viewMilestones");
  }
});

// Admin: update milestone
app.post("/updateMilestoneAdmin", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  const userLevel = (req.session.userLevel || "").toString().toUpperCase();
  if (userLevel !== "M") return res.status(403).send("Forbidden");

  try {
    const { milestoneId, milestoneTitle, milestoneDate } = req.body;
    if (!milestoneId || !milestoneTitle || !milestoneDate) {
      return res.redirect("/viewMilestones");
    }

    await knex("Milestones")
      .where("MilestoneID", parseInt(milestoneId, 10))
      .update({
        MilestoneTitle: milestoneTitle.trim(),
        MilestoneDate: milestoneDate,
      });

    return res.redirect(`/viewMilestones?milestoneId=${milestoneId}`);
  } catch (err) {
    console.error("Error updating milestone (admin):", err);
    return res.redirect("/viewMilestones");
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

// Create new participant (admin only)
app.post('/createParticipant', async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');

  const userLevel = (req.session.userLevel || '').toString().toUpperCase();
  if (userLevel !== 'M') return res.status(403).send('Forbidden');

  try {
    // Get next ParticipantID
    const maxParticipant = await knex('Participants').max('ParticipantID').first();
    const currentMax = Object.values(maxParticipant)[0] || 0;
    const nextId = currentMax + 1;

    await knex('Participants').insert({
      ParticipantID: nextId,
      ParticipantFirstName: req.body.firstName || null,
      ParticipantLastName: req.body.lastName || null,
      ParticipantEmail: req.body.email || null,
      ParticipantPhone: req.body.phone || null,
      ParticipantDOB: req.body.dob || null,
      ParticipantRole: req.body.role || null,
      ParticipantCity: req.body.city || null,
      ParticipantState: req.body.state || null,
      ParticipantZip: req.body.zip || null,
      ParticipantSchoolOrEmployer: req.body.schoolOrEmployer || null,
      ParticipantFieldOfInterest: req.body.fieldOfInterest || null,
      TotalDonations: 0,
    });

    return res.redirect('/displayParticipants');
  } catch (err) {
    console.error('Error creating participant:', err);
    return res.redirect('/displayParticipants');
  }
});

// Update participant (admin only)
app.post('/updateParticipant', async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');

  const userLevel = (req.session.userLevel || '').toString().toUpperCase();
  if (userLevel !== 'M') return res.status(403).send('Forbidden');

  const id = parseInt(req.body.participantId, 10);
  if (isNaN(id)) return res.redirect('/displayParticipants');

  try {
    await knex('Participants')
      .where('ParticipantID', id)
      .update({
        ParticipantFirstName: req.body.firstName || null,
        ParticipantLastName: req.body.lastName || null,
        ParticipantEmail: req.body.email || null,
        ParticipantPhone: req.body.phone || null,
        ParticipantDOB: req.body.dob || null,
        ParticipantRole: req.body.role || null,
        ParticipantCity: req.body.city || null,
        ParticipantState: req.body.state || null,
        ParticipantZip: req.body.zip || null,
        ParticipantSchoolOrEmployer: req.body.schoolOrEmployer || null,
        ParticipantFieldOfInterest: req.body.fieldOfInterest || null,
      });

    return res.redirect(`/displayParticipants?id=${id}`);
  } catch (err) {
    console.error('Error updating participant:', err);
    return res.redirect('/displayParticipants');
  }
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

// View milestones (M-level users, grouped by title, with focused view)
app.get("/viewMilestones", async (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  const userLevel = (req.session.userLevel || "").toString().toUpperCase();
  if (userLevel !== "M") return res.status(403).send("Forbidden");

  try {
    const titleQuery = req.query.title;
    const milestoneIdQuery = req.query.milestoneId ? parseInt(req.query.milestoneId, 10) : null;

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

    // Fetch participants for add form
    const participants = await knex("Participants")
      .select("ParticipantID", "ParticipantFirstName", "ParticipantLastName", "ParticipantEmail")
      .orderBy("ParticipantLastName", "asc");

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

    // Focused view by milestone ID
    if (milestoneIdQuery) {
      const flat = Object.values(grouped).flat();
      const focused = flat.find((m) => m.MilestoneID === milestoneIdQuery);
      if (focused) {
        return res.render("viewMilestones", {
          focusedMilestone: focused,
          milestoneGroups: grouped,
          participants,
          userLevel,
        });
      }
    }

    // Focused view if title is selected
    if (titleQuery && grouped[titleQuery]) {
      return res.render("viewMilestones", {
        focusedMilestone: { title: titleQuery, items: grouped[titleQuery] },
        milestoneGroups: grouped,
        participants,
        userLevel,
      });
    }

    // Otherwise show grouped list
    return res.render("viewMilestones", {
      milestoneGroups: grouped,
      focusedMilestone: null,
      participants,
      userLevel,
    });
  } catch (err) {
    console.error("Error loading milestones for M-level:", err);
    res.render("viewMilestones", { milestoneGroups: {}, focusedMilestone: null, participants: [], userLevel });
  }
});

// ==============================
// DONATIONS
// ==============================

// GET /donate - Public donation form (no login required)
app.get("/donate", (req, res) => {
  res.render("addDonationPublic", {
    userLevel: req.session.userLevel || null,
    success_message: null,
    error_message: null
  });
});

// POST /submitDonation - Submit public donation form (no login required)
app.post("/submitDonation", async (req, res) => {
  try {
    const { donorName, donorEmail, donationAmount } = req.body;

    // Validation
    if (!donorName || !donorEmail || !donationAmount) {
      return res.render("addDonationPublic", {
        userLevel: req.session.userLevel || null,
        error_message: "All fields are required",
        success_message: null
      });
    }

    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.render("addDonationPublic", {
        userLevel: req.session.userLevel || null,
        error_message: "Please enter a valid donation amount",
        success_message: null
      });
    }

    // Check if donor already exists by email
    let participant = await knex("Participants")
      .where("ParticipantEmail", donorEmail)
      .first();

    let participantId;
    let isNewPerson = false;
    
    if (participant) {
      participantId = participant.participantid || participant.ParticipantID;
    } else {
      // New person - don't auto-create, instead show signup prompt
      isNewPerson = true;
      
      return res.render("addDonationPublic", {
        userLevel: req.session.userLevel || null,
        error_message: null,
        success_message: null,
        isNewPerson: true,
        donorName: donorName,
        donorEmail: donorEmail,
        donationAmount: donationAmount
      });
    }

    // Insert donation record with current timestamp
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get next available DonationID
    const maxDonationId = await knex("Donations")
      .max("DonationID as maxId")
      .first();
    const nextDonationId = (maxDonationId.maxid || 0) + 1;
    
    await knex("Donations").insert({
      DonationID: nextDonationId,
      ParticipantID: participantId,
      DonationAmount: amount,
      DonationDate: currentDate
    });

    // Success message
    res.render("addDonationPublic", {
      userLevel: req.session.userLevel || null,
      success_message: `Thank you for your generous donation of $${amount.toFixed(2)}! Your contribution helps support our mission.`,
      error_message: null
    });
  } catch (err) {
    console.error("Error processing donation:", err);
    console.error("Error details:", err.message, err.code);
    console.error("Stack trace:", err.stack);
    res.render("addDonationPublic", {
      userLevel: req.session.userLevel || null,
      error_message: "There was an error processing your donation. Please try again.",
      success_message: null
    });
  }
});

// Show participant registration form (for new donors)
app.get("/registerParticipant", (req, res) => {
  const { name, email, amount } = req.query;
  res.render("registerParticipant", {
    userLevel: req.session.userLevel || null,
    name: name || "",
    email: email || "",
    amount: amount || "0"
  });
});

// Submit new participant registration
app.post("/submitParticipantRegistration", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      donationAmount,
      phone,
      dateOfBirth,
      role,
      city,
      state,
      zip,
      schoolOrEmployer,
      fieldOfInterest
    } = req.body;

    // Validate required fields
    if (!firstName || !email || !donationAmount || donationAmount <= 0) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Find max ParticipantID and increment
    const maxID = await knex("Participants")
      .max("ParticipantID as maxId")
      .first();
    const newParticipantID = (maxID.maxid || 0) + 1;

    // Insert new participant with correct column names
    await knex("Participants").insert({
      ParticipantID: newParticipantID,
      ParticipantFirstName: firstName || null,
      ParticipantLastName: lastName || null,
      ParticipantEmail: email || null,
      ParticipantPhone: phone || null,
      ParticipantDOB: dateOfBirth ? new Date(dateOfBirth) : null,
      ParticipantRole: role || null,
      ParticipantCity: city || null,
      ParticipantState: state || null,
      ParticipantZip: zip || null,
      ParticipantSchoolOrEmployer: schoolOrEmployer || null,
      ParticipantFieldOfInterest: fieldOfInterest || null
    });

    // Find max DonationID and increment
    const maxDonationID = await knex("Donations")
      .max("DonationID as maxId")
      .first();
    const newDonationID = (maxDonationID.maxid || 0) + 1;

    // Record donation
    const donationDate = new Date().toISOString().split("T")[0];
    await knex("Donations").insert({
      DonationID: newDonationID,
      ParticipantID: newParticipantID,
      DonationDate: donationDate,
      DonationAmount: parseFloat(donationAmount)
    });

    // Return success with the new participant ID
    res.json({ success: true, participantID: newParticipantID, donationID: newDonationID });
  } catch (err) {
    console.error("Error creating participant:", err);
    console.error("Error details:", err.message, err.code);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ success: false, message: "Error creating participant account" });
  }
});

// Complete donation without registration
app.post("/completeDonation", async (req, res) => {
  try {
    const { name, email, amount } = req.body;

    // Find max ParticipantID and increment
    const maxID = await knex("Participants")
      .max("ParticipantID as maxId")
      .first();
    const newParticipantID = (maxID.maxid || 0) + 1;

    // Create minimal participant record
    const nameParts = name.split(" ");
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(" ") || "";

    await knex("Participants").insert({
      ParticipantID: newParticipantID,
      ParticipantFirstName: firstName,
      ParticipantLastName: lastName,
      ParticipantEmail: email
    });

    // Find max DonationID and increment
    const maxDonationID = await knex("Donations")
      .max("DonationID as maxId")
      .first();
    const newDonationID = (maxDonationID.maxid || 0) + 1;

    // Record donation
    const donationDate = new Date().toISOString().split("T")[0];
    await db("Donations").insert({
      DonationID: newDonationID,
      ParticipantID: newParticipantID,
      DonationDate: donationDate,
      DonationAmount: parseFloat(amount)
    });

    res.json({ success: true, message: "Donation recorded successfully" });
  } catch (err) {
    console.error("Error completing donation:", err);
    res.status(500).json({ success: false, message: "Error recording donation" });
  }
});

// ==============================
app.get("/displayDonations", async (req, res) => {
  const userLevel = req.session.userLevel || null;
  
  if (userLevel !== "M") {
    return res.redirect("/userDashboard");
  }

  try {
    const donationIdQuery = req.query.id ? parseInt(req.query.id, 10) : null;

    // Fetch all donations with participant info
    const donations = await knex("Donations as d")
      .join("Participants as p", "p.ParticipantID", "d.ParticipantID")
      .select(
        "d.DonationID",
        "d.DonationDate",
        "d.DonationAmount",
        "p.ParticipantID",
        "p.ParticipantFirstName",
        "p.ParticipantLastName",
        "p.ParticipantEmail"
      )
      .orderBy("d.DonationDate", "desc");

    // Fetch participants for add form
    const participants = await knex("Participants")
      .select("ParticipantID", "ParticipantFirstName", "ParticipantLastName", "ParticipantEmail")
      .orderBy("ParticipantLastName", "asc");

    // Normalize and group by participant name
    const grouped = {};
    let focusedDonation = null;
    
    donations.forEach((d) => {
      const participantName = (d.participantfirstname || d.ParticipantFirstName || "") + " " + (d.participantlastname || d.ParticipantLastName || "");
      const item = {
        DonationID: d.donationid || d.DonationID,
        DonationDate: d.donationdate || d.DonationDate,
        DonationAmount: d.donationamount || d.DonationAmount,
        ParticipantID: d.participantid || d.ParticipantID,
        ParticipantName: participantName.trim(),
        ParticipantEmail: d.participantemail || d.ParticipantEmail,
      };
      
      if (donationIdQuery && (d.donationid || d.DonationID) === donationIdQuery) {
        focusedDonation = item;
      }
      
      if (!grouped[participantName.trim()]) grouped[participantName.trim()] = [];
      grouped[participantName.trim()].push(item);
    });

    return res.render("displayDonations", {
      donationGroups: grouped,
      focusedDonation: focusedDonation || null,
      participants,
      userLevel,
    });
  } catch (err) {
    console.error("Error loading donations:", err);
    res.render("displayDonations", { donationGroups: {}, focusedDonation: null, participants: [], userLevel: "M" });
  }
});

// POST /addDonation - Add a new donation (M-level only)
app.post("/addDonation", async (req, res) => {
  const userLevel = req.session.userLevel || null;
  
  if (userLevel !== "M") {
    return res.status(403).send("Unauthorized");
  }

  try {
    const { participantId, donationAmount, donationDate } = req.body;

    if (!participantId || !donationAmount) {
      return res.status(400).send("Missing required fields");
    }

    // Insert new donation
    await knex("Donations").insert({
      ParticipantID: parseInt(participantId, 10),
      DonationAmount: parseFloat(donationAmount),
      DonationDate: donationDate || null,
    });

    // Redirect back to donations list
    res.redirect("/displayDonations");
  } catch (err) {
    console.error("Error adding donation:", err);
    res.status(500).send("Error adding donation");
  }
});

// POST /updateDonation - Update a donation (M-level only)
app.post("/updateDonation", async (req, res) => {
  const userLevel = req.session.userLevel || null;
  
  if (userLevel !== "M") {
    return res.status(403).send("Unauthorized");
  }

  try {
    const { donationId, donationAmount, donationDate } = req.body;

    if (!donationId || !donationAmount) {
      return res.status(400).send("Missing required fields");
    }

    // Update donation
    await knex("Donations")
      .where("DonationID", parseInt(donationId, 10))
      .update({
        DonationAmount: parseFloat(donationAmount),
        DonationDate: donationDate || null,
      });

    // Redirect back to donations list
    res.redirect("/displayDonations?id=" + donationId);
  } catch (err) {
    console.error("Error updating donation:", err);
    res.status(500).send("Error updating donation");
  }
});

// POST /deleteDonation - Delete a donation (M-level only)
app.post("/deleteDonation", async (req, res) => {
  const userLevel = req.session.userLevel || null;
  
  if (userLevel !== "M") {
    return res.status(403).send("Unauthorized");
  }

  try {
    const { donationId } = req.body;

    if (!donationId) {
      return res.status(400).send("Missing donation ID");
    }

    // Delete donation
    await knex("Donations")
      .where("DonationID", parseInt(donationId, 10))
      .del();

    // Redirect back to donations list
    res.redirect("/displayDonations");
  } catch (err) {
    console.error("Error deleting donation:", err);
    res.status(500).send("Error deleting donation");
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