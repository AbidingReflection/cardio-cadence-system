import { ProtocolFamilyRepository } from "./protocol-family-repository.js";
import { PlannedProtocolVersionRepository } from "./planned-protocol-version-repository.js";
import { ExecutedProtocolRepository } from "./executed-protocol-repository.js";

export class PersistenceContext {
    protocolFamilies;
    plannedProtocolVersions;
    executedProtocols;

    constructor() {
        let executedProtocolRepository;

        this.plannedProtocolVersions = new PlannedProtocolVersionRepository({
            isReferenced: (plannedProtocolVersionId) =>
                executedProtocolRepository?.hasPlannedProtocolVersionReference(
                    plannedProtocolVersionId,
                ) ?? false,
        });

        executedProtocolRepository = new ExecutedProtocolRepository({
            plannedProtocolVersionRepository: this.plannedProtocolVersions,
        });

        this.executedProtocols = executedProtocolRepository;

        this.protocolFamilies = new ProtocolFamilyRepository({
            isReferenced: (protocolFamilyId) =>
                this.plannedProtocolVersions.hasProtocolFamilyReference(protocolFamilyId),
        });
    }
}
