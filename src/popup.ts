import { RequestType, URLRequest, URLResponse, CardRequest, CardResponse } from "./types";
import * as pdfjsLib from 'pdfjs-dist';
import OpenAI from "openai";


/**
 * Extracts text from a PDF given its ArrayBuffer and a page range (inclusive).
 */
const parseText = async (
  pdf: any,
  startPage: number,
  endPage: number
): Promise<string> => {
  try {
    // pdf object already prepared by caller

    // Clamp page numbers to valid ranges
    const clampedStart = Math.max(1, Math.min(startPage, pdf.numPages));
    const clampedEnd = Math.max(clampedStart, Math.min(endPage, pdf.numPages));

    const texts: string[] = [];
    for (let i = clampedStart; i <= clampedEnd; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      texts.push(
        textContent.items
          .map((item: any) => (item as any).str)
          .join(" ")
      );
    }
    return texts.join("\n");
  } catch (error) {
    console.error("Error parsing text:", error);
    return "";
  }
};

/**
 * Loads the provided PDF (ArrayBuffer), determines the total page count, and populates
 * the start & end page <select> elements with valid options.
 */
const populatePageSelects = async (pdf: any): Promise<void> => {
  try {
    const numPages = pdf.numPages;

    const startSelect = document.getElementById("start-page-select") as HTMLSelectElement;
    const endSelect = document.getElementById("end-page-select") as HTMLSelectElement;

    // Clear any existing options
    startSelect.innerHTML = "";
    endSelect.innerHTML = "";

    for (let i = 1; i <= numPages; i++) {
      const startOpt = document.createElement("option");
      startOpt.value = String(i);
      startOpt.text = String(i);
      startSelect.appendChild(startOpt);

      const endOpt = document.createElement("option");
      endOpt.value = String(i);
      endOpt.text = String(i);
      endSelect.appendChild(endOpt);
    }

    // Default selections
    startSelect.value = "1";
    endSelect.value = String(numPages);
  } catch (error) {
    console.error("Failed to populate page selects", error);
  }
};


const button = document.getElementById("anki-this-button") as HTMLButtonElement;
const startSelect = document.getElementById("start-page-select") as HTMLSelectElement;
const endSelect = document.getElementById("end-page-select") as HTMLSelectElement;
const numCardsInput = document.getElementById("num-cards-input") as HTMLInputElement;

button.disabled = true;
button.textContent = "Loading...";

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const response = await chrome.tabs.sendMessage(tab.id!, { type: RequestType.URL });
let url: string;
if (response.success) {
  url = response.url!;
} else {
  console.error("Error failed to get url: " + response.message);
  url = "";
}

if (!url) {
  console.error("No valid PDF URL retrieved");
} else {
  const pdfData = await fetch(url).then((res) => res.arrayBuffer());

  // Build the PDF object once and reuse it everywhere
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf.worker.js");
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

  // Populate start / end page selects once we know how many pages are in the PDF
  await populatePageSelects(pdf);

  button.disabled = false;
  button.textContent = "Anki This";
  button?.addEventListener("click", async () => {
    // -------- Validation --------
    const startPage = Number(startSelect.value);
    const endPage = Number(endSelect.value);
    const numCardsParsed = numCardsInput.value ? Number(numCardsInput.value) : -1;

    if (!startPage || !endPage) {
      button.textContent = "Select page range";
      return;
    }

    if (startPage > endPage) {
      button.textContent = "Start > End page";
      return;
    }

    if (numCardsInput.value && (isNaN(numCardsParsed) || numCardsParsed <= 0)) {
      button.textContent = "Invalid # cards";
      return;
    }

    button.textContent = "Parsing...";
    button.disabled = true;

    const text = await parseText(pdf, startPage, endPage);
    console.log("parsed text: " + text);

    await chrome.storage.local.set({AECardInfo: {
      sourceText: text,
      numCards: numCardsParsed > 0 ? numCardsParsed : undefined,
      cards: null
    }});
    const url : string = chrome.runtime.getURL("select_cards.html");
    chrome.tabs.create({ url });
  });
}
document.getElementById("settings-button")?.addEventListener("click", async () => {
  window.open(chrome.runtime.getURL("options.html"));
  window.close();
})