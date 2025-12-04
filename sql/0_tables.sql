SET standard_conforming_strings = on;

DROP TABLE IF EXISTS Surveys CASCADE;
DROP TABLE IF EXISTS Donations CASCADE;
DROP TABLE IF EXISTS Milestones CASCADE;
DROP TABLE IF EXISTS Registrations CASCADE;
DROP TABLE IF EXISTS EventOccurences CASCADE;
DROP TABLE IF EXISTS EventTemplates CASCADE;
DROP TABLE IF EXISTS Participants CASCADE;

CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, password TEXT, level TEXT);

-- WARNING: Storing plaintext passwords is a security risk. Use bcrypt or similar in production.
INSERT INTO users (id, email, password, level) VALUES
(1, 'user@gmail.com', 'password123', 'U'),
(2, 'manager@gmail.com', 'password123', 'M');

CREATE TABLE Participants (
   ParticipantID               INTEGER PRIMARY KEY,
   ParticipantEmail            TEXT,
   ParticipantFirstName        TEXT,
   ParticipantLastName         TEXT,
   ParticipantDOB              TIMESTAMP NULL,
   ParticipantRole             TEXT,
   ParticipantPhone            TEXT,
   ParticipantCity             TEXT,
   ParticipantState            TEXT,
   ParticipantZip              TEXT,
   ParticipantSchoolOrEmployer TEXT,
   ParticipantFieldOfInterest  TEXT,
   TotalDonations              NUMERIC(10,2) NULL
);

CREATE TABLE EventTemplates (
   EventTemplateID        INTEGER PRIMARY KEY,
   EventName              TEXT,
   EventType              TEXT,
   EventDescription       TEXT,
   EventRecurrencePattern TEXT,
   EventDefaultCapacity   INTEGER
);

CREATE TABLE EventOccurences (
   EventOccurrenceID         INTEGER PRIMARY KEY,
   EventName                 TEXT,
   EventDateTimeStart        TIMESTAMP NULL,
   EventDateTimeEnd          TIMESTAMP NULL,
   EventLocation             TEXT,
   EventCapacity             INTEGER,
   EventRegistrationDeadline TIMESTAMP NULL,
   EventTemplateID           INTEGER NOT NULL REFERENCES EventTemplates(EventTemplateID)
);

CREATE TABLE Registrations (
   RegistrationID            INTEGER PRIMARY KEY,
   ParticipantID             INTEGER NOT NULL REFERENCES Participants(ParticipantID),
   EventOccurrenceID         INTEGER NOT NULL REFERENCES EventOccurences(EventOccurrenceID),
   RegistrationStatus        TEXT,
   RegistrationAttendedFlag  BOOLEAN,
   RegistrationCheckInTime   TIMESTAMP NULL,
   RegistrationCreatedAt     TIMESTAMP NULL
);

CREATE TABLE Donations (
   DonationID     INTEGER PRIMARY KEY,
   ParticipantID  INTEGER NOT NULL REFERENCES Participants(ParticipantID),
   DonationDate   DATE NULL,
   DonationAmount NUMERIC(10,2) NOT NULL
);

CREATE TABLE Milestones (
   MilestoneID    INTEGER PRIMARY KEY,
   ParticipantID  INTEGER NOT NULL REFERENCES Participants(ParticipantID),
   MilestoneTitle TEXT NOT NULL,
   MilestoneDate  DATE NOT NULL
);

CREATE TABLE Surveys (
   SurveyID                    INTEGER PRIMARY KEY,
   RegistrationID              INTEGER NOT NULL REFERENCES Registrations(RegistrationID),
   SurveySatisfactionScore     NUMERIC(3,1),
   SurveyUsefulnessScore       NUMERIC(3,1),
   SurveyInstructorScore       NUMERIC(3,1),
   SurveyRecommendationScore   NUMERIC(3,1),
   SurveyOverallScore          NUMERIC(3,1),
   SurveyNPSBucket             TEXT,
   SurveyComments              TEXT,
   SurveySubmissionDate        TIMESTAMP NULL
);
