import Map "mo:core/Map";
import Float "mo:core/Float";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import OutCall "http-outcalls/outcall";

actor {
  type UserPreferences = {
    userName : Text;
    assistantName : Text;
    voiceSpeed : Float;
  };

  type Message = {
    role : Text;
    content : Text;
  };

  let userPrefs = Map.empty<Principal, UserPreferences>();
  let conversations = Map.empty<Principal, [Message]>();

  // Stable so key survives canister upgrades/redeployments
  stable var openAIKey : Text = "";

  public shared ({ caller }) func updateUserPrefs(userName : Text, assistantName : Text, voiceSpeed : Float) : async () {
    if (voiceSpeed <= 0.0 or voiceSpeed > 10.0) {
      Runtime.trap("Voice speed must be between 0 and 10");
    };
    let prefs : UserPreferences = { userName; assistantName; voiceSpeed };
    userPrefs.add(caller, prefs);
  };

  public query ({ caller }) func getUserPrefs() : async UserPreferences {
    switch (userPrefs.get(caller)) {
      case (null) { { userName = ""; assistantName = "JARVIS"; voiceSpeed = 1.0 } };
      case (?prefs) { prefs };
    };
  };

  public query ({ caller }) func getConversationHistory() : async [Message] {
    switch (conversations.get(caller)) {
      case (null) { [] };
      case (?messages) { messages };
    };
  };

  public shared ({ caller }) func clearConversationHistory() : async () {
    conversations.remove(caller);
  };

  public shared ({ caller }) func setOpenAIKey(key : Text) : async () {
    openAIKey := key;
  };

  public query ({ caller }) func getOpenAIKey() : async Text {
    openAIKey;
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Accept key directly so it works even if stable var is empty
  public shared ({ caller }) func sendOpenAIRequest(requestBody : Text) : async Text {
    if (openAIKey == "") { Runtime.trap("OpenAI API key not set. Please add it in Config.") };

    let headers = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Authorization"; value = "Bearer " # openAIKey },
    ];

    let response = await OutCall.httpPostRequest(
      "https://api.openai.com/v1/chat/completions",
      headers,
      requestBody,
      transform,
    );

    response;
  };

  // New: accepts apiKey directly so it never depends on stored state
  public shared ({ caller }) func sendOpenAIRequestWithKey(requestBody : Text, apiKey : Text) : async Text {
    let key = if (apiKey != "") { apiKey } else { openAIKey };
    if (key == "") { Runtime.trap("OpenAI API key not set. Please add it in Config.") };

    let headers = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Authorization"; value = "Bearer " # key },
    ];

    let response = await OutCall.httpPostRequest(
      "https://api.openai.com/v1/chat/completions",
      headers,
      requestBody,
      transform,
    );

    response;
  };
};
