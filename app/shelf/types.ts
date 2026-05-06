export type ShelfPreview = {
  coverUrl: string;
  contentKey: string;
  title: string | null;
  author: string | null;
};

export type ShelfPreviewMap = Record<string, ShelfPreview>;
