const path = require("path");
const fs = require("fs").promises;
const express = require("express");

const app = express();

const axios = require("axios");
const cheerio = require("cheerio");

let port = process.env.PORT;

if (port === null || port === "" || port === undefined) {
  port = 8500;
}

let urls = {
  "beijing-2008": "https://olympics.com/en/olympic-games/beijing-2008/medals",
  "london-2012": "https://olympics.com/en/olympic-games/london-2012/medals",
  "rio-2016": "https://olympics.com/en/olympic-games/rio-2016/medals",
  "tokyo-2020": "https://www.bbc.co.uk/sport/olympics/57836709"
};

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.set("Content-Type", "text/html");
  res.sendFile(path.join(__dirname, "/index.html"));
});

app.get("/table", async(req, res, next) => {
  let { games } = req.query;
  console.log(urls[games]);
  try {
      // Request the html page from the set url
      const { data } = await axios.get(urls[games], { headers: { "User-Agent": "Mozilla/5.0" }});
      // Use cheerio to parse data
      const $ = await cheerio.load(data);
      console.log("We have got requested data from external site");
      let finalData;
      // filter data for what we want 
      if (games === "tokyo-2020") {
        finalData = $.html($(".story-body__table"));
      } else {
        finalData = $.html($("div[data-cy='table-content']"));
      }
      // Put in json format
      let jsonData = {
        title: games.replace("-", " ").toUpperCase(),
        html: finalData
      };
      // Sending requested data back
      console.log("Sending requested data back");
      return res.status(200).json({status: "success", data: JSON.stringify(jsonData)});
  } catch (error) {
    console.log(error.message)
  }
});

const clientErrorHandler = (err, req, res, next) => {
  if (req.xhr) {
    res.status(500).json({status: "error", mesg: "Something has gone wrong please try again later!"});
  } else {
    next (err);
  }
}

const errorHandler = (err, req, res, next) => {
  res.status(500);
  console.error("Error: ", err.message);
}

app.use((req, res, next) => {
  res.status(404).redirect("/");
});

app.use(clientErrorHandler);
app.use(errorHandler);