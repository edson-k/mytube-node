const debug = require("debug")("app:startup");
const morgan = require("morgan");
const home = require("./routes/home");
const express = require("express");
const app = express();

app.set("view engine", "pug");
app.set("view engine", "ejs");
app.set("views", "./views"); // default

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/", home);

debug("APP ENV: " + app.get("env"));

if (app.get("env") === "development") {
  require("@knuckleswtf/scribe-express")(app);
  debug("Scribe is loaded...");
}

if (app.get("env") === "development") {
  app.use(morgan("tiny"));
  debug("Morgan enable...");
}

const port = process.env.PORT || 3000;
app.listen(port, () => debug(`Listening on port ${port}...`));
