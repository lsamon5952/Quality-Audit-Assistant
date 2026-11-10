# Quality Audit Assistant — UM Tagum College

An enterprise-grade Total Quality Management (TQM) audit platform built for the **University of Mindanao Tagum College (UMTC)** in Tagum City, Davao del Norte. 

The application facilitates guided conversational process reviews with instructors, academic leadership, and office staff. It automatically maps everyday workflows into **SIPOC** diagrams (Suppliers, Inputs, Process Steps, Outputs, Customers) and systematically scores operational failure modes using **FMEA** (Failure Mode and Effects Analysis) ranked by Risk Priority Number (RPN = Severity × Occurrence × Detection).

---

## Architecture Overview

| Layer | Technology | Operational Function |
| :--- | :--- | :--- |
| **Frontend SPA** | React 19 + TypeScript + Tailwind CSS | Interactive 5-step audit chat, SIPOC tables, FMEA matrices, in-app dialogs |
| **Authentication** | Firebase Auth (Google Sign-In) | Passwordless, federated identity for UM Tagum College faculty and staff |
| **Database** | Google Cloud Firestore | Owner-isolated storage for profiles, chat transcripts, reviews, and risk reports |
| **API & Server** | Node.js + Express | Verifies Firebase ID tokens, reads Firestore REST API, server-authoritative RPN scoring |
| **AI Processing** | Gemini 3.6 Flash (with fallback ladder) | 5-step guided interview dialogue, structured JSON scoring, and consolidated reports |
| **Deployment** | Google Cloud Run | Scalable containerized deployment with Secret Manager integration |

---

## Security Architecture & Data Invariants

1. **Owner-Bound User Data Isolation**:
   - Regular users read and write solely under their own document namespace (`/users/{userId}/...`).
   - The browser client SDK saves personal profiles, reviews, and interaction messages directly, governed by strict Firestore security rules.
2. **Server-Side Security Invariants**:
   - The server never writes to Firestore.
   - It verifies incoming Firebase ID tokens with the Firebase Admin SDK (`verifyIdToken`).
   - All server queries execute via the Firestore REST API using the caller's own ID token, inheriting caller security rules without service-account master overrides.
3. **Super Administrator Governance**:
   - Only `lyka.samon.5952@gmail.com` is recognized as the super administrator.
   - The server requires BOTH: the verified ID token email matching `ADMIN_EMAIL` env var, and existence of the `/admins/{uid}` document.
   - The application client never creates `/admins` documents; the document must be added manually by the owner in the Firebase Console.
4. **Zero Email Persistence**:
   - No user email addresses are persisted in Firestore documents. Profiles store only Google display names and role metadata.
5. **Indirect Prompt Injection Defense**:
   - Transcripts, baseline texts, and profiles are treated strictly as untrusted data wrapped in XML delimiters (`<profile>`, `<baseline>`, `<transcript>`). The model is instructed to disregard any instructions inside delimiters.

---

## Prerequisites & Google Cloud Setup

Ensure you have the following installed on your machine:
- [Google Cloud SDK (`gcloud` CLI)](https://cloud.google.com/sdk/docs/install)
- [Node.js 20+ and npm](https://nodejs.org/)
- Firebase CLI (`npm install -g firebase-tools`)

### 1. Enable Required Google Cloud APIs

```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
gcloud config set project $PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  aiplatform.googleapis.com
```

### 2. Secret Manager Configuration

Store the Gemini API Key in Google Cloud Secret Manager:

```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Populate the secret version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Obtain project number
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Grant the Cloud Run default service account Secret Accessor privileges
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Firestore Database & Security Rules

### 1. Provision Firestore in Native Mode

```bash
gcloud firestore databases create --location=asia-northeast1 --type=firestore-native
```

### 2. Deploy Hardened Security Rules

Deploy the `firestore.rules` file to protect user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isValidId(id) {
      return id is string && id.size() > 0 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    match /admins/{uid} {
      allow get: if isSignedIn() && request.auth.uid == uid && isValidId(uid);
      allow list, write: if false;
    }

    match /settings/baseline {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /riskReports/{reportId} {
      allow read, write: if isAdmin() && isValidId(reportId);
    }

    match /users/{userId} {
      allow read: if (isOwner(userId) || isAdmin()) && isValidId(userId);
      allow write: if isOwner(userId) && isValidId(userId);

      match /reviews/{reviewId} {
        allow read: if (isOwner(userId) || isAdmin()) && isValidId(reviewId);
        allow write: if isOwner(userId) && isValidId(reviewId);
      }

      match /interactions/{interactionId} {
        allow read: if (isOwner(userId) || isAdmin()) && isValidId(interactionId);
        allow write: if isOwner(userId) && isValidId(interactionId);
      }
    }

    match /{path=**}/reviews/{reviewId} {
      allow read: if isAdmin();
    }

    match /{path=**}/interactions/{interactionId} {
      allow read: if isAdmin();
    }
  }
}
```

Deploy the rules using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## Cloud Run Deployment

Deploy the full-stack container service to Google Cloud Run:

```bash
gcloud run deploy quality-audit-assistant \
  --source . \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars ADMIN_EMAIL="lyka.samon.5952@gmail.com",NODE_ENV="production" \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### Mandatory Campaign Verification Label

Apply the required challenge label to register the Cloud Run service:

```bash
gcloud run services update quality-audit-assistant \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-northeast1
```

---

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start unified full-stack development server:
   ```bash
   npm run dev
   ```

4. Build and run production container locally:
   ```bash
   npm run build
   npm start
   ```

---

## License

Copyright © 2026 University of Mindanao Tagum College. Total Quality Management Office.
All rights reserved.
