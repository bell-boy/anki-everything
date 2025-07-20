const keyInput = document.getElementById("openai-api-key") as HTMLInputElement;

chrome.storage.local.get("userConfig").then(async ({ userConfig: { apiKey } }) => {
  keyInput.value = apiKey || "";
})

const saveButton = document.getElementById("save-button") as HTMLButtonElement;
saveButton.addEventListener("click", async () => {
  const apiKey = keyInput.value.trim();
  if (!apiKey) {
    alert("Please enter a valid OpenAI API key.");
    return;
  }
  await chrome.storage.local.set({ userConfig: { apiKey } });
  alert("API key saved successfully!");
})