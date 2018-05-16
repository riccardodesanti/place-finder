'use strict';

// Imports dependencies and set up http server
const request = require('request');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server
let distance;

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));



// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {


let body = req.body;

// Checks this is an event from a page subscription
if (body.object === 'page') {

  // Iterates over each entry - there may be multiple if batched
  body.entry.forEach(function(entry) {
    // Gets the body of the webhook event
    let webhook_event = entry.messaging[0];
    console.log(webhook_event);

    //Get the sender PSID
    let sender_psid = webhook_event.sender.id;
    console.log('Sender PSID: ' + sender_psid); 

    // Check if the event is a message or postback and pass the event to the appropriate handler function
    if (webhook_event.message) {
      handleMessage(sender_psid, webhook_event.message);
    } else if (webhook_event.postback) {
      handlePostback(sender_psid, webhook_event.postback);
    }
  });

  // Returns a '200 OK' response to all requests
  res.status(200).send('EVENT_RECEIVED');
} else {
  // Returns a '404 Not Found' if event is not from a page subscription
  res.sendStatus(404);
}
});

app.get("/", function (req, res) {
  res.send("Deployed!");
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = process.env.VERIFY_TOKEN

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

function firstEntity(nlp, name) {
  return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

// Handles messages events
function handleMessage(sender_psid, received_message, user_first_name) {

  // Checks if message contains greetings or date/time
  const greeting = firstEntity(received_message.nlp, 'greetings');
  // const date = firstEntity(received_message.nlp, 'datetime');
  //
  // if (date && date.confidence > 0.8) {
  //   let response = { "text" : "Please confirm that you would like to visit us on "+ date.value}
  //   // Sends the response message
  //   callSendAPI(sender_psid, response, null);
  // }
  // else {
  if ( received_message.quick_reply) {
    let payload = received_message.quick_reply.payload;
    let response;
    let quick_replies = null;

    // Set the response based on the postback payload
      switch (payload) {
        case "1":
          distance = 1;
          console.log("1 km selected");
          response = "I'll show you the best rated within 1 km.";
          break;
        case "5":
          distance = 5;
          console.log("5 km selected");
          response = "I'll show you the best rated within 5 km.";
          break;
        case "10":
          distance = 10;
          console.log("10 km selected");
          response = "I'll show you the best rated within 10 km.";
          break;
        case "50":
          distance = 50;
          console.log("50 km selected");
          response = "I'll show you the best rated within 50 km.";
          findAndShow(50);
          break;
        case "whatever":
          distance = "whatever";
          console.log("whatever km selected");
          response = "I'll show you the best rated.";
          break;
        case "distance":
          console.log("distance");
          response = "Which is the maximum distance in km you prefer?";
          quick_replies =  [
          {
            "content_type":"text",
            "title":"  1  ",
            "payload":"2"
          },
          {
            "content_type":"text",
            "title":" 5 ",
            "payload":"5"
          },
          {
            "content_type":"text",
            "title":" 10 ",
            "payload":"10"
          },
          {
            "content_type":"text",
            "title":" 50 ",
            "payload":"50"
          },
          {
            "content_type":"text",
            "title":"whatever",
            "payload":"whatever"
          },
        ];
        break;
        case "rates":
          console.log("distance");
          //inserire qui funzione per proseguire
          break;
        default: console.log("default case");
      }
    callSendAPI(sender_psid, response, quick_replies);
  }
  else if (greeting && greeting.confidence > 0.9) {
    let user_first_name;
    request('https://graph.facebook.com/v2.6/'+ sender_psid + '?fields=first_name,last_name&access_token=EAADJeIc5WcYBALY1X0tGsPgDgZADy1zLZAbLZAszZCpHKl57ZA0EZADZAadNDU4UqKahUvQ6QMN0qEfI6hZBMb1ZBZC2pbwGrqrshplzG2mCMvYBwWIBVx2tFhnGaZBIjpfcbCbMu8NkLy9ZB8nSPYAfIj0jSZCcloajEZCVCOZCjXY21BKZBAZDZD', { json: true }, (err, res, body) => {
      if (err) { return console.log(err); }
      let user_first_name = body.first_name;
      // Creates the payload for a basic text messages
      let response = "Hello "+ user_first_name +", I can help you. What place are you looking for?";
      // Sends the response message
      callSendAPI(sender_psid, response, null);
    });
  }
  else {
    // Creates the payload for a basic text messages
    let response = "Got it, do you want me to prefer distance or rate?";
    let quick_replies =  [
      {
        "content_type":"text",
        "title":" distance ",
        "payload":"distance"
      },
      {
        "content_type":"text",
        "title":" rates ",
        "payload":"rates"
      }
    ];
    // Sends the response message
    callSendAPI(sender_psid, response, quick_replies);
  }
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;
  // Gets the payload of the postback
  let payload = received_postback.payload;
  // Set the response based on the postback payload

  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response, null);

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response, quick_replies) {
  // Constructs the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message":  {
      "text": response,
      "quick_replies": quick_replies
    }
  }

  //Sends the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": "EAADJeIc5WcYBALY1X0tGsPgDgZADy1zLZAbLZAszZCpHKl57ZA0EZADZAadNDU4UqKahUvQ6QMN0qEfI6hZBMb1ZBZC2pbwGrqrshplzG2mCMvYBwWIBVx2tFhnGaZBIjpfcbCbMu8NkLy9ZB8nSPYAfIj0jSZCcloajEZCVCOZCjXY21BKZBAZDZD"},
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!');
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}
// Finds the places through the Google Places API and shows them in chat
function findAndShow(distance) {

}

// Manages the Google Places API

function getPlacesList(query) {
    const myKey = AIzaSyDFcTJgoRraYVYamm4msIbDrjt51WWDeZo
    request('https://maps.googleapis.com/maps/api/place/textsearch/json?query='+query+'&key='+myKey, { json: true }, (err, res, body) => {
      return
    });
}
