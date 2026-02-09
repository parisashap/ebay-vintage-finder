export type Listing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  brand?: string;
  vintageConfidence: number;
  shipping?: string;
  image?: string;
  url: string;
};

export type SearchResponse = {
  total: number;
  offset: number;
  limit: number;
  items: Listing[];
};
