const express = require("express");
const path = require("path");
const app = express();
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const flash = require("express-flash");
const logger = require("morgan");
//Use .env file in config folder
require("dotenv").config({ path: "./config/.env" });
const connectDB = require("./config/database");
const mainRoutes = require("./routes/main");
const eventsRoutes = require("./routes/events");
const mockUser = require("./config/mockUser.json");
const User = require("./models/User");

// Passport config
require("./config/passport")(passport);

//Body Parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Logging
/* istanbul ignore next  */
if (process.env.NODE_ENV !== 'test') app.use(logger("dev"));

// Setup Sessions - stored in MongoDB
app.use(
  session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);

// Render React as View
app.use(express.static(path.join(__dirname, "..", "client", "build")));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

/* istanbul ignore next  */
if (
  process.env.NODE_ENV === "development" &&
  process.env.MOCK_USER === "true"
) {
  console.log("In development - using mocked user");
  app.use(async (req, res, next) => {
    req.user = mockUser;
    let user = await User.findOne({ _id: mockUser._id }).exec();
    if (!user) {
      await User.create(mockUser);
    }
    next();
  });
}

//Use flash messages for errors, info, ect...
app.use(flash());

//Setup Routes For Which The Server Is Listening
app.use("/", mainRoutes);
app.use("/events", eventsRoutes);
app.get("'", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// error handler
/* istanbul ignore next  */
app.use((err, req, res, next) => {
  const { status = 500, message = "Server error", stack } = err;
  console.log(stack);
  res.status(status).json({ message });
});

//Connect To Database
connectDB().then(() => {
  //Server Running
  app.listen(process.env.PORT || 2121, () => {
    console.log(
      `Server is running on ${process.env.PORT}, you better catch it!`
    );
  });
});
