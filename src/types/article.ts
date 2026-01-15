// Article types based on Prisma schema

export interface Article {
  id: string; // PAPER001, PAPER002, etc.
  title: string;
  abstract: string;
  conclusion?: string;

  // Publication info
  year: number;
  date: string; // YYYY-MM-DD
  dateAdded: string; // YYYY-MM-DD
  journal?: string;
  doi?: string;
  language: string;
  numPages: number;

  // Research content
  researchQuestion?: string;
  methodology?: string;
  dataUsed?: string;
  results?: string;
  limitations?: string;

  // User notes
  firstImp?: string;
  notes?: string;
  comment?: string;

  // User metadata
  rating: number;
  read: boolean;
  favorite: boolean;

  // File references
  fileName: string;

  // Relations (populated)
  authors?: Author[];
  keywords?: Keyword[];
  subjects?: Subject[];
  tags?: Tag[];
  universities?: University[];
  companies?: Company[];

  createdAt?: Date;
  updatedAt?: Date;
}

export interface Author {
  id: number;
  name: string;
}

export interface Keyword {
  id: number;
  name: string;
}

export interface Subject {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface University {
  id: number;
  name: string;
}

export interface Company {
  id: number;
  name: string;
}

// Form data for creating/editing articles
export interface ArticleFormData {
  title: string;
  abstract: string;
  conclusion?: string;
  year: number;
  date: string;
  journal?: string;
  doi?: string;
  language: string;
  numPages: number;
  researchQuestion?: string;
  methodology?: string;
  dataUsed?: string;
  results?: string;
  limitations?: string;
  firstImp?: string;
  notes?: string;
  comment?: string;
  rating: number;
  read: boolean;
  favorite: boolean;

  // Arrays as comma-separated strings or arrays
  authors: string[];
  keywords: string[];
  subjects: string[];
  tags: string[];
  universities: string[];
  companies: string[];

  // File upload
  pdfFile?: File;
}
