export type Listing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  createdAt?: string;
  vintageConfidence: number;
  availableQuantity?: number;
  hasMultiSizeOffer?: boolean;
  shipping?: string;
  image?: string;
  url: string;
};

export type SearchResponse = {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  items: Listing[];
};
