import { CoordinatorClient, type CommitRecord, type Health, type MakerPublic, type Phase, type PoolsResponse, type ProofSummary, type RoundView } from "@niskala/sdk";
import { COORDINATOR_URL } from "./chain/network";

export type { CommitRecord, Health, MakerPublic, Phase, PoolsResponse, ProofSummary, RoundView };

export const api = new CoordinatorClient(COORDINATOR_URL);
