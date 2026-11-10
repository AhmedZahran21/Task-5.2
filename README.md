# Task 5 (Variant): Campus Marketplace - With Listing Reviews

We will building on top of the campus marketplace variant in task 3. Previously we implemented `JWT` authentication and now a new model and controller have been added. Let us first start with some context.
## Context

### Injection attacks

An Injection attack vector is a class of security vulnerabilities where the system is susceptible to receiving input from an untrusted user that is part used as part of a Command or a Query for an interpreter. These include, but not limited to, databases, OS Shell, or an XML Parser. The interpreter unwittingly executes the malicious payload as code instead of treating it as plain data. Injection attacks come in multiple formats Such as:

- `SQL Injection`:  Malicious users insert malicious `SQL` statements into data entry fields or login forms to manipulate backend database queries. This can bypass authentication or extract, modify, and delete sensitive records.
- `OS Command Injection`: Attackers inject operating system commands into vulnerable web applications, forcing the host server to run arbitrary terminal or shell commands with the application's privileges.

The above two are just two examples of many possibilities. For today's task we will be focusing on `Cross-Site Scripting (XSS) Attacks`.

### `Cross-Site Scripting (XSS) Attack`

A `Cross-Site Scripting (XSS)` attack is a subclass of the Injection attacks. It is a security vulnerability that happens when an application takes unsanitized user input and places it directly into a web page that other people's browsers then render. Here the interpreter is the **victim's browser**: if an application fails to validate or neutralize what a user can submit, an attacker can supply `HTML` and `JavaScript` instead of plain text, and the browser executes it as code within the victim's session instead of displaying it as literal text.

XSS commonly comes in three forms:

- `Stored (Persistent) XSS`: the malicious payload is saved on the server (e.g. in the database) and served to every user who views the affected page.
- `Reflected XSS`: the payload is bounced straight back off a response (e.g. a search term echoed into the page) and runs in the browser of whoever clicks the crafted link.
- `DOM-based XSS`: client-side JavaScript writes untrusted input into the page, so the payload never needs to reach the server.

For today's task we will be focusing on `Stored XSS`.

#### How it works:

1. **Unsanitized Inputs**: The web application accepts user data (like a comment, a review, or a profile field) and later places it into an HTML page or response without neutralizing it.
2. **Injecting Markup or Script**: Instead of typing plain text into a field, an attacker submits active markup — a `<script>` tag or, more reliably, an element with an auto-firing event handler such as `<img src=x onerror=...>` or `<svg onload=...>`.
3. **Altered Execution**: The browser interprets the injected input as markup and code rather than literal text, so the attacker's JavaScript runs in the victim's session — for example reading the login token out of `localStorage` and sending it to the attacker.

## Running it

```bash
npm install           # Install concurrently and the dependencies of the projects
npm run install:all   # For safety
npm run dev           # API on :4000, client on :5175
```

Create the `server/.env` file.

```ini
PORT=4000
MONGO_URI=mongodb://tasks:pass1234@ac-j3acrgb-shard-00-00.lueesfz.mongodb.net:27017,ac-j3acrgb-shard-00-01.lueesfz.mongodb.net:27017,ac-j3acrgb-shard-00-02.lueesfz.mongodb.net:27017/?ssl=true&replicaSet=atlas-6to6iy-shard-0&authSource=admin&appName=Cluster0
JWT_SECRET=9eb831018aa7af4da2dddf7397501d2aa5886ad43f3cb6e0a17a0aa6050006cc
JWT_EXPIRES_IN=7d
```

## What was added on top of Task 3

### Server

- Added a new model called Review with the following attributes: `listing`, `author`, `rating`, `body`. The `body` holds the review text as an **HTML string** (reviewers can use light formatting such as bold and links).
- Added the Review Controller with the following routes:
	- `GET /api/reviews?listing=<id>`: This function returns all the reviews for a given listing. Reading reviews is public.
	- `POST /api/reviews`: This function creates a review for a listing. It requires a logged-in user, and the submitted `body` is stored as-is and later rendered as HTML by the client.

