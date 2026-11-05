export const CATEGORIES = [
  'Tops',
  'Shirts',
  'Jackets',
  'Hoodies',
  'Dresses',
  'Trousers',
  'Skirts',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

export interface Garment {
  id: string
  name: string
  category: Category
  description: string
  image: string
  createdAt: number
}

const DATABASE_NAME = 'atelier-wardrobe'
const STORE_NAME = 'garments'
const DATABASE_VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support local wardrobe storage.'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open wardrobe storage.'))
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const request = operation(transaction.objectStore(STORE_NAME))
    let result: T
    let requestSucceeded = false
    request.onsuccess = () => {
      result = request.result
      requestSucceeded = true
    }
    request.onerror = () => {
      database.close()
      reject(request.error ?? new Error('Wardrobe storage operation failed.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('Wardrobe storage transaction aborted.'))
    }
    transaction.oncomplete = () => {
      database.close()
      if (requestSucceeded) resolve(result)
      else reject(new Error('Wardrobe storage operation completed without a result.'))
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Wardrobe storage transaction failed.'))
    }
  })
}

export async function getGarments(): Promise<Garment[]> {
  const garments = await withStore<Garment[]>('readonly', (store) => store.getAll())
  return garments.sort((first, second) => second.createdAt - first.createdAt)
}

export function saveGarment(garment: Garment): Promise<IDBValidKey> {
  return withStore<IDBValidKey>('readwrite', (store) => store.put(garment))
}

export function deleteGarment(id: string): Promise<undefined> {
  return withStore<undefined>('readwrite', (store) => store.delete(id))
}

export async function clearWardrobe(): Promise<void> {
  await withStore<undefined>('readwrite', (store) => store.clear())
}

export function readImageFile(file: File, maxDimension = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      try {
        const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Your browser could not prepare this image.')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const keepTransparency = file.type === 'image/png' || file.type === 'image/webp'
        resolve(canvas.toDataURL(keepTransparency ? 'image/png' : 'image/jpeg', 0.9))
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Your browser could not prepare this image.'))
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('This image could not be opened. Try a PNG, JPEG, or WebP file.'))
    }
    image.src = objectUrl
  })
}
