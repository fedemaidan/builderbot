import { MemoryDB } from '@builderbot/bot'
import type { Db } from 'mongodb'
import { MongoClient } from 'mongodb'

import type { History, MongoAdapterCredentials } from './types'

/**
 * Sanitiza un objeto eliminando referencias circulares y propiedades no serializables
 */
function sanitizeForMongo(obj: any, seen = new WeakSet()): any {
    if (obj === null || obj === undefined) return obj
    if (typeof obj !== 'object') return obj

    // Detectar referencias circulares
    if (seen.has(obj)) {
        return '[Circular Reference]'
    }
    seen.add(obj)

    // Manejar arrays
    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeForMongo(item, seen))
    }

    // Manejar objetos
    const sanitized: Record<string, any> = {}
    for (const key of Object.keys(obj)) {
        try {
            const value = obj[key]
            // Ignorar funciones y símbolos
            if (typeof value === 'function' || typeof value === 'symbol') {
                continue
            }
            sanitized[key] = sanitizeForMongo(value, seen)
        } catch (e) {
            // Ignorar propiedades que no se pueden acceder
            continue
        }
    }
    return sanitized
}

class MongoAdapter extends MemoryDB {
    db: Db | null = null
    listHistory: History[] = []
    credentials: MongoAdapterCredentials = { dbUri: null, dbName: null }

    constructor(_credentials: MongoAdapterCredentials) {
        super()
        this.credentials = _credentials
        this.init().then()
    }

    init = async (): Promise<boolean> => {
        try {
            const client = new MongoClient(this.credentials.dbUri, {})
            await client.connect()

            console.log(`🆗 Connection successfully established`)
            const db = client.db(this.credentials.dbName)
            this.db = db
            return true
        } catch (e) {
            console.log('Error', e)
            return
        }
    }

    getPrevByNumber = async (from: string): Promise<any> => {
        const result = await this.db.collection('history').find({ from }).sort({ _id: -1 }).limit(1).toArray()
        return result[0]
    }

    save = async (ctx: History): Promise<void> => {
        this.listHistory.push(ctx)
        const ctxWithDate = {
            ...ctx,
            date: new Date(),
        }
        await this.db.collection('history').insertOne(ctxWithDate)
    }

    async saveState(from: string, data: any): Promise<void> {
        try {
            const sanitizedData = sanitizeForMongo(data)
            await this.db
                .collection('state')
                .updateOne({ from }, { $set: { from, ...sanitizedData } }, { upsert: true })
        } catch (error) {
            // No propagar el error para evitar romper el flujo del bot
            console.error('[MongoAdapter] Error guardando estado (no crítico):', error?.message || error)
        }
    }

    async getState(from: string): Promise<any> {
        return await this.db.collection('state').findOne({ from })
    }

    async deleteState(from: string): Promise<void> {
        await this.db.collection('state').deleteOne({ from })
    }
}

export { MongoAdapter }
