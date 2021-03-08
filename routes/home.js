const config = require("config");
const express = require("express");
const router = express.Router();
const { getVideoList } = require("../models/youtube");

// ROUTER
router.get("/", (req, res) => {
  res.render("home.pug", { title: config.get("title") });
});

router.post("/", (req, res) => {
  getVideoList(req).then((data) => {
    return res.render("result.ejs", {
      title: config.get("title"),
      data: data.post,
      videosList: data.videosList,
    });
  });
});

module.exports = router;
