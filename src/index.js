import { scrapeRA } from './scrapers/ra.js';
import { scrapeDice } from './scrapers/dice.js';
import { validationConfig } from './validators/eventValidator.js'


async function scrapeAll() {
    const raEvents = (await scrapeRA()).map(event => ({
        ...event,
        validation: validationConfig.validateEvent(event)
    }));

    const diceEvents = (await scrapeDice()).map(event => ({
        ...event,
        validation: validationConfig.validateEvent(event)
    }));

    return combinedEvents(diceEvents, raEvents);
}

function isDuplicate(event1, event2) {
    function similarity(str1, str2) {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
        const matrix = Array(str1.length + 1).fill().map(() => Array(str2.length + 1).fill(0));

        for (let i = 0; i <= str1.length; i++) matrix[i][0] = i;
        for (let j = 0; j <= str2.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= str1.length; i++) {
            for (let j = 1; j <= str2.length; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        return 1 - matrix[str1.length][str2.length] / Math.max(str1.length, str2.length);
    }

    return similarity(event1.title, event2.title) > 0.8;
}

function combinedEvents(diceEvents, raEvents) {
    const combined = new Map();

    [...raEvents, ...diceEvents].forEach(event => {
        const { link, ...rest } = event; // Remove original link
        let found = false;

        for (const [key, existingEvent] of combined.entries()) {
            if (isDuplicate(event, existingEvent)) {
                combined.set(key, {
                    ...existingEvent,
                    links: {
                        ...(existingEvent.links || { [existingEvent.source]: existingEvent.link }),
                        [event.source]: link
                    }
                });
                found = true;
                break;
            }
        }

        if (!found) {
            combined.set(event.title, {
                ...rest,
                links: { [event.source]: link }
            });
        }
    });

    return Array.from(combined.values())
        .sort((a, b) => b.validation.score - a.validation.score);
}

export const handler = async () => {
    const events = await scrapeAll();
    return {
        statusCode: 200,
        body: JSON.stringify(events)
    };
};
const response = await handler();
console.log(response);