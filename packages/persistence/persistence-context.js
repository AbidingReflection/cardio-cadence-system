/** Constructs and wires the persistence repositories and application service. */

import { ActivityTypeVersionRepository } from "./repositories/activity-type-version-repository.js";
import { CalibrationProfileVersionRepository } from "./repositories/calibration-profile-version-repository.js";
import { ExecutedProtocolRepository } from "./repositories/executed-protocol-repository.js";
import { MachineProfileVersionRepository } from "./repositories/machine-profile-version-repository.js";
import { PlannedProtocolVersionRepository } from "./repositories/planned-protocol-version-repository.js";
import { ProtocolFamilyRepository } from "./repositories/protocol-family-repository.js";
import { PersistenceService } from "./services/persistence-service.js";

/** Constructs and wires the persistence infrastructure. */
export class PersistenceContext {
    protocolFamilies;
    plannedProtocolVersions;
    executedProtocols;
    activityTypeVersions;
    machineProfileVersions;
    calibrationProfileVersions;
    service;

    /** Constructs and wires the persistence repositories and service. */
    constructor({ idGenerator, clock } = {}) {
        let executedProtocolRepository;

        this.activityTypeVersions = new ActivityTypeVersionRepository();
        this.machineProfileVersions = new MachineProfileVersionRepository();
        this.calibrationProfileVersions = new CalibrationProfileVersionRepository();

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

        this.service = new PersistenceService({
            protocolFamilyRepository: this.protocolFamilies,
            plannedProtocolVersionRepository: this.plannedProtocolVersions,
            idGenerator,
            clock,
        });
    }
}
