import { RequestType, URLRequest, URLResponse } from "./types";
import * as pdfjsLib from 'pdfjs-dist';


document.addEventListener("DOMContentLoaded", () => {
  const button: HTMLButtonElement = document.getElementById("anki-this-button") as HTMLButtonElement;
  button?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { type: RequestType.URL });
      if (response.success) {
        console.log("recieved response: " + response.url);
        button.textContent = "Parsing...";
        button.disabled = true;
        const text = await parseText(response.url);
        console.log("parsed text: " + text);
        button.textContent = text;
        button.disabled = false;
      } else {
        button.textContent = "Error: " + response.message;
      }
    } else {
      button.textContent = "No active tab";
    }
  });
});

const parseText = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/pdf")) {
      const pdfData = await response.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.js');
      
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      
      return textContent.items
        .map((item: any) => item.str)
        .join(' ');
    } else {
      return "ERROR: Only PDF files are supported";
    }
  } catch (error) {
    console.error("Error parsing text:", error);
    return "";
  }
};