class MemoryDB {
    public listHistory: any[] = []
    public listState: any[] = []

    /**
     *
     * @param from
     * @returns
     */
    async getPrevByNumber(from: string): Promise<any> {
        const history = this.listHistory
            .slice()
            .reverse()
            .filter((i) => !!i.keyword)
        return history.find((a) => a.from === from)
    }

    /**
     *
     * @param ctx
     */
    async save(ctx: any): Promise<void> {
        this.listHistory.push(ctx)
    }

    async saveState(from: string, data: any): Promise<void> {
        const stateIndex = this.listState.findIndex((s) => s.from === from)
        if (stateIndex !== -1) {
            this.listState[stateIndex] = { ...this.listState[stateIndex], ...data }
        } else {
            this.listState.push({ from, ...data })
        }
    }

    async getState(from: string): Promise<any> {
        return this.listState.find((s) => s.from === from)
    }

    async deleteState(from: string): Promise<void> {
        this.listState = this.listState.filter((s) => s.from !== from)
    }
}

export { MemoryDB }
