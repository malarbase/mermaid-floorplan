// Grammar instructions for the AI assistant
const GRAMMAR_INSTRUCTIONS = `
You are a helpful assistant for a floorplan 3D viewer application. Users can ask questions about their floorplans, request modifications, or get help with the syntax.

The floorplan DSL supports:
- Floors with rooms: floor <name> { room definitions }
- Rooms: room <name> at (x, y) size (w x h) walls [...]
- Wall types: solid, door, window, open
- Connections: connect room1.wall to room2.wall door at 50%
- Styles: style <name> { floor_color, wall_color, roughness, metalness }
- Config: config { default_style, wall_thickness, theme }

When modifying the floorplan, return the modified content surrounded with \`\`\`fp and \`\`\`
`;

export class OpenAIChatService {
  private apiKey: string | null = null;
  private model: string = "gpt-4o-mini";
  private baseUrl: string = "https://api.openai.com/v1";
  private messages: Array<{ role: string; content: string }> = [];

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  setModel(model: string) {
    this.model = model;
  }

  setBaseUrl(baseUrl: string) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async sendMessage(
    userMessage: string,
    floorplanContent: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Please enter your OpenAI API key first");
    }

    if (this.messages.length === 0) {
      this.messages.push({
        role: "system",
        content: `${GRAMMAR_INSTRUCTIONS}\n\nThe current floorplan content is:\n${floorplanContent}`,
      });
    }

    this.messages.push({
      role: "user",
      content: userMessage,
    });

    this.messages.push({
      role: "system",
      content: `When modifying the floorplan, return the modified floorplan content, surrounded with "\`\`\`fp" and "\`\`\`"`,
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: this.messages,
            max_tokens: 2000,
            temperature: 0.7,
            stream: false,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const data = await response.json();
      const assistantMessage =
        data.choices[0]?.message?.content ||
        "Sorry, I could not generate a response.";

      this.messages.push({
        role: "assistant",
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  }

  clearHistory() {
    this.messages = [];
  }

  isApiKeySet(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  updateFloorplanContext(floorplanContent: string) {
    // Update the system message with new floorplan content
    if (this.messages.length > 0) {
      this.messages[0] = {
        role: "system",
        content: `${GRAMMAR_INSTRUCTIONS}\n\nThe current floorplan content is:\n${floorplanContent}`,
      };
    }
  }
}

