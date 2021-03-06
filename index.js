'use strict';

// Imports dependencies and set up http server
const request = require('request');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const access_token = "EAADJeIc5WcYBALY1X0tGsPgDgZADy1zLZAbLZAszZCpHKl57ZA0EZADZAadNDU4UqKahUvQ6QMN0qEfI6hZBMb1ZBZC2pbwGrqrshplzG2mCMvYBwWIBVx2tFhnGaZBIjpfcbCbMu8NkLy9ZB8nSPYAfIj0jSZCcloajEZCVCOZCjXY21BKZBAZDZD";
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server
let distance;
let place;
let location;

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
    //Get the sender PSID
    let sender_psid = webhook_event.sender.id;
    handleMessage(sender_psid, webhook_event.message);
  });

  // Returns a '200 OK' response to all requests
  res.status(200).send('EVENT_RECEIVED');
} else {
  // Returns a '404 Not Found' if event is not from a page subscription
  res.sendStatus(404);
}
});

// Test function
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

// Verifies the presence of a nlp entity and define its confidence
function firstEntity(nlp, name) {
  return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

// Handles messages events
function handleMessage(sender_psid, received_message, user_first_name) {

  // Checks if message contains greetings or date/time
  const greeting = firstEntity(received_message.nlp, 'greetings');
  const position = firstEntity(received_message.nlp, 'location');

// When a quick_reply is used the next message received contains a quick_reply property. This function checks its existence.
  if (received_message.quick_reply) {
    let payload = received_message.quick_reply.payload;
    let response;
    let quick_replies = null;
    // Set the response based on the postback payload
      switch (payload) {
        case "1":
          distance = 1;
          break;
        case "5":
          distance = 5;
          break;
        case "10":
          distance = 10;
          break;
        case "50":
          distance = 50;
          break;
        case "whatever":
          distance = "whatever";
          break;
        case "distance":
          response = "What is the maximum distance in kilometers that you prefer?";
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
        case "prominence":
          break;
        default: console.log("default case");
      }

    if ( payload == "distance") {
      callSendAPI(sender_psid, response, quick_replies);
    } else {
      askPosition(sender_psid);
    }
  }
  // If  the message contain a greeting with a high level of confidence it is supposed to be the first message.
  else if (greeting && greeting.confidence > 0.9) {
    let user_first_name;
    request('https://graph.facebook.com/v2.6/'+ sender_psid + '?fields=first_name,last_name&access_token='+access_token, { json: true }, (err, res, body) => {
      if (err) { return console.log(err); }
      let user_first_name = body.first_name;
      // Creates the payload for a basic text messages
      let response = "Hello "+ user_first_name +", I can help you. What place are you looking for?";
      // Sends the response message
      callSendAPI(sender_psid, response, null);
    });
  }
  else if (received_message.attachments) {
    //Takes lat and lng from the location received
    let lat = received_message.attachments[0].payload.coordinates.lat;
    let lng = received_message.attachments[0].payload.coordinates.long;
    //Finds the places through Google's Places API
    findAndShow(lat, lng, sender_psid);
  }
  else {
    // Creates the payload for a basic text messages
    let response = "Got it, do you want me to prefer distance or prominence?";
    place = received_message.text;
    let quick_replies =  [
      {
        "content_type":"text",
        "title":" distance ",
        "payload":"distance"
      },
      {
        "content_type":"text",
        "title":" prominence ",
        "payload":"prominence"
      }
    ];
    // Sends the response message
    callSendAPI(sender_psid, response, quick_replies);
  }
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
  postMessage(request_body);
}

function postMessage(request_body) {
  //Sends the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": access_token},
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

function askPosition(sender_psid) {
  let response = "Great, where are you now?";
  let quick_replies =  [
    {
      "content_type":"location",
      "title":" Location ",
      "payload":"location"
    }
  ];
  callSendAPI(sender_psid, response, quick_replies);
}

// Finds the places through the Google Places API and shows them in chat
function findAndShow(lat, lng, sender_psid) {
  if ( distance == undefined ) { distance = 30; }
  const myKey = "AIzaSyDFcTJgoRraYVYamm4msIbDrjt51WWDeZo";
  request('https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=' + lat + ',' + lng + '&radius=' + distance*1000 +'&keyword=' + place + '&key=AIzaSyDFcTJgoRraYVYamm4msIbDrjt51WWDeZo', { json: true }, (err, res, body) => {
     //If the photos field is present it shows the first photo (combining the general url with the photo_reference property), otherwise it shows the general-business photo.
     let img_url0 = body.results[0].photos ? "https://maps.googleapis.com/maps/api/place/photo?maxwidth=350&photoreference="+body.results[0].photos[0].photo_reference+"&key="+myKey : body.results[0].icon;
     let img_url1 = body.results[1].photos ? "https://maps.googleapis.com/maps/api/place/photo?maxwidth=350&photoreference="+body.results[1].photos[0].photo_reference+"&key="+myKey : body.results[1].icon;
     let img_url2 = body.results[2].photos ? "https://maps.googleapis.com/maps/api/place/photo?maxwidth=350&photoreference="+body.results[2].photos[0].photo_reference+"&key="+myKey : body.results[2].icon;
     let request_body = {
       "recipient": {
         "id": sender_psid
       },
       "message": {
          "attachment": {
            "type": "template",
            "payload": {
              "template_type": "list",
              "top_element_style": "large",
              "elements": [
                {
                  "title": body.results[0].name,
                  "subtitle": body.results[0].rating,
                  "image_url": img_url0,
                  "buttons": [
                    {
                      "title": "View",
                      "type": "web_url",
                      "url": "https://www.google.com/maps/search/?api=1&query="+body.results[0].name+" "+ body.results[0].vicinity +"&query_place_id="+body.results[0].place_id,
                      "webview_height_ratio": "tall",
                    }
                  ]
                },
                {
                  "title": body.results[1].name,
                  "subtitle": body.results[1].rating,
                  "image_url": img_url1,
                  "buttons": [
                    {
                      "title": "View",
                      "type": "web_url",
                      "url": "https://www.google.com/maps/search/?api=1&query="+body.results[1].name+" "+ body.results[1].vicinity +"&query_place_id="+body.results[1].place_id,
                      "webview_height_ratio": "tall",
                    }
                  ]
                },
                {
                  "title": body.results[2].name,
                  "subtitle": body.results[2].rating,
                  "image_url": img_url2,
                  "buttons": [
                    {
                      "title": "View",
                      "type": "web_url",
                      "url": "https://www.google.com/maps/search/?api=1&query="+body.results[2].name+" "+ body.results[2].vicinity +"&query_place_id="+body.results[2].place_id,
                      "webview_height_ratio": "tall",
                    }
                  ]
                }
              ]
            }
          }
        }
     }
     postMessage(request_body);
  });
}
