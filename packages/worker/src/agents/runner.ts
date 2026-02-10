import { resolveOrchestrationRoute } from "./bindings";
import { enqueueCommandInLane, resolveGlobalLane, resolveSessionLane } from "./queue";
import type {
  OrchestrationConfig,
  OrchestrationStage,
  ResolvedOrchestrationRoute,
  StageTrace,
} from "./types";

type BeforeAgentStartHook = (params: {
  stage: OrchestrationStage;
  route: ResolvedOrchestrationRoute;
}) => Promise<void> | void;

type AgentEndHook = (params: {
  stage: OrchestrationStage;
  route: ResolvedOrchestrationRoute;
  durationMs: number;
  error?: string;
}) => Promise<void> | void;

type RunnerOptions = {
  campaignId: number;
  config?: OrchestrationConfig;
  lane?: string;
  hooks?: {
    beforeAgentStart?: BeforeAgentStartHook;
    agentEnd?: AgentEndHook;
  };
};

type RunStageOptions = {
  wallet?: `0x${string}` | null;
};

export function createOrchestrationRunner(options: RunnerOptions) {
  const traces: StageTrace[] = [];
  const globalLane = resolveGlobalLane(options.lane);

  async function runStage<T>(
    stage: OrchestrationStage,
    fn: (route: ResolvedOrchestrationRoute) => Promise<T>,
    stageOptions?: RunStageOptions,
  ): Promise<T> {
    const route = resolveOrchestrationRoute(
      {
        campaignId: options.campaignId,
        stage,
        wallet: stageOptions?.wallet ?? null,
      },
      options.config,
    );

    const sessionLane = resolveSessionLane(route.sessionKey);

    return enqueueCommandInLane(sessionLane, () =>
      enqueueCommandInLane(globalLane, async () => {
        const startedAt = new Date();
        const startedMs = Date.now();
        let errorMessage: string | undefined;

        if (options.hooks?.beforeAgentStart) {
          await options.hooks.beforeAgentStart({ stage, route });
        }

        try {
          const result = await fn(route);
          const endedMs = Date.now();
          const durationMs = endedMs - startedMs;
          traces.push({
            stage,
            agentId: route.agentId,
            sessionKey: route.sessionKey,
            matchedBy: route.matchedBy,
            startedAt: startedAt.toISOString(),
            endedAt: new Date(endedMs).toISOString(),
            durationMs,
          });
          if (options.hooks?.agentEnd) {
            await options.hooks.agentEnd({
              stage,
              route,
              durationMs,
            });
          }
          return result;
        } catch (error) {
          errorMessage = (error as Error).message;
          throw error;
        } finally {
          if (errorMessage && options.hooks?.agentEnd) {
            await options.hooks.agentEnd({
              stage,
              route,
              durationMs: Date.now() - startedMs,
              error: errorMessage,
            });
          }
        }
      }),
    );
  }

  function getTraces(): StageTrace[] {
    return [...traces];
  }

  return {
    runStage,
    getTraces,
  };
}