### Client

- Added the `ReviewList.jsx` component and the `ListingReviews.jsx` page (routed at `/listings/:id/reviews`), plus a "Reviews" link on each listing card.
- Review bodies pass through a single `lib/sanitize.js` helper before they are handed to React's `dangerouslySetInnerHTML` for rendering.

## Simulating the Attack

Unlike the NoSQL Injection task, this attack runs entirely **in the browser — no Postman needed**. Look through the `Flow.md` Markdown file for the detailed steps to simulate the `Stored XSS` attack, see the injected script execute, and watch it read the victim's login token out of `localStorage`. After reading the file Read the next section.

## Task

Every attack from the `Flow.md` file works because the Reviews feature trusts user input and renders it as **raw HTML** in every viewer's browser. The server (`reviewController.js`) stores the `body` with no sanitation, the client's `lib/sanitize.js` passes it through untouched, and `ReviewList.jsx` injects it with `dangerouslySetInnerHTML` — with no `Content-Security-Policy` to stop injected scripts from running.

**Fix it.** Make posting and viewing reviews safe while keeping their legitimate formatting, then re-run every attack in this file and confirm each one now fails. Think about: sanitizing vs escaping untrusted HTML, the single place the HTML is rendered (the `dangerouslySetInnerHTML` sink), never trusting user-supplied markup, and constraining what the browser is allowed to execute with a security header.

Your solution should utilize the `DOMPurify` package together with a custom configured `Content-Security-Policy` header via the `helmet` package. You are expected to know the difference between `DOMPurify` (which sanitizes the data/markup on the client before it is rendered) and a `Content-Security-Policy` (a browser-enforced policy sent by the server that restricts what may run), and to think carefully about why layering both — **defense-in-depth** — is stronger than either one alone.

> A `jest` test suite ships with this task. From the project root, run `npm install` then `npm test`. The tests encode the secure behavior, so they **fail now** and **pass once your fix is applied** — use them to verify your work.

## Implemented protection

Review HTML now passes through [DOMPurify](https://github.com/cure53/DOMPurify)
immediately before `dangerouslySetInnerHTML`. The allowlist preserves paragraphs,
bold, italics, lists, line breaks, blockquotes and links. Scripts, event handlers,
unsafe link URLs, images, SVG, forms and styling are removed. Escaping all HTML
would display formatting tags as text; sanitizing instead retains the supported
formatting. Stored bodies remain untrusted, so previously saved reviews receive
the same protection when viewed.

[Helmet](https://helmetjs.github.io/) sets a custom CSP on API responses with
`script-src 'self'`, `script-src-attr 'none'` and `object-src 'none'`. Because the
client is served separately, Vite also sends a CSP on its development and preview
pages. Development permits only React Refresh's exact inline script hash and the
local API/HMR connections. Preview permits only same-origin scripts, without that
development hash. Sanitization removes dangerous markup; CSP independently
restricts browser execution if dangerous markup reaches the page.

Run `npm test -- --runInBand` for the supplied suite plus regression coverage of
the Flow alert and exfiltration payloads, SVG handlers, script tags, unsafe links,
and preservation of legitimate formatting. Run `npm run build --workspace client`
to build the client, then `node tests/verify-frontend-csp.mjs` to verify the CSP
headers on development and preview HTML, including the React Refresh hash.
The integration suite needs a cached MongoDB test binary; its first download can
exceed the suite's 60-second setup timeout. To run checks that do not need MongoDB,
use `npm test -- --selectProjects client --runInBand` and
`npm test -- --selectProjects server --testPathPatterns=securityHeaders.test.js --runInBand`.
For a deployed static build, configure the frontend hosting
server to send the equivalent preview CSP: Vite's headers are not embedded in
`dist`, and the API's CSP does not govern a separately hosted HTML page. Adjust
the allowed API origin when deploying beyond localhost.
