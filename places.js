'use strict'

const myKey = AIzaSyDFcTJgoRraYVYamm4msIbDrjt51WWDeZo

export function getPlacesList(query) {
    request('https://maps.googleapis.com/maps/api/place/textsearch/json?query='+query+'&key='+myKey+, { json: true }, (err, res, body) => {
      console.log(body);
    }
}

export { getPlacesList };
