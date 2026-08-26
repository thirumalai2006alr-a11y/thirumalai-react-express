// ============================================================
//  TODO APP - server.js
//  This one file contains our whole backend.
// ============================================================

// ------------------------------------------------------------
// 1. LOAD THE PACKAGES WE INSTALLED
// ------------------------------------------------------------

require("dotenv").config(); // reads the .env file into process.env

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const MongoStore = require("connect-mongo");

// Our two models (the shape of our data)
const User = require("./models/User");
const Todo = require("./models/Todo");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------
// 2. MIDDLEWARE
//    Middleware = code that runs on every request,
//    before the request reaches our routes.
// ------------------------------------------------------------

// Lets Express read JSON that the frontend sends us.
// Without this line, req.body would be undefined.
app.use(express.json());

// Tells Express to also serve the files inside the "public" folder.
// This is why http://localhost:3000 shows index.html,
// and why the frontend and the API share one address (no CORS needed).
app.use(express.static("public"));

// ------------------------------------------------------------
// 3. CONNECT TO MONGODB
// ------------------------------------------------------------

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => {
    // Most common causes: wrong password in .env, or your IP address is
    // not allowed in Atlas (Network Access).
    console.log("MongoDB connection error:", error.message);

    // Without a database this app cannot do anything, so stop here with a
    // readable message instead of a hundred lines of red error text.
    process.exit(1);
  });

// ------------------------------------------------------------
// 4. SESSIONS
//    A session lets the server remember who is logged in.
//    The browser gets a cookie; the real data stays on the server.
// ------------------------------------------------------------

app.use(
  session({
    secret: process.env.SESSION_SECRET, // used to sign the cookie
    resave: false,
    saveUninitialized: false,

    // Without a store, sessions live in the server's memory and are lost
    // every time the server restarts. This saves them in MongoDB instead.
    //
    // We reuse the same connection Mongoose just opened above, so the app
    // only opens ONE connection to the database.
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
    }),

    cookie: {
      httpOnly: true, // JavaScript in the browser cannot read this cookie
      // maxAge: 1000 * 60, // the cookie lasts 1 minute
      maxAge: 1000 * 60 * 20, // final version: the cookie lasts 20 minutes
    },
  })
);

// ------------------------------------------------------------
// 5. OUR AUTH CHECK
//
//    We put this function in front of any route that should only
//    work when somebody is logged in.
//
//    req  = the incoming request
//    res  = the response we send back
//    next = "everything is fine, continue to the route"
// ------------------------------------------------------------

function requireAuth(req, res, next) {
  // If there is no userId in the session, nobody is logged in.
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please login" });
  }

  next(); // logged in - carry on
}

// ============================================================
//  AUTH ROUTES
// ============================================================

// ------------------------------------------------------------
// REGISTER
// Form -> fetch() -> here -> bcrypt -> MongoDB
// ------------------------------------------------------------

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // --- check the input ---

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // --- is this person already registered? ---

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    // --- hash the password ---
    //
    // We never save the real password.
    // bcrypt turns "hello123" into a long scrambled string.
    // The 10 is how many times bcrypt scrambles it. A bigger number is
    // safer but slower. 10 is the normal choice.
    const hashedPassword = await bcrypt.hash(password, 10);

    // --- save the user ---

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword, // the hash, never the real password
    });

    res.status(201).json({
      message: "Account created, Please Login",
      username: user.username,
    });
  } catch (error) {
    console.log("Register error:", error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ------------------------------------------------------------
// LOGIN
// Email + password -> find user -> bcrypt.compare() -> session
// ------------------------------------------------------------

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Notice: we send the SAME message whether the email was wrong or the
    // password was wrong. If we said "email not found", an attacker could
    // use our login page to discover which emails exist.
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // bcrypt cannot un-scramble a hash. Instead it scrambles the password
    // the user just typed, and checks whether it matches the stored hash.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // THIS LINE IS THE LOGIN.
    // We store the user's id in the session, and the browser gets a cookie.
    // From now on, every request from this browser tells us who they are.
    req.session.userId = user._id;

    res.json({ message: "Logged in", username: user.username });
  } catch (error) {
    console.log("Login error:", error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ------------------------------------------------------------
// LOGOUT
// Throw the session away.
// ------------------------------------------------------------

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({ message: "Logged out" });
  });
});

// ------------------------------------------------------------
// WHO AM I?
// The todos page uses this to show the username,
// and to send visitors back to login if they are not logged in.
// ------------------------------------------------------------

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ username: user.username, email: user.email });
  } catch (error) {
    console.log("Me error:", error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ============================================================
//  TODO ROUTES  (this is our CRUD)
//
//  CREATE -> POST   /api/todos
//  READ   -> GET    /api/todos
//  UPDATE -> PUT    /api/todos/:id
//  DELETE -> DELETE /api/todos/:id
//
//  Every route below has requireAuth, so you must be logged in.
// ============================================================

// ------------------------------------------------------------
// CREATE
// ------------------------------------------------------------

app.post("/api/todos", requireAuth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Todo text is required" });
    }

    // The owner comes from the SESSION, never from the frontend.
    // If we let the browser send the user id, anyone could create
    // todos in somebody else's account.
    const todo = await Todo.create({
      text: text.trim(),
      user: req.session.userId,
    });

    res.status(201).json({ message: "Todo added successfully" });
  } catch (error) {
    console.log("Create todo error:", error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

app.get("/api/todos", requireAuth, async (req, res) => {
  try {
    // Only the logged-in user's todos.
    // We do NOT want every user to see every todo in the database.
    const todos = await Todo.find({ user: req.session.userId }).sort({
      createdAt: -1, // newest first
    });

    res.json(todos);
  } catch (error) {
    console.log("Get todos error:", error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------

app.put("/api/todos/:id", requireAuth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Todo text is required" });
    }

    // If the id is not a real MongoDB id, stop early with a clear message.
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid todo id" });
    }

    // Look at BOTH conditions:
    //   _id  -> is this the todo they asked for?
    //   user -> does it actually belong to them?
    //
    // Searching by _id alone would let a logged-in user edit
    // somebody else's todo just by guessing an id.
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, user: req.session.userId },
      { text: text.trim() },
      { new: true } // give us back the updated version
    );

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.status(200).json({ message: "Todo edited successfully" });
  } catch (error) {
    console.log("Update todo error:", error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ------------------------------------------------------------
// DELETE
// ------------------------------------------------------------

app.delete("/api/todos/:id", requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid todo id" });
    }

    // Same idea as update: the todo must belong to this user.
    const todo = await Todo.findOneAndDelete({
      _id: req.params.id,
      user: req.session.userId,
    });

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.json({ message: "Todo deleted" });
  } catch (error) {
    console.log("Delete todo error:", error.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// ------------------------------------------------------------
// 6. START THE SERVER
// ------------------------------------------------------------

// When we deploy to Render, Render chooses the port for us.
// On our own laptop there is no process.env.PORT, so we use 3000.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on http://localhost:3000" + PORT);
});