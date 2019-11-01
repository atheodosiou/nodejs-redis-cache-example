//Import packages
const express = require("express");
const fetch = require("node-fetch");
const redis = require("redis");

//Declare express server port and redis client port
const PORT = process.env.PORT || 3000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

//Create Redis client on Redis port
const redisClient = redis.createClient(REDIS_PORT);

const app = express();

//Set response
function setResponse(username, data) {
  return `<p>User <strong>${data.login}</strong> has <strong>${data.public_repos}</strong> public repositories...</p>`;
}

//Make request to GitHub for data
async function getPublicReposNumber(req, res, next) {
  try {
    console.log("Fetching data...");

    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    //set to redis
    redisClient.setex(username, 3600, data);

    res.status(200).send(setResponse(username, data));
  } catch (error) {
    console.error(error);
    req.status(500).json({ error: error });
  }
}

//Cache midleware
function cache(req, res, next) {
  const { username } = req.params;

  redisClient.get(username, (error, cachedData) => {
    if (error) throw error;

    if (cachedData != null) {
      res.send(setResponse(username, cachedData));
    } else {
      next();
    }
  });
}

app.get("/repos/:username", cache, getPublicReposNumber);
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}...`);
});
