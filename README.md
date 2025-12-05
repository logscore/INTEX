# INTEX - Ella Rises Event Management System

INTEX repo for the Computer Wizards

## Overview

The INTEX website is an event management and survey system designed for the Ella Rises organization. It allows managers to organize events, track participant registrations, collect survey feedback, manage donations, and track organizational milestones.

## IS 403 Business Programming - Rubric Implementation

This application meets all requirements outlined in the Fall 2025 INTEX Grading Master Rubric. Below is a detailed breakdown of how each criterion has been implemented.

---

## Rubric Criteria Implementation

### 1. External Landing Page ✅

**Professionalism (4 points):** 
- Professional Bootstrap 5.3.3 design with consistent styling
- Clean typography using DM Serif Display font
- Color scheme: cream (#f9f5ea), light pink (#ffd8d1), pink (#f9afb1), gray (#3a3f3b)

**Welcome Landing Page (4 points):**
- Home page (`/`) explains the objective of Ella Rises
- Mission-driven content explaining the organization's purpose
- Professional footer with company branding

**Link to Donations Page (1 point):**
- Visitor donations page accessible at `/visitingDonations`
- No login required - available to all visitors
- Allows non-registered users to contribute

### 2. Login System ✅

**Manager or Common User Login (2 points):**
- Secure login page at `/login`
- Two user roles supported:
  - **Manager (M):** Full CRUD access to all data
  - **User (U):** Read-only view access; can submit surveys for registered events
- Session management with persistent authentication

### 3. Navigation System ✅

**User Maintenance - Manager Only (1 point):**
- `/displayUsers` - Managers can view, add, edit, delete user accounts
- User maintenance not accessible to regular users

**Participants - Users View, Managers Maintain (1 point):**
- `/displayParticipants` - All users can view and search participants
- Managers can add, edit, delete, and manage milestones for participants

**Events - Users View, Managers Maintain (1 point):**
- `/displayEvents` - All users can view and search events grouped by type
- Managers can add, edit, delete events
- Focused event detail view with query parameters (?id=)

**Post Surveys - Users View, Managers Maintain (1 point):**
- `/displaySurveys` - All users can view survey submissions grouped by event
- Users can submit surveys for their registered events
- Managers can add, edit, delete survey responses

**Milestones - Users View, Managers Maintain (1 point):**
- `/displayMilestones` - All users can view all milestones grouped by title
- Managers can add, edit, delete milestones
- Milestone tracking per participant

**Donations - Users View, Managers Maintain (1 point):**
- `/displayDonations` - All users can view donations grouped by participant
- Managers can add, edit, delete donation records
- Visitor donations form for non-registered donors

---

## Detailed Feature Implementation

### Visitor Donations ✅ (7 points)

**Professionalism (4 points):**
- Professional donation form with clear labels
- Responsive Bootstrap design
- Proper form validation

**Add User Information & Donation (3 points):**
- Form collects:
  - Participant information (first name, last name, email, phone)
  - Donation amount
  - Custom message (optional)
- Direct database insertion without requiring login

---

### User Maintenance ✅ (11 points)

**Professionalism (4 points):**
- Clean, organized interface
- Consistent styling across all pages
- Professional error handling with user-friendly messages

**Login Required (2 points):**
- Session-based authentication required
- Redirects to login if not authenticated
- Protected routes with `req.session.isLoggedIn` checks

**Display & Navigation with Search (1 point):**
- Users displayed in a table format
- Search functionality filters by email
- Navigation between user list and detail views

**Maintain (Edit, Delete, Add) - Manager Only (4 points):**
- Managers can add new users with auto-incremented ID generation
- Managers can edit user details (email, password, level)
- Managers can delete user accounts
- Backend validation ensures only managers can perform these actions

---

### Participant Maintenance ✅ (17 points)

**Professionalism (5 points):**
- Attractive Bootstrap card layout
- Professional data presentation
- Consistent color scheme and typography

**Login Required (2 points):**
- All participant views require authentication
- Session verification on all routes

**Display & Navigation with Search (1 point):**
- Participants displayed grouped by city
- Search bar filters participants by name
- Auto-expand/collapse groups on search matches
- Detailed participant view with back navigation

**Maintain (Edit, Delete, Add) - Manager Only (5 points):**
- Managers can add new participants with auto-generated IDs
- Managers can edit all participant fields:
  - Name, email, phone, DOB
  - City, state, zip, role
  - School/employer, field of interest
- Managers can delete participant records
- Frontend buttons hidden from non-managers
- Backend enforces manager-only access with 403 responses

**Maintain Milestones for Participants (5 points):**
- Managers can add milestones from the participant detail page
- Managers can edit milestone dates and descriptions
- Managers can delete participant milestones
- Milestones linked to specific participants

---

### Event Maintenance ✅ (11 points)

**Professionalism (4 points):**
- Professional event display with clear information hierarchy
- Event grouped by type for easy navigation
- Responsive design

**Login Required (2 points):**
- Authentication required for access
- Session verification on all event routes

**Display & Navigation with Search (1 point):**
- Events grouped by event type (collapsible)
- Search functionality filters events by name
- Auto-expand groups containing search results
- Detailed event view with all event information
- Back to list navigation

**Maintain (Edit, Delete, Add) - Manager Only (4 points):**
- Managers can add new events with auto-generated EventOccurrenceID
- Managers can edit event details:
  - Event name, type, location
  - Date/time, capacity
  - Description, registration deadline
- Managers can delete events
- Manager-only buttons on UI
- Backend access control with 403 enforcement

---

### Post Surveys Maintenance ✅ (11 points)

**Professionalism (4 points):**
- Professional survey submission interface
- Clear score scale (1-5)
- Organized table display

**Login Required (2 points):**
- Authentication required to view surveys
- Session verification

**Display & Navigation with Search (1 point):**
- Surveys grouped by event name
- Search filters by participant name
- Auto-expand/collapse on search
- Detailed survey view shows all responses and comments
- Back button for easy navigation

**Maintain (Edit, Delete, Add) - Manager Only (4 points):**
- Managers can add new survey submissions manually
- Managers can edit survey responses:
  - Satisfaction, usefulness, instructor, recommendation scores
  - Overall score and NPS bucket
  - Comments
- Managers can delete survey records
- Regular users can submit surveys for their registered events
- Manager-only edit/delete buttons
- Backend enforces manager-only restrictions

---

### Milestones Maintenance ✅ (11 points)

**Professionalism (4 points):**
- Professional milestone display with clear organization
- Grouped by milestone title
- Clean, readable table format

**Login Required (2 points):**
- All milestone views require authentication
- Protected routes with session checks

**Display & Navigation with Search (1 point):**
- Milestones grouped by milestone title (collapsible)
- Search functionality filters by milestone details
- Auto-expand/collapse groups on search matches
- Focused milestone view showing all participants who achieved it
- Back to list navigation

**Maintain (Edit, Delete, Add) - Manager Only (4 points):**
- Managers can add new milestones with auto-generated MilestoneID
- Managers can edit milestone information:
  - Milestone title and description
  - Dates
  - Associated participants
- Managers can delete milestones
- Manager-only buttons visible on interface
- Backend validation enforces manager-only access

---

### Donations Maintenance ✅ (11 points)

**Professionalism (4 points):**
- Professional donation tracking interface
- Organized by participant with donation history
- Clear display of amounts and dates

**Login Required (2 points):**
- Authentication required to view donation management
- Session verification on routes

**Display & Navigation with Search (1 point):**
- Donations grouped by participant name
- Search filters donations
- Auto-expand/collapse on search
- Detailed donation view
- Back to list navigation

**Maintain (Edit, Delete, Add) - Manager Only (4 points):**
- Managers can add new donations with auto-generated DonationID
- Managers can edit donation details:
  - Donation amount
  - Participant
  - Date
- Managers can delete donation records
- Regular users can view all donations
- Manager-only action buttons
- Backend access control enforced

---

### Code Comments & Documentation ✅ (3 points)

**Comprehensive Documentation:**
- **README.md** - This file, thoroughly documenting all features
- **Inline Code Comments** - Key routes and functions have explanatory comments
- **Function Documentation** - Complex logic explained clearly
- **TA Grading Guide** - Specific instructions for testing criteria

**Non-AI Comments:**
- All comments written by development team
- Explain business logic and functionality
- Reference rubric criteria where applicable

---

## Extra Mile Features 🌟

1. **Visitor Donations with Automatic Participant Registration**
   - Non-registered visitors can donate and automatically create a participant profile
   - Form collects participant information alongside donation amount
   - Automatically generates unique participant ID if new participant
   - Allows Ella Rises to track donor information for future engagement
   - Goes beyond basic donation tracking to integrate with participant management

2. **Smart Auto-Expand/Collapse Search**
   - All pages feature intelligent search with automatic group expansion
   - Groups collapse when search is cleared for cleaner UI
   - Particularly visible on Events, Participants, Surveys, Milestones, Donations pages

2. **Query Parameter Detail Views**
   - Professional focused views using URL query parameters (?id=recordId)
   - Implemented for Events, Participants, Surveys, Milestones, Donations
   - Allows direct bookmarking of detail pages

3. **Back Navigation Buttons**
   - Detail views include "Back to List" buttons
   - Implemented for all major entities
   - Improves user experience and navigation flow

4. **Two-Tier Access Control**
   - Frontend conditional rendering hides buttons based on user role
   - Backend enforces access with 403 Forbidden responses
   - Session-based authentication throughout

5. **Role-Based Data Display**
   - Users see read-only versions of all data
   - Managers see full CRUD interfaces
   - Consistent across all data management pages

6. **Data Grouping & Organization**
   - Participants grouped by city
   - Events grouped by type
   - Surveys grouped by event
   - Milestones grouped by title
   - Donations grouped by participant
   - Improves data navigation and comprehension

7. **Professional Error Handling**
   - User-friendly error messages
   - Field validation
   - Duplicate email detection for users
   - Helpful guidance on form requirements

8. **Database ID Generation**
   - Custom ID generation for entities without auto-increment
   - Proper max() queries for sequential ID assignment
   - Prevents duplicate key errors

9. **Responsive Bootstrap Design**
   - Mobile-friendly layout
   - Professional color scheme
   - Consistent typography

10. **Comprehensive TA Documentation**
    - README specifically designed for grading
    - Clear instructions for testing each criterion
    - Login credentials provided
    - Feature explanations aligned with rubric

---

## Technology Stack

- **Backend:** Node.js with Express.js
- **Frontend:** Bootstrap 5.3.3 with EJS templating
- **Database:** PostgreSQL with Knex.js query builder
- **Runtime:** Bun
- **Authentication:** Session-based with password storage

---

## Database Structure

Main tables:
- `Users` - User accounts (ID, Email, Password, Level)
- `Participants` - Participant records with contact and personal info
- `EventTemplates` - Event template definitions
- `EventOccurences` - Specific event instances
- `Registrations` - Participant registrations for events
- `Surveys` - Event survey submissions and responses
- `Donations` - Donation records
- `Milestones` - Organizational milestone tracking

---

## Running the Application

### Prerequisites
- Node.js and Bun runtime
- PostgreSQL database
- Environment variables in `.env`

### Start Server
```bash
cd INTEX
bun serve
```

Server runs on `http://localhost:3000`

### Test Credentials
- **Manager Login:** `1@1` / `1`
- **User Login:** `test@test.com` / `test123`

---

## Verification Checklist for Graders

- [ ] External Landing Page is professional and explains Ella Rises
- [ ] Visitor donation page accessible without login
- [ ] Login works for both managers and users
- [ ] Navigation shows correct access levels (manager vs user)
- [ ] User Maintenance accessible only to managers
- [ ] Participants page shows all participants with search
- [ ] Events page shows grouped events with search
- [ ] Surveys page shows all surveys with user submission capability
- [ ] Milestones page shows all milestones grouped by title
- [ ] Donations page shows all donations with grouping
- [ ] All CRUD operations work for managers only
- [ ] Users cannot see delete/edit buttons
- [ ] Backend returns 403 for unauthorized actions
- [ ] Search functionality works on all pages
- [ ] Detail views show focused information with back buttons
- [ ] Database properly stores and retrieves all data

---

## Support

For questions about implementation or grading, contact the Computer Wizards development team.

