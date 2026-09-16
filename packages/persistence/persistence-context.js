/** Constructs and wires the persistence repositories and their reference checks. */

import { ProtocolFamilyRepository } from "./repositories/protocol-family-repository.js";
import { PlannedProtocolVersionRepository } from "./repositories/planned-protocol-version-repository.js";
import { ExecutedProtocolRepository } from "./repositories/executed-protocol-repository.js";

/** Constructs and wires the persistence infrastructure. */
export class PersistenceContext {
    protocolFamilies;
    plannedProtocolVersions;
    executedProtocols;

    /** Constructs and wires the persistence repositories. */
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
