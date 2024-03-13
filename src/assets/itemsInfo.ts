export interface IItemsInfo {
  [itemId: string]: {
    id: string;
    img: string;
    name: string;
    price: number;
  };
}

const itemsInfo = {
  sauna_portal: {
    id: 'sauna_portal',
    img: 'https://d31ss916pli4td.cloudfront.net/uploadedAssets//929cf47b-9b7c-4c65-bda2-a6da7f015dbf.png',
    name: 'Sauna Portal',
    price: 4000,
  },
  watermint: {
    id: 'watermint',
    img: 'https://d31ss916pli4td.cloudfront.net/uploadedAssets//933fb3e8-2214-4238-8d09-765394aa7b59.png',
    name: 'Watermint',
    price: 0.03,
  },
  eggsplosive: {
    id: 'eggsplosive',
    img: 'https://d31ss916pli4td.cloudfront.net/uploadedAssets//9dc0dac8-cee8-4c5c-b007-83517dce859c.png',
    name: 'Eggsplosive',
    price: 0.06,
  },
  sap: {
    id: 'sap',
    img: 'https://d31ss916pli4td.cloudfront.net/uploadedAssets//7db47cf2-e739-4c8b-bdc8-9967852871f4.png',
    name: 'Sap',
    price: 0.32,
  },
};

export default itemsInfo;
