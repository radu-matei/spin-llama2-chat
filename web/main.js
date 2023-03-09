const chatHistory = document.querySelector('.chat-history');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');

const id = uuidv4();

// Function to add a new message to the chat history
function addMessageToChatHistory(speaker, message) {
	const msg = message.replace(/^\s+|\s+$/g, '');
	const newMessage = document.createElement('p');
	newMessage.innerText = `${speaker}: ${msg}`;
	chatHistory.appendChild(newMessage);
	chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Function to add a new message to the chat history with typing animation
function typeMessage(speaker, message) {
	const msg = message.replace(/^\s+|\s+$/g, '');
	const newMessage = document.createElement('p');
	chatHistory.appendChild(newMessage);

	let i = 0;
	const typingAnimation = setInterval(() => {
		newMessage.innerText = `${speaker}: ${msg.substring(0, i++)}_`;
		if (i > msg.length) {
			newMessage.innerText = `${speaker}: ${msg}`;
			clearInterval(typingAnimation);
			chatHistory.scrollTop = chatHistory.scrollHeight;
		}
	}, 30);
}

// Function to handle sending a message to the OpenAI API
async function sendMessageToAPI(id, message) {
	// TODO: Add code to send message to OpenAI API and get response
	// The response should be passed to the addMessageToChatHistory function
	let response = await fetch("/api/generate", { method: "POST", body: JSON.stringify({ id: id, message: message }) });
	typeMessage("AI", await response.text());
}

// Event listener for send button click
sendButton.addEventListener('click', () => {
	const message = messageInput.value.trim();

	if (message) {
		addMessageToChatHistory('user', message);
		messageInput.value = '';
		sendMessageToAPI(id, message);
	}
});

// Event listener for enter key press
messageInput.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
		const message = messageInput.value.trim();

		if (message) {
			addMessageToChatHistory('user', message);
			messageInput.value = '';
			sendMessageToAPI(id, message);
		}
	}
});

clearButton.addEventListener('click', async () => {
	chatHistory.innerHTML = '';
	await fetch(`/api/${id}`, { method: "DELETE" });
});

function uuidv4() {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}

