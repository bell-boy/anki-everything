# design.md

this is a project to help femi retain more of what he learns, understand web dev/swe better, and get used to coding with claude. as such we have a few goals.

whenever possible try to explain code decisions, and why these decisions were made. the point is to make femi a better engineer, not get things done in as few tokens as possible.

when discussing be socratic. whenever possible, don't just write code, but lead femi to either write the code himself, or asks you to write code in a way that shows that he could've written the code himself.

# core functionality

the main thing we want to focus on is cloze deletion cards, but image occlusion cards would be nice as well. 

my ideal ux is an extension that's active on all pdfs and websites. when i want to create cards based on some pdf/page (hereafter refered to as a source), i'll click the extension and allow the model to either generate cards based on the entire source, or if the page is a pdf, allow me to select a subset of pdf sections/pages that i want to base the cards off of. if the source is a webpage and i highlight text, it should give me the option to generate cards in the right click popup menu.

for this inital version let's keep it simple and just send raw text, but for future versions we should def try sending images of the source pages/selected text.

for now, let's focus on only pdfs.

# technical details

once the extension icon is clicked, we'll want some form of popup with a simple UI. it'll ask you to select the range of pages, and the number of cards you want to generate (leave blank for the model to decide).

after that, we'll make an api request, and show some form of loading. then once the request is returned, we'll give the user the option to either select all or open a new tab to select which cards to keep. finally, the cards will be uploaded to anki when the user clicks some publish button. 

on that first screen we'll have a settings button, where the user can add their openrouter api key, and setup the anki-connect service.

## pop up ui

this pop-up ui will be handled by an html file. when the user specifies what content they want to remember, the ui will need to communicate with both the background script and a content script running on the webpage. it'll do this via a set of interfaces.

```typescript
interface URLRequest {
}

interface TextResponse {
  success: boolean;
  url?: string;
  message?: string;
}

interface CardRequest {
  sourceText: string;
  numCards?: number;
}

interface CardResponse {
  success: bool;
  message: string;
  cards?: string[];
}

interface PublishCardsRequest {
  cards: string[];
}

interface PublishCardsResponse {
  success: boolean;
  message?: string;
}
```

first the ui will check if it has this url cached in the indexdb. if not, it'll send a `TextRequest` message to the content script, once it gets that response it'll download and parse the text with pdf.js and send a `CardRequest` to the background script. 

until it receives the CardResponse message, this ui will display a little loading screen. when it receives this, it'll then transition to the card selection ui

## content script

simple script watching to get the url.


## card selection ui

here the user will select the cards they like and hit publish, when this new tab opens, the cards will be sent along with it via storage session data. the publish button triggers a `PublishCardsRequest`. the screen will display loading until it recieves a `PublishCardsResponse`. upon a successful one, it will clear out the storage session data.

## background script
when the background script receives a `CardRequest`, it'll send the data to the model api provider. we'll use the following system prompt: 

"You are an AI assistant developed to generate anki cards for a computer science/ml researcher. Based on the provided text, generate flash cards. If a number N is provided, think of the N most relevent concepts within the source text and generate flash cards based on that, otherwise, think through all the concepts worth remembering in the text and generate as many flashcards as needed. You're going to geneate your flash cards in cloze deletion format. Your response should be a structured json object following this typescript format ```typescript interface CardResponse {cards: string[];}```. Each card should be a cloze deletion style card in the anki format". 

then, when text comes in, we'll start the turn like 

"Please generate N cards based on the following text {text}". 

obviously the prefix is optional.

we'll validate and try up to some preset number of tries to get a valid `CardResponse` before returning an error.

when reciving a `PublishCardsRequest`, we'll take the cards provided in the object and try to publish to anki before returning a response.

we'll access the needed configuration information via the chrome.storage api. the planned schmea is below

```typescript
interface userInfromation {
  ankiPort: number; // default value 8765
  ankiApiVersion: number; // default value 6
  ankiDeckName: string;
  openRouterApiKey: string;
  maxGenerationTries: number; // some sane default
}
```

this will be set in a settings window.

## error handling

we might get api errors anywhere in the process, that's why we have the success field in both response types, to indicate the status of the response. message is optional to pass on the error code.

ui will force users to only input valid things. only worry is the output of the model, for now we'll just try again.

anki connect might not be running, we'll just send an error when you try to publish.