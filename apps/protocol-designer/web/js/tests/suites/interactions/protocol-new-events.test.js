/** Tests Protocol Designer New Protocol interactions. */

import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { wireProtocolNewEvents } from "../../../interactions/protocol-new-events.js";

test("protocol-new-events", "clicking New creates a new protocol", () => {
    const newButton = document.createElement("button");

    let newProtocolCalls = 0;

    const protocolNewController = {
        newProtocol() {
            newProtocolCalls += 1;
        },
    };

    wireProtocolNewEvents({
        newButton,
        protocolNewController,
    });

    newButton.click();

    assertEqual(newProtocolCalls, 1);
});
