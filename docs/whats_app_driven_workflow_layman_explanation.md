# WhatsApp-Driven Workflow System – Human Explanation

## 1. What problem this system is solving

Today, doctors communicate with the operations team mainly through **WhatsApp groups**. These messages are:
- Unstructured
- Easy to miss
- Hard to track
- Difficult to follow up when there are many messages from the same doctor

One doctor may send:
- Multiple messages in a single day
- Messages of different intent (action, query, or just information)

Because of this, teams face confusion about:
- What action is required
- Who is responsible
- What the current status is
- Whether something is already done or still pending

This system is being built to **convert WhatsApp messages into structured, trackable internal tickets**, so nothing is lost and everyone sees the same truth.

---

## 2. Core idea (in very simple terms)

Think of this system as:

> A digital workspace where every important WhatsApp message from a doctor becomes a **ticket**, and that ticket is tracked step-by-step until it is completed.

The system does **not** replace WhatsApp.
It **organizes what happens after WhatsApp**.

---

## 3. Step-by-step real-world flow

### Step 1: Doctor sends a WhatsApp message

Doctors send messages in a WhatsApp group. Each message can be one of three types:

1. **Action required**  
   (Diagnostic or Therapeutic request)
2. **Query**  
   (Questions, clarifications, follow-ups)
3. **Information**  
   (FYI updates, non-actionable messages)

Important points:
- One message = one ticket
- Even if the same doctor sends multiple messages, each message is treated separately
- Each message is mapped to:
  - Doctor name
  - Hospital name
  - Date & time

Once identified as important, a **unique ID (UID)** is generated for that message/ticket.

---

### Step 2: Customer Success converts WhatsApp → System entry

Customer Success agents:
- Read the WhatsApp message
- Manually enter the details into the system

They fill a form that:
- Changes based on the type of message (action / query / information)
- Uses dropdowns, radio buttons, and conditional fields

At this point:
- The unstructured WhatsApp message becomes a **clean, structured internal record**
- No automation is involved
- Accuracy depends on human confirmation

---

### Step 3: Ticket appears on Manager Dashboard

Once the form is submitted:
- The ticket becomes visible to one or more managers
- It appears with an **initial status tag**

Managers see:
- What the request is
- Who the doctor and hospital are
- What type of action is required

This is where **operational ownership begins**.

---

### Step 4: Manager assigns field executive and location

The manager:
- Assigns a field executive (if sample collection is required)
- Defines or updates the collection location:
  - Hospital
  - Patient’s home
- Adds or edits address details

The ticket now moves from **request stage → execution stage**.

---

### Step 5: Status tracking (designed to be scalable)

The manager controls the status of the ticket across all stages.

Key requirement:
- The status system must be **easy to extend in the future**

This means:
- New stages can be added later
- More fields can be tracked later
- The app should not break when workflows evolve

This allows the system to grow with the business.

---

### Step 6: Status visibility for Customer Success

Whatever updates the manager makes:
- Status changes
- Assignments
- Progress notes

These updates are visible to **Customer Success in view-only mode**.

Why this matters:
- Customer Success can confidently respond to doctors
- Reduces internal calls and confusion
- Everyone refers to the same source of truth

---

### Step 7: Future scalability for new roles

The system is intentionally designed to allow **new user roles in the future**.

Example:
- Adding a Field Executive login

Field Executive would:
- See only their assigned tickets
- Access only one screen
- Update only their own task/status
- Not see manager dashboards or other data

Their updates would automatically:
- Reflect on the Manager dashboard (edit access)
- Reflect on Customer Success dashboard (view-only)

This same pattern can be reused to add more roles later.

---

## 4. What this system deliberately does NOT do

To keep things simple and controllable, the system will NOT:
- Automate WhatsApp
- Auto-assign people
- Send notifications
- Optimize schedules
- Run analytics or SLAs

Everything is:
- Manual
- Visible
- Controlled by humans

---

## 5. One-line summary

This system converts doctor WhatsApp messages into structured internal tickets and allows different teams to manually process, track, and update those tickets step-by-step with clear visibility and scalable roles.
