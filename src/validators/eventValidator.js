export const validationConfig = {
    priorityVenues: new Set([
        'basement', 'nowadays', 'gabriela', 'h0l0', '99 scott',
        'chocolate factory', 'good room', 'libera', 'million goods',
        'tbd', 'tba', 'earthly delights', 'mansions', 'eavesdrop',
        'xanadu', 'mood ring', 'paragon', 'the end', 'silo', 'bossa nova civic club',
        'dead letter no. 9',

    ]),

    priorityArtists: new Set([
        'eli escobar', 'andi', 'phase fatale', 'pablo bozzi', 'mr. g',
        'honey trap', 'amelia holt', 'x3butterfly', 'ron like hell',
        'rose kourts', 'aurora halal', 'pearson sound', 'd. tiffany',
        'ambien baby', 'jennifer loveless', 'sleep d', 'james bangura',
        'jek', 'ian crane', 'ccl', 'maara', 'sedef adasi', 'lovie',
        'karlala', 'st. james joy', 'adobe princess', 'deep creep',
        'palms trax', 'tiki disco', 'honey bun'
    ]),

    normalizeString(str) {
        return str.toLowerCase().trim().replace(/\s+/g, ' ');
    },

    addVenue(venue) {
        this.priorityVenues.add(this.normalizeString(venue));
    },

    addArtist(artist) {
        this.priorityArtists.add(this.normalizeString(artist));
    },

    isMatchingVenue(venue) {
        return Array.from(this.priorityVenues).some(priorityVenue => {
            const venueWords = this.normalizeString(venue).split(' ');
            const priorityWords = this.normalizeString(priorityVenue).split(' ');

            // Match if all words from priority venue appear in venue string
            return priorityWords.every(word =>
                venueWords.some(vWord =>
                    this.findBestMatch(word, new Set([vWord])) > 0.8
                )
            );
        });
    },

    isMatchingArtist(title) {
        return Array.from(this.priorityArtists).some(artist =>
            this.findBestMatch(title, new Set([artist])) > 0.85
        );
    },

    findBestMatch(str, set) {
        function similarity(s1, s2) {
            const matrix = Array(s1.length + 1).fill().map(() => Array(s2.length + 1).fill(0));

            for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
            for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;

            for (let i = 1; i <= s1.length; i++) {
                for (let j = 1; j <= s2.length; j++) {
                    const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j - 1] + cost
                    );
                }
            }
            return 1 - matrix[s1.length][s2.length] / Math.max(s1.length, s2.length);
        }

        str = this.normalizeString(str);
        let bestMatch = 0;

        for (const item of set) {
            const score = similarity(str, item);
            bestMatch = Math.max(bestMatch, score);
        }

        return bestMatch;
    },

    validateEvent(event) {
        const normalizedVenue = this.normalizeString(event.venue);
        const isPriorityVenue = this.isMatchingVenue(normalizedVenue);

        let isPriorityArtist = false;
        if (event.artists) {
            isPriorityArtist = this.isMatchingArtist(event.artists);
        } else {
            isPriorityArtist = this.isMatchingArtist(event.title);
        }

        let score = 0;
        if (isPriorityVenue) score += 100;
        if (isPriorityArtist) score += 50;

        return { isPriorityVenue, isPriorityArtist, score };
    }
};