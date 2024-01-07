type ItemCategories = 'consumables' | string;

type ItemOnUseTypes = 'generic' | string;

type ItemUseTargetsTypes = 'entityTypes' | string;
type ItemUseTargetsEntityTypes = 'generic' | string;

export interface GameLibItemsProps {
  [itemName: string]: {
    id: string;
    categories: Array<ItemCategories>;
    name: string;
    trade?: {
      disableTrading: boolean;
    };
    description: string;
    utility?: string;
    image: string;
    onUse: {
      quantityChange: number;
      types: Array<ItemOnUseTypes>;
    };
    useTargets: {
      types: Array<ItemUseTargetsTypes>;
      entityTypes?: Array<ItemUseTargetsEntityTypes>;
    };
    inventory: {
      maxQuantity: number;
    };
  };
}

type GameSkillsNames =
  | 'woodwork'
  | 'cooking'
  | 'ceramicist'
  | 'textiler'
  | 'slugger'
  | 'mining'
  | 'granger';

export interface GameAchievmentsProps {
  [itemName: string]: {
    _id: string;
    id: string;
    tenants: string[];
    type: string;
    name: string;
    description: string;
    craftable: {
      type: string;
      autoGrant: boolean;
      requiredLevel: number;
      requiredItems: { id: string; quantity: number }[];
      minutesRequired: number;
      result: {
        items: { id: string; quantity: number }[];
        energyUsage: { value: number };
        benefits: unknown[];
        exps: { type: GameSkillsNames; exp: number }[];
      };
      requiredSkill: GameSkillsNames;
    };
    createdAt: number;
    updatedAt: number;
  };
}
