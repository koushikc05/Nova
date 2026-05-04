class NovaChat {
    constructor() {
        this.history = [];
        this.currentTopic = "General";
        this.isWaitingForResponse = false;
        
        // DOM Elements
        this.chatContainer = document.getElementById("chat-container");
        this.chatInput = document.getElementById("chat-input");
        this.sendBtn = document.getElementById("send-btn");
        this.topicPills = document.querySelectorAll(".topic-pill");
        this.quickStarters = document.querySelectorAll(".starter-btn");

        this.initEventListeners();
        this.addOpeningGreeting();
    }

    initEventListeners() {
        // Auto-resize textarea
        this.chatInput.addEventListener("input", () => {
            this.chatInput.style.height = "auto";
            this.chatInput.style.height = `${Math.min(this.chatInput.scrollHeight, 150)}px`;
            
            if (this.chatInput.value.trim().length > 0) {
                this.sendBtn.classList.add("active");
            } else {
                this.sendBtn.classList.remove("active");
            }
        });

        // Key press handling
        this.chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        // Send button click
        this.sendBtn.addEventListener("click", () => {
            this.handleSendMessage();
        });

        // Topic Selection
        this.topicPills.forEach(pill => {
            pill.addEventListener("click", (e) => {
                const target = e.target;
                this.topicPills.forEach(p => p.classList.remove("active"));
                target.classList.add("active");
                this.currentTopic = target.getAttribute("data-topic") || "General";
            });
        });

        // Quick Starters — append to input instead of sending directly
        this.quickStarters.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const target = e.target;
                const promptText = target.innerText;

                // Toggle active state on the button
                const wasActive = target.classList.contains("active");
                // Deactivate all first
                this.quickStarters.forEach(b => b.classList.remove("active"));

                if (wasActive) {
                    // Remove this prompt text from the input if present
                    const prefix = `${promptText}: `;
                    if (this.chatInput.value.startsWith(prefix)) {
                        this.chatInput.value = this.chatInput.value.slice(prefix.length);
                    } else if (this.chatInput.value === promptText) {
                        this.chatInput.value = "";
                    }
                } else {
                    // Activate this button & prepend the prompt to the input
                    target.classList.add("active");
                    const currentText = this.chatInput.value.trim();
                    if (currentText) {
                        // If user already typed something, prepend the prompt
                        this.chatInput.value = `${promptText}: ${currentText}`;
                    } else {
                        this.chatInput.value = `${promptText}: `;
                    }
                }

                // Focus input so user can continue typing
                this.chatInput.focus();
                // Trigger input event to update send-btn state & textarea height
                this.chatInput.dispatchEvent(new Event("input"));
            });
        });
    }

    addOpeningGreeting() {
        const greeting = "Hello! I'm Nova, your AI tutor. How can I help you today?";
        this.renderMessage("bot", greeting);
        // Add greeting to history so model has context
        this.history.push({
            role: "model",
            parts: [{ text: greeting }]
        });
    }

    async handleSendMessage() {
        const text = this.chatInput.value.trim();
        if (!text || this.isWaitingForResponse) return;

        // Contextualize message if topic is not General
        let messageToSend = text;
        if (this.currentTopic !== "General") {
            messageToSend = `[Context: ${this.currentTopic}] ${text}`;
        }

        // Add user message to UI and history
        this.renderMessage("user", text); // Render original text
        this.history.push({
            role: "user",
            parts: [{ text: messageToSend }]
        });

        // Reset input and quick starters
        this.chatInput.value = "";
        this.chatInput.style.height = "auto";
        this.sendBtn.classList.remove("active");
        this.quickStarters.forEach(b => b.classList.remove("active"));

        this.isWaitingForResponse = true;
        const typingId = this.renderTypingIndicator();

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ history: this.history })
            });

            const data = await response.json();
            
            this.removeTypingIndicator(typingId);
            
            if (response.ok && data.reply) {
                const replyText = data.reply;
                this.renderMessage("bot", replyText);
                this.history.push({
                    role: "model",
                    parts: [{ text: replyText }]
                });
            } else {
                this.renderMessage("bot", `Error: ${data.detail || "Failed to communicate with Nova."}`);
            }
        } catch (error) {
            this.removeTypingIndicator(typingId);
            this.renderMessage("bot", "Network error. Please try again later.");
        } finally {
            this.isWaitingForResponse = false;
        }
    }

    renderMessage(sender, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender}`;
        
        const bubbleDiv = document.createElement("div");
        bubbleDiv.className = "bubble";
        
        // Simple markdown parsing for code blocks and bold
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
            
        bubbleDiv.innerHTML = formattedText;
        
        msgDiv.appendChild(bubbleDiv);
        this.chatContainer.appendChild(msgDiv);
        this.scrollToBottom();
    }

    renderTypingIndicator() {
        const id = "typing-" + Date.now();
        const msgDiv = document.createElement("div");
        msgDiv.className = "message bot";
        msgDiv.id = id;
        
        const bubbleDiv = document.createElement("div");
        bubbleDiv.className = "bubble";
        
        const indicator = document.createElement("div");
        indicator.className = "typing-indicator";
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        bubbleDiv.appendChild(indicator);
        msgDiv.appendChild(bubbleDiv);
        this.chatContainer.appendChild(msgDiv);
        this.scrollToBottom();
        
        return id;
    }

    removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) {
            el.remove();
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
    new NovaChat();
});
