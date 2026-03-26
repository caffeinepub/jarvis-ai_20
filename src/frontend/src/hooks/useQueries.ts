import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserPreferences } from "../backend.d";
import { useActor } from "./useActor";

export function useGetUserPrefs() {
  const { actor, isFetching } = useActor();
  return useQuery<UserPreferences>({
    queryKey: ["userPrefs"],
    queryFn: async () => {
      if (!actor)
        return { userName: "", assistantName: "JARVIS", voiceSpeed: 1.0 };
      try {
        return await actor.getUserPrefs();
      } catch {
        return { userName: "", assistantName: "JARVIS", voiceSpeed: 1.0 };
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetOpenAIKey() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["openAIKey"],
    queryFn: async () => {
      if (!actor) return "";
      try {
        return await actor.getOpenAIKey();
      } catch {
        return "";
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateUserPrefs() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userName,
      assistantName,
      voiceSpeed,
    }: UserPreferences) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateUserPrefs(userName, assistantName, voiceSpeed);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userPrefs"] });
    },
  });
}

export function useSetOpenAIKey() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.setOpenAIKey(key);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["openAIKey"] });
    },
  });
}

export function useSendOpenAIRequest() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (requestBody: string) => {
      if (!actor) throw new Error("Actor not ready");
      const apiKey = localStorage.getItem("jarvis_api_key") || "";
      if (typeof (actor as any).sendOpenAIRequestWithKey === "function") {
        return (actor as any).sendOpenAIRequestWithKey(requestBody, apiKey);
      }
      return actor.sendOpenAIRequest(requestBody);
    },
  });
}

export function useClearHistory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.clearConversationHistory();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversationHistory"] });
    },
  });
}
