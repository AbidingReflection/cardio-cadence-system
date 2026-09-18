/** Constructs and wires the persistence repositories and application services. */

import { ActivityTypeVersionRepository } from "./repositories/activity-type-version-repository.js";
import { CalibrationProfileVersionRepository } from "./repositories/calibration-profile-version-repository.js";
import { ExecutedProtocolRepository } from "./repositories/executed-protocol-repository.js";
import { MachineProfileVersionRepository } from "./repositories/machine-profile-version-repository.js";
import { PlannedProtocolVersionRepository } from "./repositories/planned-protocol-version-repository.js";
import { ProtocolFamilyRepository } from "./repositories/protocol-family-repository.js";
import { DomainVersionSync } from "./services/domain-version-sync.js";
import { LibraryPersistence } from "./services/library-persistence.js";
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
    libraryPersistence;
    domainVersionSync;

    /** Constructs and wires the persistence repositories and services. */
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
            executedProtocolRepository: this.executedProtocols,
            idGenerator,
            clock,
        });

        this.libraryPersistence = new LibraryPersistence({
            protocolFamilyRepository: this.protocolFamilies,
            plannedProtocolVersionRepository: this.plannedProtocolVersions,
            executedProtocolRepository: this.executedProtocols,
            activityTypeVersionRepository: this.activityTypeVersions,
            machineProfileVersionRepository: this.machineProfileVersions,
            calibrationProfileVersionRepository: this.calibrationProfileVersions,
            idGenerator,
            clock,
        });

        this.domainVersionSync = new DomainVersionSync({
            libraryPersistence: this.libraryPersistence,
        });
    }
}
