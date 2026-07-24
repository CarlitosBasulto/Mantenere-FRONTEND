export const getSeenCards = (): Set<string> => {
    try {
        const stored = localStorage.getItem('mantenere_seen_cards');
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
        return new Set();
    }
};

export const markCardAsSeen = (role: string, jobId: number, status: string) => {
    try {
        const key = `${role}_${jobId}_${status}`;
        const set = getSeenCards();
        set.add(key);
        localStorage.setItem('mantenere_seen_cards', JSON.stringify(Array.from(set)));
    } catch (e) {
        console.error("Error marking card as seen:", e);
    }
};

export const isCardSeen = (role: string, jobId: number, status: string): boolean => {
    const key = `${role}_${jobId}_${status}`;
    return getSeenCards().has(key);
};
