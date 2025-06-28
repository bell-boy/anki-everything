import { RequestType, URLResponse } from "./types";

console.log("url_extractor.js loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === RequestType.URL) {
    const response: URLResponse = {
      type: RequestType.URL,
      success: true,
      url: window.location.href
    }
    sendResponse(response)
  }
})