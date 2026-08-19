/** Application entry point that coordinates startup and wires together data, models, state, and UI components. */

import { loadDomainData } from "./domain-data.js";


/** Coordinates application startup by wiring data sources, domain models, application state, and UI components. */
async function main() {
    const domainData = await loadDomainData();

    console.log(
        `Loaded ${domainData.activityTypes.size} ActivityTypes and ${domainData.machineProfiles.size} MachineProfiles.`
    );
}


main().catch(error => {
    console.error("Protocol Designer initialization failed.", error);
});
