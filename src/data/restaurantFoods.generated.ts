// ⚠️ ملف مولَّد — لا يُحرَّر يدويًّا. [RESTAURANT-MENUS-001]
// المصدر: docs/data-factory/restaurants/*.json (مصادر السلاسل الرسمية المقروءة في CI)،
// والمولِّد scripts/food-production/promote-restaurants.mjs. كل صنف يحمل مصدره في RESTAURANT_PROVENANCE.
import type { FoodItem } from './foodItems'

export interface RestaurantProvenance { chain: string; source: string; kind: string; market: string; accessed: string; kcal: 'official'; macros: 'official' | 'partial-estimated' | 'estimated'; type: string | null; sourceName: string }

export const restaurantFoods: FoodItem[] = [
]

export const RESTAURANT_PROVENANCE: Record<string, RestaurantProvenance> = {
}
