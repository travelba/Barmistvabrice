import type { Hotel } from "./types";

/**
 * Donnees reelles des 2 hotels (Mykonos) importees depuis l'ancien projet.
 * Prix = prix PAR NUIT, en centimes d'euro (total sejour = prix x 2 nuits, calcule cote serveur).
 * Les stocks (places limitees) sont des valeurs par defaut A CONFIRMER avec le client.
 * Genere par scripts/build-seed.mjs.
 */
export const HOTELS_SEED: Hotel[] = [
  {
    "id": "santa-marina",
    "name": "Santa-Marina - Mykonos",
    "slug": "santa-marina-mykonos",
    "description": "Santa Marina, a Luxury Collection Resort : presqu'ile privee, plage, villas avec piscine et service d'exception.",
    "location": "Ornos Bay, Mykonos",
    "stars": 5,
    "photos": [
      "/hotels/aerialandbeachsantamarina.jpg"
    ],
    "capacityMax": 42,
    "sortOrder": 1,
    "roomTypes": [
      {
        "id": "santa-marina-resort-room",
        "hotelId": "santa-marina",
        "name": "Resort Room",
        "capacity": 2,
        "priceCents": 48200,
        "description": "2 Personnes — 482 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/resort-room-1.jpeg",
          "/hotels/resort-room-2.jpeg"
        ],
        "stockTotal": 6,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-superior-sea-view-room",
        "hotelId": "santa-marina",
        "name": "Superior Sea View Room",
        "capacity": 2,
        "priceCents": 57300,
        "description": "2 Personnes — 573 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/superior-sea-view-room-1.jpeg",
          "/hotels/superior-sea-view-room-2.jpeg"
        ],
        "stockTotal": 6,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-deluxe-sea-view-room",
        "hotelId": "santa-marina",
        "name": "Deluxe Sea View Room",
        "capacity": 3,
        "priceCents": 68700,
        "description": "3 Personnes — 687 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/deluxe-sea-view-room-1.jpeg",
          "/hotels/deluxe-sea-view-room-2.jpeg",
          "/hotels/deluxe-sea-view-room-3.jpeg"
        ],
        "stockTotal": 6,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-resort-suites-sea-view",
        "hotelId": "santa-marina",
        "name": "Resort Suites Sea View",
        "capacity": 4,
        "priceCents": 98300,
        "description": "3 Personnes ou 2 adultes 2 enfants — 983 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/resort-sea-view-suite-1.jpeg",
          "/hotels/resort-sea-view-suite-2.jpeg",
          "/hotels/resort-sea-view-suite-3.jpeg"
        ],
        "stockTotal": 3,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-luxury-suites-sea-view",
        "hotelId": "santa-marina",
        "name": "Luxury Suites Sea View",
        "capacity": 4,
        "priceCents": 117700,
        "description": "3 Personnes ou 2 adultes 2 enfants — 1177 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/luxury-sea-view-suite-santa-marina-a-luxury-collection-resort-mykonos-4_800x800_auto.jpg",
          "/hotels/luxury-sea-view-suite-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg",
          "/hotels/luxury-sea-view-suite-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg",
          "/hotels/luxury-sea-view-suite-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg"
        ],
        "stockTotal": 3,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-luxury-sea-view-suite-with-private-pool",
        "hotelId": "santa-marina",
        "name": "Luxury Sea View Suite with Private Pool",
        "capacity": 4,
        "priceCents": 175200,
        "description": "3 Personnes ou 2 adultes 2 enfants — 1752 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/luxury-sea-view-pool-suite-santa-marina-a-luxury-collection-resort-mykonos-4_800x800_auto.jpg",
          "/hotels/luxury-sea-view-pool-suite-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg",
          "/hotels/luxury-sea-view-pool-suite-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg",
          "/hotels/luxury-sea-view-pool-suite-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg",
          "/hotels/luxury-sea-view-pool-suite-santa-marina-a-luxury-collection-resort-mykonos-7_800x800_auto.jpg",
          "/hotels/luxury-sea-view-pool-suite-santa-marina-a-luxury-collection-resort-mykonos-6_800x800_auto.jpg"
        ],
        "stockTotal": 3,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-two-bedroom-luxury-sea-view-suite-with-private-",
        "hotelId": "santa-marina",
        "name": "Two-Bedroom Luxury Sea View Suite with Private Pool",
        "capacity": 4,
        "priceCents": 252000,
        "description": "4 Personnes — 2520 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/2-bedroom-luxury-sea-view-pool-suite-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg",
          "/hotels/2-bedroom-luxury-sea-view-pool-suite-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg",
          "/hotels/2-bedroom-luxury-sea-view-pool-suite-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg"
        ],
        "stockTotal": 3,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-coral-2-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Coral - 2 Bedroom Villa",
        "capacity": 4,
        "priceCents": 195100,
        "description": "4 Personnes — 1951 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/2-bedroom-coral-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg",
          "/hotels/2-bedroom-coral-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg",
          "/hotels/2-bedroom-coral-villa-santa-marina-a-luxury-collection-resort-mykonos-4_800x800_auto.jpg",
          "/hotels/2-bedroom-coral-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-crystal-2-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Crystal - 2 Bedroom Villa",
        "capacity": 4,
        "priceCents": 228700,
        "description": "4 Personnes — 2287 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/2-bedroom-crystal-villa-santa-marina-a-luxury-collection-resort-mykonos-4_800x800_auto.jpg",
          "/hotels/2-bedroom-crystal-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg",
          "/hotels/2-bedroom-crystal-villa-santa-marina-a-luxury-collection-resort-mykonos-5_800x800_auto.jpg",
          "/hotels/2-bedroom-crystal-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg",
          "/hotels/2-bedroom-crystal-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-emerald-2-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Emerald - 2 Bedroom Villa",
        "capacity": 4,
        "priceCents": 246300,
        "description": "4 Personnes — 2463 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/3-bedroom-emerald-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-4_800x800_auto.jpg",
          "/hotels/3-bedroom-emerald-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg",
          "/hotels/3-bedroom-emerald-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-5_800x800_auto.jpg",
          "/hotels/3-bedroom-emerald-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-pearl-3-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Pearl - 3 Bedroom Villa",
        "capacity": 6,
        "priceCents": 246300,
        "description": "6 Personnes — 2463 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/3-bedroom-pearl-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg",
          "/hotels/3-bedroom-pearl-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-lapis-lazuli-3-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Lapis Lazuli - 3 Bedroom Villa",
        "capacity": 6,
        "priceCents": 326000,
        "description": "6 Personnes — 3260 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/3-bedroom-lapis-lazuli-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-4_800x800_auto.jpg",
          "/hotels/3-bedroom-lapis-lazuli-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg",
          "/hotels/3-bedroom-lapis-lazuli-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg",
          "/hotels/3-bedroom-lapis-lazuli-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-sapphire-3-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Sapphire - 3 Bedroom Villa",
        "capacity": 6,
        "priceCents": 294700,
        "description": "6 Personnes — 2947 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/3-bedroom-sapphire-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg",
          "/hotels/3-bedroom-sapphire-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg",
          "/hotels/3-bedroom-sapphire-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-amethyst-3-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Amethyst - 3 Bedroom Villa",
        "capacity": 6,
        "priceCents": 324300,
        "description": "6 Personnes — 3243 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/4-bedroom-amethyst-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg",
          "/hotels/4-bedroom-amethyst-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg",
          "/hotels/4-bedroom-amethyst-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-topaz-4-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Topaz - 4 Bedroom Villa",
        "capacity": 8,
        "priceCents": 294700,
        "description": "8 Personnes — 2947 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/4-bedroom-topaz-sea-view-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg",
          "/hotels/4-bedroom-topaz-sea-view-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg",
          "/hotels/4-bedroom-topaz-sea-view-villa-santa-marina-a-luxury-collection-resort-mykonos-8_800x800_auto.jpg",
          "/hotels/4-bedroom-topaz-sea-view-villa-santa-marina-a-luxury-collection-resort-mykonos-4_800x800_auto.jpg",
          "/hotels/4-bedroom-topaz-sea-view-villa-santa-marina-a-luxury-collection-resort-mykonos-6_800x800_auto.jpg",
          "/hotels/4-bedroom-topaz-sea-view-villa-santa-marina-a-luxury-collection-resort-mykonos-7_800x800_auto.jpg",
          "/hotels/4-bedroom-topaz-sea-view-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-ruby-4-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Ruby - 4 Bedroom Villa",
        "capacity": 8,
        "priceCents": 319800,
        "description": "8 Personnes — 3198 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/4-bedroom-ruby-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg",
          "/hotels/4-bedroom-ruby-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg",
          "/hotels/4-bedroom-ruby-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-diamond-4-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Diamond - 4 Bedroom Villa",
        "capacity": 8,
        "priceCents": 348800,
        "description": "8 Personnes — 3488 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/4-bedroom-diamond-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-4_800x800_auto.jpg",
          "/hotels/4-bedroom-diamond-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg",
          "/hotels/4-bedroom-diamond-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg",
          "/hotels/4-bedroom-diamond-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-tanzanite-5-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Tanzanite - 5 Bedroom Villa",
        "capacity": 10,
        "priceCents": 331700,
        "description": "10 Personnes — 3317 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/5-bedroom-tanzanite-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg",
          "/hotels/5-bedroom-tanzanite-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg",
          "/hotels/5-bedroom-tanzanite-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-4_800x800_auto.jpg",
          "/hotels/5-bedroom-tanzanite-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      },
      {
        "id": "santa-marina-villa-turquoise-5-bedroom-villa",
        "hotelId": "santa-marina",
        "name": "Villa Turquoise - 5 Bedroom Villa",
        "capacity": 10,
        "priceCents": 383500,
        "description": "10 Personnes — 3835 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/5-bedroom-turquoise-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-5_800x800_auto.jpg",
          "/hotels/5-bedroom-turquoise-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-10_800x800_auto.jpg",
          "/hotels/5-bedroom-turquoise-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-9_800x800_auto.jpg",
          "/hotels/5-bedroom-turquoise-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-2_800x800_auto.jpg",
          "/hotels/5-bedroom-turquoise-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-3_800x800_auto.jpg",
          "/hotels/5-bedroom-turquoise-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-4_800x800_auto.jpg",
          "/hotels/5-bedroom-turquoise-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-8_800x800_auto.jpg",
          "/hotels/5-bedroom-turquoise-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-1_800x800_auto.jpg",
          "/hotels/5-bedroom-turquoise-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-6_800x800_auto.jpg",
          "/hotels/5-bedroom-turquoise-pool-villa-santa-marina-a-luxury-collection-resort-mykonos-7_800x800_auto.jpg"
        ],
        "stockTotal": 1,
        "booked": 0,
        "held": 0
      }
    ]
  },
  {
    "id": "once-mykonos",
    "name": "Once in Mykonos",
    "slug": "once-in-mykonos",
    "description": "Boutique-hotel de luxe perche au-dessus de la mer Egee, design contemporain et vue panoramique sur Mykonos.",
    "location": "Mykonos, Grèce",
    "stars": 5,
    "photos": [
      "/hotels/once.webp"
    ],
    "capacityMax": 12,
    "sortOrder": 2,
    "roomTypes": [
      {
        "id": "once-mykonos-panoramic-double-sea-view-room",
        "hotelId": "once-mykonos",
        "name": "Panoramic Double Sea View Room",
        "capacity": 2,
        "priceCents": 32000,
        "description": "2 Personnes — 320 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/panoramic-double-sea-view-room-1.jpeg",
          "/hotels/panoramic-double-sea-view-room-2.jpeg",
          "/hotels/panoramic-double-sea-view-room-3.jpeg"
        ],
        "stockTotal": 6,
        "booked": 0,
        "held": 0
      },
      {
        "id": "once-mykonos-premium-suite-sea-view",
        "hotelId": "once-mykonos",
        "name": "Premium Suite Sea View",
        "capacity": 2,
        "priceCents": 32000,
        "description": "2 Personnes — 320 € / nuit (séjour de 2 nuits).",
        "photos": [
          "/hotels/premium-suite-sea-view-1.jpeg",
          "/hotels/premium-suite-sea-view-2.jpeg",
          "/hotels/premium-suite-sea-view-3.jpeg"
        ],
        "stockTotal": 6,
        "booked": 0,
        "held": 0
      }
    ]
  }
];
