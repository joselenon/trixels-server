import express from 'express';

// Analyses HTTP request body as JSON (verifies if it has a body and if content type is 'application/json')
export function expressJSONMiddleware() {
  return express.json();
}

// Analyses data received through HTML forms in POST requests and makes them accessible
// extended: false - data will be analysed through Node 'querystring' (doesn't support objects and arrays)
// extended: true - data will be analysed through 'qs' library (support objects and arrays)
export function expressURLEncodedMiddleware() {
  return express.urlencoded({ extended: true });
}
