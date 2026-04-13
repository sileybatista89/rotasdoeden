export type UserRole = 'tourist' | 'guide' | 'admin';
export type GuideStatus = 'pending' | 'verified' | 'rejected';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'paid' | 'held' | 'released' | 'refunded';
export type ServiceCategory = 'tour' | 'experience' | 'transfer' | 'diving' | 'hiking' | 'fishing' | 'kayak' | 'surfing' | 'birdwatching' | 'photography' | 'gastronomy' | 'culture' | 'nightlife';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar_url?: string;
  phone?: string;
  nationality?: string;
}

export interface Guide {
  id: string;
  user_id: string;
  bio?: string;
  bio_en?: string;
  languages: string[];
  specialties: string[];
  license_number?: string;
  license_verified: boolean;
  rating: number;
  total_reviews: number;
  price_per_day?: number;
  location_lat?: number;
  location_lng?: number;
  city: string;
  cover_photo_url?: string;
  status: GuideStatus;
  years_experience?: number;
  created_at: string;
  user?: User;
  services?: Service[];
  reviews?: Review[];
}

export interface Service {
  id: string;
  guide_id: string;
  title: string;
  title_en?: string;
  description: string;
  description_en?: string;
  duration_hours: number;
  price: number;
  max_people: number;
  min_people: number;
  category: ServiceCategory;
  images: string[];
  includes?: string[];
  excludes?: string[];
  meeting_point?: string;
  is_active: boolean;
  guide?: Guide;
}

export interface Review {
  id: string;
  booking_id: string;
  tourist_id: string;
  guide_id: string;
  rating: number;
  comment?: string;
  reply?: string;
  created_at: string;
  tourist?: User;
}

export interface GuideFilters {
  search?: string;
  specialty?: string;
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
}
