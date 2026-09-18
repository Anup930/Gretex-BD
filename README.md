# BillDesk - Recurring Payments & Fund Control Web App

A complete, enterprise-grade recurring payments control and cash planning web application built according to the **BillDesk BRD** requirements.

- **Frontend**: Responsive Single Page Application (SPA) in HTML5, CSS3 (White-and-Navy corporate design), and Vanilla JavaScript.
- **Backend**: Google Apps Script (`backend/Code.gs`) providing REST-like JSON API endpoints.
- **Database**: Google Sheets (`DB.xlsx` schema with 16 sheets).
- **Uploaded Files Drive Folder**: [Google Drive Folder Link](https://drive.google.com/drive/folders/1EAO0KDAOpldv1hGCkrTMLeLXBIJPGhoI?usp=sharing) (`1EAO0KDAOpldv1hGCkrTMLeLXBIJPGhoI`)
- **Deployed Backend URL**: `https://script.google.com/macros/s/AKfycbyVfZEiB89DMweDOnj0hGT6uXJUqtvVmaiqDuDRAFT-ye2zfYT04q2IEAwko8rkdLZ_Pg/exec`

---

## 🚀 Quick Start (Testing Locally)

You can run and test the frontend immediately on your machine:

1. **Direct Browser Open**:
   - Double-click `index.html` to open it in Chrome, Edge, or any modern browser.
2. **Local HTTP Server (Optional)**:
   - Open terminal in this folder and run:
     ```powershell
     python -m http.server 3000
     ```
   - Open your browser at `http://localhost:3000`.

---

## 🔑 Login Credentials

The application is pre-seeded with the Super Admin account from `DB.xlsx`:
- **Email**: `admin@gretex.com`
- **Password**: `Admin@123`

---

## ⚙️ Google Apps Script Backend Setup Instructions

Your updated backend code is ready in [`backend/Code.gs`](file:///d:/1.%20Apps/18.%20BillDesk/backend/Code.gs).

Follow these simple steps:

1. **Open Google Drive**:
   - Open your Apps Script editor in `03. Backend > 01. App`.
2. **Paste the Updated Backend Code**:
   - Copy the entire updated content from [`backend/Code.gs`](file:///d:/1.%20Apps/18.%20BillDesk/backend/Code.gs) into `Code.gs`.
3. **Set Google Sheet ID**:
   - Open your `DB` Google Sheet in Google Drive.
   - Copy the Spreadsheet ID from the URL (between `/d/` and `/edit`).
   - In `Code.gs`, put the ID in line 20:
     ```javascript
     var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";
     ```
   *(Note: The script also automatically searches for the sheet named `DB` in your Google Drive!)*
4. **Attachments Folder Pre-configured**:
   - Your folder ID `1EAO0KDAOpldv1hGCkrTMLeLXBIJPGhoI` is already set in `Code.gs` (`ATTACHMENTS_FOLDER_ID`).
5. **Deploy as Web App**:
   - Click **Deploy** -> **Manage deployments** -> edit current deployment (or **New deployment**).
   - Version: **New version**.
   - "Execute as: Me", "Who has access: Anyone".
   - Click **Deploy**.
6. **Test in the Web App**:
   - In the BillDesk app, navigate to **Masters & Access -> API & System Settings** tab.
   - Click **Test Connection** to verify live connection to your Google Sheet!
   - Click **Populate Initial Masters to Sheet** if you'd like sample company, vendor, category, and bank account records automatically written into your empty Google Sheet!


---

## 📂 Project Structure

```
d:\1. Apps\18. BillDesk\
│
├── index.html                   # Main application entry point
├── README.md                    # Project documentation & deployment guide
├── DB.xlsx                      # Original Database schema & initial data
│
├── 01. BRD/
│   └── BillDesk-BRD.docx        # Business Requirements Document
│
├── backend/
│   └── Code.gs                  # Google Apps Script Web App API & Sheet handlers
│
├── css/
│   └── styles.css               # Navy & White corporate design system
│
└── js/
    ├── api.js                   # API Client layer & LocalStorage Pilot fallback
    ├── auth.js                  # Authentication & capability rules (R-01 default deny)
    ├── app.js                   # App router, user switcher, toasts & modals
    └── components/
        ├── dashboard.js         # KPI metrics, urgent work queue
        ├── recurring.js         # Recurring schedule register & cycle generator
        ├── operator.js          # Operator bill entry & invoice upload (R-04)
        ├── approval.js          # Approver workbench & 3-cycle payment history (FR-016)
        ├── payment.js           # Payment initiation & Maker-Checker confirmation (R-07)
        ├── fund_report.js       # Daily Fund Requirement & Aging buckets report (FR-023)
        ├── admin.js             # Companies, Vendors, Categories, Banks, Users, Settings
        └── audit.js             # Immutable audit log & global bill search
```

---

## 🌐 Future GitHub Publishing

When you are ready to publish to GitHub:
1. Initialize git in this folder:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit of BillDesk Web App"
   ```
2. Create a new repository on GitHub and push:
   ```powershell
   git remote add origin https://github.com/YOUR_USERNAME/billdesk.git
   git branch -M main
   git push -u origin main
   ```
3. Enable **GitHub Pages** under repository Settings -> Pages -> Deploy from branch `main` / `root`.
   Your app will be live on `https://YOUR_USERNAME.github.io/billdesk/`!
