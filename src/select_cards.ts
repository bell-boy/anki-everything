import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { CardResponseSchema, PublishCardsRequest } from "./types";

const createCardElement = (text : string) => {
  const cardElement = document.createElement("div");
  const cardText = document.createElement("p");
  cardText.textContent = text;

  const acceptButton = document.createElement("button");
  acceptButton.textContent = "Accept";

  let isAccepted : boolean = false;
  acceptButton.addEventListener("click",  () => {
    isAccepted = !isAccepted;
    acceptButton.textContent = isAccepted ? "Reject" : "Accept";
  });

  cardElement.appendChild(cardText);
  cardElement.appendChild(acceptButton);

  const req = {
    "action": "addNote",
    "version": 6,
    "params": {
      "note": {
        "deckName": "Default",
        "modelName": "Cloze",
        "fields": {
          "Text": text,
        },
        "tags": ["anki-everything"]
      }
    }
  }

  const publishToAnkiCallBack = async () => {
    if (isAccepted) {
      const res = await fetch("http://localhost:8765", {
        "method": "POST",
        "body": JSON.stringify(req)
      });
      const res_body = await res.json();
      console.log("res_body: ", res_body);
    }
  };
  return { cardElement, publishToAnkiCallBack };
}

const callBackArray : Function[] = []

let openai : any = null;
chrome.storage.local.get("userConfig").then(async ({ userConfig: { apiKey } }) => {
  openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });
})


chrome.storage.local.get("AECardInfo").then(async ({AECardInfo : {sourceText, numCards, cards}}) => {
  console.log("sourceText: ", sourceText);
  console.log("numCards: ", numCards);
  console.log("cards: ", cards);

  const submit = document.getElementById("submit-button") as HTMLButtonElement;
  submit.disabled = true;
  submit.textContent = "loading"

  let cardObject : any = null;
  if (!cards) {
    const completion = await openai.chat.completions.create({
      model: "o3",
      messages: [
        {
          role: "system",
          content:
            `You are an AI assistant developed to generate anki cards for a computer science/ml researcher. 
            Based on the provided text, generate flash cards. If a number N is provided, think of the N most 
            relevent concepts within the source text and generate flash cards based on that, otherwise, think 
            through all the concepts worth remembering in the text and generate as many flashcards as needed.
            
            You're going to geneate your flash cards in cloze deletion format. Your response should be a 
            structured json object following this typescript format:
            
            \`\`\`typescript 
            interface CardResponse {
              cards: string[];
            }
            \`\`\`
            
            Each card should be a cloze deletion style card in the anki format. When writing mathematical 
            equations, use MathJax style latex to format them. The given text might contain unicode based mathematical symbols.
            Ignore them and use MathJax to create your own. You should spend some time thinking about what a researcher 
            would want to remember from the text and generate cards accordingly.
            
            Each of the cards you generate are going to go in a large deck with other cards, so you should cite the work if it's a cutting edge research
            paper. Eg. "In the paper 'Toy Models of Superposition' researchers found that...". Cite the paper in a human readable way
            , eg. "In the paper 'Dense SAE Latents are features not Bugs'..." instead of "In the arXiv:2506.15679...". Note that
            all cards are INDEPENDENT of each other. Meaning that every card should have a source citation, not just the first one.
            
            If the content is generic enough (i.e. not a paper, but a general result known to the broader literature), don't cite the paper.
            This means that for most textbook content, you shouldn't bother citing the paper and focus on the contents of the cards.

            Make sure to pay attention to what the authors say are the key takeaways from the text. But reason
            and include any other findings that might be relevant to researchers.
            
            You should consider these core principles of flash card design
            
            1. Focus each card on a single concept or fact
            2. Provide enough context.
            3. Emphasize active recall.
            4. Limit congative load`
        },
        {
          role: "user",
          content: `Based on the following text, generate ${
            numCards < 1 ? "an appropriate number of" : numCards
          } flash cards: ${sourceText}`,
        },
      ],
      response_format: zodResponseFormat(CardResponseSchema, "CardResponse"),
    });

    // @ts-ignore
    console.log("completion: ", completion.choices[0].message);
    // TODO: probably need a null check
    cardObject = JSON.parse(completion.choices[0].message.content!);
    chrome.storage.local.set({"AECardInfo": { sourceText, numCards, cards: cardObject }});
  } else {
    cardObject = cards;
  }

  cardObject.cards.map((cardText : string) => {
    const { cardElement, publishToAnkiCallBack } = createCardElement(cardText);
    // TODO: figure out what to do in these situations
    document.getElementById("card-container")!.appendChild(cardElement);
    callBackArray.push(publishToAnkiCallBack);
  });

  submit.textContent = "Submit";
  submit.disabled = false;
})

document.getElementById("submit-button")?.addEventListener("click", async () => {
  for (const callBack of callBackArray) {
    await callBack();
  }
});