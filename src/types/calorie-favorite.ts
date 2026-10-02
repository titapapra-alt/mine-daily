export type CalorieFavorite = {
  id: string;
  calories: number;
  detail: string;
};

export type CalorieFavoriteInput = Omit<CalorieFavorite, "id">;
